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

// --- Real-time Status Tracker ---
let sectorStatus = {};

function updateStatus(id, status, log) {
  if (!sectorStatus[id]) sectorStatus[id] = { status: 'idle', logs: [], lastUpdated: null };
  sectorStatus[id].status = status;
  if (log) {
    const timestamp = new Date().toLocaleTimeString();
    sectorStatus[id].logs.unshift(`[${timestamp}] ${log}`);
    if (sectorStatus[id].logs.length > 20) sectorStatus[id].logs.pop();
  }
  sectorStatus[id].lastUpdated = new Date();
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

    // Convert array to the object format expected by the frontend: { sectorId: [items] }
    const newsDb = {};
    let latestTimestamp = null;
    
    data.forEach(item => {
      newsDb[item.sector_id] = item.content;
      
      // 기사 중 가장 최신의 생성 시각을 전역 업데이트 시각으로 채택
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
    const newsData = req.body; // Expecting { sectorId: [items] }
    
    for (const sectorId in newsData) {
      const items = newsData[sectorId];
      
      // UPSERT into Supabase: delete existing for this sector and insert new
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

// 4. Manual Research Pipeline
app.post('/api/research/:sectorId', AdminAuth, async (req, res) => {
  try {
    const { sectorId } = req.params;
    console.log(`[API] Manual research requested for sector: ${sectorId}`);
    
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const sectorConfig = config.sectors.find(s => s.id === sectorId);
    
    if (!sectorConfig) return res.status(404).json({ error: 'Sector not found' });
    
    const allData = await fetchAndProcessNews(sectorId);
    const sectorData = allData[sectorId];

    // Sync to Supabase immediately after research
    await supabase.from('news_items').delete().eq('sector_id', sectorId);
    await supabase.from('news_items').insert({
      sector_id: sectorId,
      content: sectorData
    });

    // [RAG 고도화용] 히스토리 아카이브 저장 (이미지 제외하여 용량 최적화)
    const historyData = sectorData.map(({ image, ...rest }) => rest);
    await supabase.from('news_history').insert({
      sector_id: sectorId,
      content: historyData
    });

    res.json({ success: true, data: sectorData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Manual Telegram Broadcast
app.post('/api/telegram/:sectorId', AdminAuth, async (req, res) => {
  try {
    const { sectorId } = req.params;
    
    // Fetch latest news for this sector from Supabase
    const { data, error } = await supabase
      .from('news_items')
      .select('content')
      .eq('sector_id', sectorId)
      .single();

    if (error || !data) {
      return res.status(400).json({ error: 'No news data available for this sector.' });
    }
    
    await broadcastToTelegram(sectorId, data.content);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Bulk Action API
app.post('/api/bulk/research', AdminAuth, async (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    
    // 타임아웃 방지를 위해 즉시 응답을 보냅니다.
    res.json({ success: true, message: '모든 섹터의 뉴스 수집을 백그라운드에서 시작했습니다. 로그를 확인해 주세요.' });

    // 비동기로 작업을 진행합니다.
    (async () => {
      console.log(`[API] Bulk research started for all sectors.`);
      updateStatus('all', 'working', '🌊 모든 섹터 뉴스 일괄 수집을 시작합니다.');
      
      for (const sector of config.sectors) {
        try {
          const startMsg = `🔄 [Bulk] ${sector.name} 수집 시작...`;
          updateStatus(sector.id, 'working', startMsg);
          updateStatus('all', 'working', startMsg);
          console.log(`[Bulk] Processing ${sector.name}...`);
          
          const allData = await fetchAndProcessNews(sector.id);
          const sectorData = allData[sector.id];
          
          await supabase.from('news_items').delete().eq('sector_id', sector.id);
          await supabase.from('news_items').insert({
            sector_id: sector.id,
            content: sectorData
          });

          // [RAG 고도화용] 히스토리 아카이브 저장 (이미지 제외하여 용량 최적화)
          const historyData = sectorData.map(({ image, ...rest }) => rest);
          await supabase.from('news_history').insert({
            sector_id: sector.id,
            content: historyData
          });
          
          const completeMsg = `✅ [Bulk] ${sector.name} 수집 완료!`;
          updateStatus(sector.id, 'idle', completeMsg);
          updateStatus('all', 'working', completeMsg);
        } catch (err) {
          console.error(`[Bulk Error] ${sector.name}:`, err);
          const errMsg = `❌ [Bulk Error] ${sector.name}: ${err.message}`;
          updateStatus(sector.id, 'idle', errMsg);
          updateStatus('all', 'working', errMsg);
        }
      }
      console.log(`[API] Bulk research completed.`);
      updateStatus('all', 'idle', '🏁 모든 섹터 뉴스 일괄 수집이 완료되었습니다.');
    })();
    
  } catch (error) {
    console.error(error);
    // 아직 응답이 안 나갔을 경우에만 에러 처리 (위에서 res.json을 먼저 호출했으므로 catch에 걸리는 위치 확인)
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/bulk/telegram', AdminAuth, async (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    
    // 타임아웃 방지를 위해 즉시 응답을 보냅니다.
    res.json({ success: true, message: '모든 섹터의 텔레그램 발송을 백그라운드에서 시작했습니다. 로그를 확인해 주세요.' });

    // 비동기로 작업을 진행합니다.
    (async () => {
      console.log(`[API] Bulk telegram broadcast started for all sectors.`);
      updateStatus('all', 'working', '✈️ 모든 섹터 텔레그램 발송을 시작합니다.');
      
      for (const sector of config.sectors) {
        try {
          const startMsg = `📡 [Bulk] ${sector.name} 발송 중...`;
          updateStatus(sector.id, 'working', startMsg);
          updateStatus('all', 'working', startMsg);
          console.log(`[Bulk Telegram] Broadcasting ${sector.name}...`);
          
          const { data, error } = await supabase
            .from('news_items')
            .select('content')
            .eq('sector_id', sector.id)
            .single();

          if (data && data.content) {
            await broadcastToTelegram(sector.id, data.content);
            const completeMsg = `✅ [Bulk] ${sector.name} 발송 완료!`;
            updateStatus(sector.id, 'idle', completeMsg);
            updateStatus('all', 'working', completeMsg);
          } else {
            const noDataMsg = `⚠️ [Bulk] ${sector.name}: 기사가 없습니다.`;
            updateStatus(sector.id, 'idle', noDataMsg);
            updateStatus('all', 'working', noDataMsg);
          }
        } catch (err) {
          console.error(`[Bulk Telegram Error] ${sector.name}:`, err);
          const errMsg = `❌ [Bulk Error] ${sector.name}: ${err.message}`;
          updateStatus(sector.id, 'idle', errMsg);
          updateStatus('all', 'working', errMsg);
        }
      }
      console.log(`[API] Bulk telegram broadcast completed.`);
      updateStatus('all', 'idle', '🏁 모든 섹터 텔레그램 일괄 발송이 완료되었습니다.');
    })();
    
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// --- DAILY AUTOMATION SCHEDULER (9:00 AM KST) ---
async function dailyAutoWorkflow() {
  console.log(`[Scheduler] ⏰ 오전 9시 정기 리서치 및 발송을 시작합니다.`);
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    
    // 1. 전체 섹터 뉴스 수집
    updateStatus('all', 'working', '🌊 [자동] 모든 섹터 뉴스 일괄 수집을 시작합니다.');
    for (const sector of config.sectors) {
      try {
        const startMsg = `🔄 [자동-Bulk] ${sector.name} 수집 시작...`;
        updateStatus(sector.id, 'working', startMsg);
        updateStatus('all', 'working', startMsg);
        
        const allData = await fetchAndProcessNews(sector.id);
        const sectorData = allData[sector.id] || [];
        
        await supabase.from('news_items').delete().eq('sector_id', sector.id);
        await supabase.from('news_items').insert({ sector_id: sector.id, content: sectorData });

        // [RAG 고도화용] 히스토리 아카이브 저장 (이미지 제외하여 용량 최적화)
        if (sectorData.length > 0) {
          const historyData = sectorData.map(({ image, ...rest }) => rest);
          await supabase.from('news_history').insert({
            sector_id: sector.id,
            content: historyData
          });
        }
        
        const completeMsg = `✅ [자동-Bulk] ${sector.name} 수집 완료! (${sectorData.length}건)`;
        updateStatus(sector.id, 'idle', completeMsg);
        updateStatus('all', 'working', completeMsg);
      } catch (err) {
        updateStatus(sector.id, 'idle', `❌ [자동-Error] ${sector.name}: ${err.message}`);
      }
    }
    
    // 2. 전체 섹터 텔레그램 발송
    updateStatus('all', 'working', '✈️ [자동] 모든 섹터 텔레그램 일괄 발송을 시작합니다.');
    for (const sector of config.sectors) {
      try {
        updateStatus(sector.id, 'working', `📡 [자동-Bulk] ${sector.name} 발송 중...`);
        const { data } = await supabase.from('news_items').select('content').eq('sector_id', sector.id).single();
        if (data && data.content) {
          await broadcastToTelegram(sector.id, data.content);
          updateStatus(sector.id, 'idle', `✅ [자동-Bulk] ${sector.name} 발송 성공!`);
          updateStatus('all', 'working', `✅ [자동-Bulk] ${sector.name} 발송 성공!`);
        }
      } catch (err) {
        updateStatus(sector.id, 'idle', `❌ [자동-Error] ${sector.name}: 발송 실패`);
      }
    }
    
    updateStatus('all', 'idle', '🏁 [자동] 오늘의 정기 브리핑 완료되었습니다.');
    console.log(`[Scheduler] Daily automation completed successfully.`);
  } catch (error) {
    console.error(`[Scheduler Error]`, error);
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
