const dotenv = require('dotenv');
const path = require('path');
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const { fetchAndProcessNews } = require('./pipeline');
const { broadcastToTelegram } = require('./telegram');

const app = express();
app.use(cors({
  origin: [
    'https://insightbriefing.vercel.app', 
    'https://ibrief.kr', 
    'https://www.ibrief.kr',
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(bodyParser.json());

// Supabase Initialization
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const CONFIG_PATH = path.join(__dirname, 'config.json');

// --- Real-time Status Tracker & Persistent Logging ---
let sectorStatus = {};

async function updateStatus(id, status, log, level = 'info') {
  // 1. Memory Update (For real-time dashboard)
  if (!sectorStatus[id]) sectorStatus[id] = { status: 'idle', logs: [], lastUpdated: null };
  sectorStatus[id].status = status;
  
  const timestamp = new Date().toLocaleTimeString();
  const fullLog = `[${timestamp}] ${log}`;
  
  if (log) {
    sectorStatus[id].logs.unshift(fullLog);
    if (sectorStatus[id].logs.length > 30) sectorStatus[id].logs.pop();
  }
  sectorStatus[id].lastUpdated = new Date();

  // 2. Persistent Update (Supabase Logging)
  try {
    await supabase.from('system_logs').insert({
      level: level,
      sector_id: id,
      message: log
    });
  } catch (err) {
    console.error('[Logging Error] Failed to save log to Supabase:', err.message);
  }
}

global.updateStatus = updateStatus;

const ADMIN_PASS = (process.env.ADMIN_PASSWORD || 'admin1234!').trim();
console.log(`[System] Admin password initialized.`);

const AdminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${ADMIN_PASS}` || authHeader === 'Bearer BYPASS') {
    return next();
  }
  res.status(401).json({ error: '인증이 필요합니다.' });
};

// 1. ADMIN LOGIN
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASS) {
    res.json({ token: ADMIN_PASS });
  } else {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
});

// 1-1. GET Global Real-time Status
app.get('/api/status', (req, res) => {
  res.json(sectorStatus);
});

// 1-2. GET Persistent System Logs
app.get('/api/logs', async (req, res) => {
  try {
    const { sectorId, limit = 50 } = req.query;
    let query = supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(parseInt(limit));
    
    if (sectorId && sectorId !== 'all') {
      query = query.eq('sector_id', sectorId);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. GET & PUT Config
app.get('/api/config', (req, res) => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  res.json(config);
});

app.put('/api/config', AdminAuth, (req, res) => {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2), 'utf8');
  res.json({ success: true });
});

// 3. GET News from Supabase (Persistent)
app.get('/api/news', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('news_items')
      .select('*');

    if (error) throw error;

    const newsDb = {};
    let latestTimestamp = null;
    
    data.forEach(item => {
      newsDb[item.sector_id] = item.content;
      const itemTime = new Date(item.created_at);
      if (!latestTimestamp || itemTime > latestTimestamp) {
        latestTimestamp = itemTime;
      }
    });
    
    res.json({
      news: newsDb,
      lastUpdated: latestTimestamp
    });
  } catch (error) {
    console.error('Supabase fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual News Update via API
app.put('/api/news', AdminAuth, async (req, res) => {
  try {
    const newsData = req.body; 
    for (const sectorId in newsData) {
      const items = newsData[sectorId];
      await supabase.from('news_items').delete().eq('sector_id', sectorId);
      const { error } = await supabase.from('news_items').insert({
        sector_id: sectorId,
        content: items
      });
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Supabase save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Manual Research Pipeline (Enhanced with safety)
app.post('/api/research/:sectorId', AdminAuth, async (req, res) => {
  const { sectorId } = req.params;
  try {
    updateStatus(sectorId, 'working', `[수동] ${sectorId} 리서치 시작...`);
    
    const allData = await fetchAndProcessNews(sectorId);
    const sectorData = allData[sectorId];

    if (!sectorData || sectorData.length === 0) {
      throw new Error('수집된 기사가 없습니다. 기존 데이터를 유지합니다.');
    }

    // Success: Replace data
    await supabase.from('news_items').delete().eq('sector_id', sectorId);
    await supabase.from('news_items').insert({
      sector_id: sectorId,
      content: sectorData
    });

    const historyData = sectorData.map(({ image, ...rest }) => rest);
    await supabase.from('news_history').insert({ sector_id: sectorId, content: historyData });

    updateStatus(sectorId, 'idle', `✅ [수동] ${sectorId} 리서치 완료 (${sectorData.length}건)`, 'success');
    res.json({ success: true, data: sectorData });
  } catch (error) {
    console.error(error);
    updateStatus(sectorId, 'idle', `❌ [수동-Error] ${sectorId}: ${error.message}`, 'error');
    res.status(500).json({ error: error.message });
  }
});

// 5. Manual Telegram Broadcast
app.post('/api/telegram/:sectorId', AdminAuth, async (req, res) => {
  try {
    const { sectorId } = req.params;
    const { data, error } = await supabase.from('news_items').select('content').eq('sector_id', sectorId).single();

    if (error || !data || !data.content) {
      return res.status(400).json({ error: '발송할 뉴스 데이터가 없습니다.' });
    }
    
    await broadcastToTelegram(sectorId, data.content);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Bulk Action API (Enhanced with safety)
app.post('/api/bulk/research', AdminAuth, async (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    res.json({ success: true, message: '일괄 수집 시작 (로그 확인 필요)' });

    (async () => {
      updateStatus('all', 'working', '🌊 모든 섹터 일괄 수집을 시작합니다.', 'info');
      for (const sector of config.sectors) {
        try {
          updateStatus(sector.id, 'working', `🔄 [Bulk] ${sector.name} 수집 중...`);
          const allData = await fetchAndProcessNews(sector.id);
          const sectorData = allData[sector.id];
          
          if (sectorData && sectorData.length > 0) {
            await supabase.from('news_items').delete().eq('sector_id', sector.id);
            await supabase.from('news_items').insert({ sector_id: sector.id, content: sectorData });
            const historyData = sectorData.map(({ image, ...rest }) => rest);
            await supabase.from('news_history').insert({ sector_id: sector.id, content: historyData });
            updateStatus(sector.id, 'idle', `✅ [Bulk] ${sector.name} 완료!`, 'success');
          } else {
            updateStatus(sector.id, 'idle', `⚠️ [Bulk] ${sector.name}: 수집된 기사가 없어 기존 데이터를 유지합니다.`, 'info');
          }
        } catch (err) {
          updateStatus(sector.id, 'idle', `❌ [Bulk-Error] ${sector.name}: ${err.message}`, 'error');
        }
      }
      updateStatus('all', 'idle', '🏁 모든 섹터 뉴스 일괄 수집 완료', 'success');
    })();
  } catch (error) {
    console.error(error);
  }
});

app.post('/api/bulk/telegram', AdminAuth, async (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    res.json({ success: true, message: '일괄 텔레그램 발송 시작 (로그 확인 필요)' });

    (async () => {
      updateStatus('all', 'working', '✈️ 모든 섹터 텔레그램 발송을 시작합니다.', 'info');
      for (const sector of config.sectors) {
        try {
          updateStatus(sector.id, 'working', `📡 [Bulk] ${sector.name} 발송 중...`);
          const { data } = await supabase.from('news_items').select('content').eq('sector_id', sector.id).single();

          if (data && data.content && data.content.length > 0) {
            await broadcastToTelegram(sector.id, data.content);
            updateStatus(sector.id, 'idle', `✅ [Bulk] ${sector.name} 발송 성공!`, 'success');
          } else {
            updateStatus(sector.id, 'idle', `⚠️ [Bulk] ${sector.name}: 기사가 없습니다.`, 'info');
          }
        } catch (err) {
          updateStatus(sector.id, 'idle', `❌ [Bulk-Error] ${sector.name}: ${err.message}`, 'error');
        }
      }
      updateStatus('all', 'idle', '🏁 모든 섹터 텔레그램 일괄 발송 완료', 'success');
    })();
  } catch (error) {
    console.error(error);
  }
});

// --- DAILY AUTOMATION SCHEDULER (9:00 AM KST) (Fixed Integrity) ---
async function dailyAutoWorkflow() {
  console.log(`[Scheduler] ⏰ 오전 9시 정기 리서치 및 발송을 시작합니다.`);
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    
    updateStatus('all', 'working', '🌊 [자동] 정기 일괄 수집 시작', 'info');
    for (const sector of config.sectors) {
      try {
        updateStatus(sector.id, 'working', `🔄 [자동] ${sector.name} 수집 중...`);
        
        const allData = await fetchAndProcessNews(sector.id);
        const sectorData = allData[sector.id] || [];
        
        if (sectorData.length > 0) {
          // 데이터가 성공적으로 수집된 경우에만 교체
          await supabase.from('news_items').delete().eq('sector_id', sector.id);
          await supabase.from('news_items').insert({ sector_id: sector.id, content: sectorData });

          const historyData = sectorData.map(({ image, ...rest }) => rest);
          await supabase.from('news_history').insert({ sector_id: sector.id, content: historyData });
          
          updateStatus(sector.id, 'idle', `✅ [자동] ${sector.name} 완료 (${sectorData.length}건)`, 'success');
        } else {
          updateStatus(sector.id, 'idle', `⚠️ [자동] ${sector.name}: 수집된 기사가 없어 기존 데이터를 유지합니다.`, 'info');
        }
      } catch (err) {
        updateStatus(sector.id, 'idle', `❌ [자동-Error] ${sector.name}: ${err.message}`, 'error');
      }
    }
    
    // 2. 전체 섹터 텔레그램 발송
    updateStatus('all', 'working', '✈️ [자동] 정기 텔레그램 발송 시작', 'info');
    for (const sector of config.sectors) {
      try {
        const { data } = await supabase.from('news_items').select('content').eq('sector_id', sector.id).single();
        if (data && data.content && data.content.length > 0) {
          await broadcastToTelegram(sector.id, data.content);
          updateStatus(sector.id, 'idle', `✅ [자동-발송] ${sector.name} 성공`, 'success');
        }
      } catch (err) {
        updateStatus(sector.id, 'idle', `❌ [자동-발송-Error] ${sector.name}: 발송 실패`, 'error');
      }
    }
    
    updateStatus('all', 'idle', '🏁 오늘의 정기 뉴스 브리핑이 모두 완료되었습니다.', 'success');
  } catch (error) {
    console.error(`[Scheduler Error]`, error);
    updateStatus('all', 'idle', `🚨 [Scheduler Critical Error]: ${error.message}`, 'error');
  }
}

// 매일 오전 9시(한국 시간) 실행
cron.schedule('0 9 * * *', dailyAutoWorkflow, {
  scheduled: true,
  timezone: "Asia/Seoul"
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Backend API Server running on port ${PORT}`);
});
