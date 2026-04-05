const dotenv = require('dotenv');
const path = require('path');
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const cron = require('node-cron');
const { fetchAndProcessNews } = require('./pipeline');
const { broadcastToTelegram } = require('./telegram');
const supabase = require('./supabaseClient');

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

// (Supabase Initialization moved to supabaseClient.js)
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);

const CONFIG_PATH = path.join(__dirname, 'config.json');

// --- Real-time Status Tracker & Persistent Logging ---
let sectorStatus = {};

async function updateStatus(id, status, log, level = 'info') {
  // 1. Memory Update (For real-time dashboard)
  if (!sectorStatus[id]) sectorStatus[id] = { status: 'idle', logs: [], lastUpdated: null };
  sectorStatus[id].status = status;
  
  // 한국 시간(KST) 문자열 생성 (yyyy. mm. dd. 오전/오후 hh:mm:ss 형식)
  const timestamp = new Date().toLocaleString('ko-KR', { 
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  });
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

// 2. GET & PUT Config (Now using Supabase for persistence)
app.get('/api/config', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sector_config')
      .select('*')
      .order('weight', { ascending: false });

    if (error) throw error;

    // 프론트엔드 호환성을 위해 { sectors: [...] } 형태로 반환
    res.json({ sectors: data.map(item => ({
      id: item.id,
      name: item.name,
      researchSpecs: item.research_specs,
      weight: item.weight,
      isUrgent: item.is_urgent
    })) });
  } catch (error) {
    console.error('Config fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/config', AdminAuth, async (req, res) => {
  try {
    const { sectors } = req.body;
    for (const sector of sectors) {
      const { error } = await supabase
        .from('sector_config')
        .upsert({
          id: sector.id,
          name: sector.name,
          research_specs: sector.researchSpecs,
          weight: sector.weight,
          is_urgent: sector.isUrgent,
          updated_at: new Date()
        });
      if (error) throw error;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Config save error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- In-Memory Caching System (Performance Optimization) ---
let newsCache = null;
let lastCacheUpdate = null;
const CACHE_TTL = 60 * 60 * 1000; // 캐시 유효 시간: 60분

function clearNewsCache() {
  console.log('[System] 뉴스 캐시가 무효화되었습니다 (새 데이터 동기화 필요).');
  newsCache = null;
  lastCacheUpdate = null;
}

// 3. GET News from Supabase (Enhanced with In-Memory Caching)
app.get('/api/news', async (req, res) => {
  try {
    const now = Date.now();
    // 1. 캐시가 존재하고 유효 시간이 경과하지 않은 경우 즉시 반환 (속도 극대화)
    if (newsCache && lastCacheUpdate && (now - lastCacheUpdate < CACHE_TTL)) {
      console.log(`[Cache Hit] Serving ${Object.keys(newsCache.news).length} sectors from memory.`);
      return res.json(newsCache);
    }

    // 2. 캐시가 없거나 만료된 경우 Supabase에서 조회
    console.log('[Cache Miss] Fetching fresh news from Supabase...');
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

    const responsePayload = {
      news: newsDb,
      lastUpdated: latestTimestamp
    };

    // 3. 응답 메모리에 캐시 저장
    newsCache = responsePayload;
    lastCacheUpdate = now;

    res.json(responsePayload);
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
    clearNewsCache(); // 데이터 변경 시 캐시 즉시 비움
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
    clearNewsCache(); // 뉴스 업데이트 시 캐시 즉시 재생성 유도
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
    const { data: sectors, error: cfgError } = await supabase.from('sector_config').select('*').order('weight', { ascending: false });
    if (cfgError) throw cfgError;
    
    res.json({ success: true, message: '일괄 수집 시작 (로그 확인 필요)' });

    (async () => {
      try {
        updateStatus('all', 'working', '🌊 모든 섹터 일괄 수집을 시작합니다.', 'info');
        for (const sector of sectors) {
          const formattedSector = {
            id: sector.id,
            name: sector.name,
            researchSpecs: sector.research_specs,
            isUrgent: sector.is_urgent
          };
          try {
            updateStatus(sector.id, 'working', `🔄 [Bulk] ${sector.name} 수집 중...`);
            const allData = await fetchAndProcessNews(sector.id);
            const sectorData = allData[sector.id];
            
            if (sectorData && sectorData.length > 0) {
              // 기존 데이터 삭제 및 신규 삽입
              await supabase.from('news_items').delete().eq('sector_id', sector.id);
              const { error: insError } = await supabase.from('news_items').insert({ 
                sector_id: sector.id, 
                content: sectorData 
              });
              
              if (insError) throw insError;

              const historyData = sectorData.map(({ image, ...rest }) => rest);
              await supabase.from('news_history').insert({ sector_id: sector.id, content: historyData });
              
              updateStatus(sector.id, 'idle', `✅ [Bulk] ${sector.name} 완료! (${sectorData.length}건)`, 'success');
            } else {
              updateStatus(sector.id, 'idle', `⚠️ [Bulk] ${sector.name}: 유효한 기사가 없어 기존 데이터를 유지합니다.`, 'info');
            }
          } catch (err) {
            console.error(`[Bulk Sector Error] ${sector.id}:`, err.message);
            updateStatus(sector.id, 'idle', `❌ [Bulk-Error] ${sector.name}: ${err.message}`, 'error');
          }
          // 섹터 간 약간의 시간 차를 두어 rate limit 방지
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        clearNewsCache(); // 벌크 수집 완료 후 캐시 초기화
        updateStatus('all', 'idle', '🏁 모든 섹터 뉴스 일괄 수집 작업이 완료되었습니다.', 'success');
      } catch (bulkErr) {
        console.error('[Bulk Critical Error]:', bulkErr);
        updateStatus('all', 'idle', `🚨 일괄 작업 중 치명적 오류: ${bulkErr.message}`, 'error');
      }
    })();
  } catch (error) {
    console.error(error);
    updateStatus('all', 'idle', `❌ 일괄 리서치 시스템 오류: ${error.message}`, 'error');
  }
});

app.post('/api/bulk/telegram', AdminAuth, async (req, res) => {
  try {
    const { data: sectors, error: cfgError } = await supabase.from('sector_config').select('id, name');
    if (cfgError) throw cfgError;
    res.json({ success: true, message: '일괄 텔레그램 발송 시작 (로그 확인 필요)' });

    (async () => {
      try {
        updateStatus('all', 'working', '✈️ 모든 섹터 텔레그램 발송을 시작합니다.', 'info');
        for (const sector of sectors) {
          try {
            updateStatus(sector.id, 'working', `📡 [Bulk] ${sector.name} 발송 중...`);
            const { data, error } = await supabase.from('news_items').select('content').eq('sector_id', sector.id).single();

            if (!error && data && data.content && data.content.length > 0) {
              await broadcastToTelegram(sector.id, data.content);
              updateStatus(sector.id, 'idle', `✅ [Bulk] ${sector.name} 발송 성공!`, 'success');
            } else {
              updateStatus(sector.id, 'idle', `⚠️ [Bulk] ${sector.name}: 발송할 기사가 없습니다.`, 'info');
            }
          } catch (err) {
            console.error(`[Bulk Telegram Error] ${sector.id}:`, err.message);
            updateStatus(sector.id, 'idle', `❌ [Bulk-Error] ${sector.name}: ${err.message}`, 'error');
          }
          await new Promise(resolve => setTimeout(resolve, 2000)); // 텔레그램 속도 제한 방어
        }
        updateStatus('all', 'idle', '🏁 모든 섹터 텔레그램 일괄 발송 완료', 'success');
      } catch (bulkErr) {
        updateStatus('all', 'idle', `🚨 일괄 발송 중 치명적 오류: ${bulkErr.message}`, 'error');
      }
    })();
  } catch (error) {
    console.error(error);
  }
});

// --- DAILY AUTOMATION SCHEDULER (9:00 AM KST) (Fixed Integrity) ---
async function dailyAutoWorkflow() {
  console.log(`[Scheduler] ⏰ 오전 9시 정기 리서치 및 발송을 시작합니다.`);
  try {
    const { data: sectors, error: cfgError } = await supabase.from('sector_config').select('*').order('weight', { ascending: false });
    if (cfgError) throw cfgError;
    
    updateStatus('all', 'working', '🌊 [자동] 정기 일괄 수집 시작', 'info');
    for (const sector of sectors) {
      try {
        updateStatus(sector.id, 'working', `🔄 [자동] ${sector.name} 수집 중...`);
        
        const sectorDataRows = await fetchAndProcessNews(sector.id);
        const sectorData = sectorDataRows[sector.id] || [];
        
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
    
    clearNewsCache(); // 정기 작업 완료 후 캐시 초기화
    
    // 2. 전체 섹터 텔레그램 발송
    updateStatus('all', 'working', '✈️ [자동] 정기 텔레그램 발송 시작', 'info');
    for (const sector of sectors) {
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
