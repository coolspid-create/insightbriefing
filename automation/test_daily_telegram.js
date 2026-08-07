const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testDailyTelegramLocal() {
  console.log("=== Fetching news_items from Supabase (Local Formatting Test) ===");
  const { data: newsItems, error } = await supabase
    .from('news_items')
    .select('*');

  if (error) {
    console.error("Failed to fetch news items from database:", error.message);
    return;
  }

  console.log(`Fetched ${newsItems.length} sector news records from database.\n`);

  const sectors = ['sector-ren', 'sector-safe', 'sector-const', 'sector-ai', 'sector-comm'];

  for (const sectorId of sectors) {
    const sectorData = newsItems.find(item => item.sector_id === sectorId);
    if (!sectorData || !sectorData.content || sectorData.content.length === 0) {
      console.log(`⚠️ No news content found for ${sectorId} in database.`);
      continue;
    }

    const sector = config.sectors.find(s => s.id === sectorId);
    const isUrgent = sector ? sector.isUrgent : false;
    const sectorName = sector ? sector.name : sectorId;

    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    let message = `☀️ <b>${sectorName} 데일리 브리핑</b>\n`;
    message += `📅 일자: ${dateStr}\n`;
    message += `🔗 <a href="https://www.ibrief.kr/#${sectorId}">인사이트 브리핑 바로가기</a>\n\n`;
    
    if (isUrgent && sectorId !== 'sector-safe') {
      message = `🚨 <b>[긴급 필독] ${sectorName} 주요 리스크 및 동향 알림</b>\n📅 일자: ${dateStr}\n🔗 <a href="https://www.ibrief.kr/#${sectorId}">인사이트 브리핑 바로가기</a>\n\n`;
    } else if (isUrgent && sectorId === 'sector-safe') {
      message = `🚨 <b>${sectorName} 주요 리스크 및 동향 알림</b>\n📅 일자: ${dateStr}\n🔗 <a href="https://www.ibrief.kr/#${sectorId}">인사이트 브리핑 바로가기</a>\n\n`;
    }

    sectorData.content.forEach((news, idx) => {
      message += `<b>${idx + 1}. ${news.title}</b>\n`;
      message += `${news.summary}\n`;
      message += `🔗 <a href="${news.link}">원문 보기</a>\n\n`;
    });

    message += `🔗 <a href="https://www.ibrief.kr/#${sectorId}">인사이트 브리핑에서 모아보기</a>`;

    console.log(`\n======================================================================`);
    console.log(`📡 LOCAL SIMULATION FOR SECTOR: ${sectorId} (${sectorName})`);
    console.log(`[뉴스 기사 수: ${sectorData.content.length}개]`);
    console.log(`======================================================================`);
    console.log(message);
    console.log(`======================================================================\n`);
  }
}

testDailyTelegramLocal();
