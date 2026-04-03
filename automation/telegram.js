require('dotenv').config();
const axios = require('axios');
const config = require('./config');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_URL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

async function broadcastToTelegram(sectorId, newsItems) {
  if (!newsItems || newsItems.length === 0) return;
  
  // 커머스 섹션 발송 제외 요청 반영
  if (sectorId === 'sector-comm') {
    console.log(`[Telegram] '커머스' 섹터는 발송 제외 대상입니다. 스킵합니다.`);
    return;
  }

  const sector = config.sectors.find(s => s.id === sectorId);
  const isUrgent = sector.isUrgent;
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  let message = `☀️ <b>${sector.name} 데일리 브리핑</b>\n`;
  message += `📅 일자: ${dateStr}\n\n`;
  
  if (isUrgent) {
    message = `🚨 <b>[긴급 필독] ${sector.name} 주요 리스크 및 동향 알림</b>\n📅 일자: ${dateStr}\n\n`;
  }

  newsItems.forEach((news, idx) => {
    message += `<b>${idx + 1}. ${news.title}</b>\n`;
    message += `${news.summary}\n`;
    message += `🔗 <a href="${news.link}">원문 보기</a>\n\n`;
  });

  message += `[INSIGHT BRIEFING]`;

  try {
    console.log(`[Telegram 발송] ${sector.name} 채널로 브리핑 푸시 메시지를 전송합니다... (ChatID: ${CHAT_ID})`);
    
    await axios.post(TELEGRAM_URL, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    
    console.log(`[Telegram 발송] 전송 성공!`);
  } catch (err) {
    console.error(`[Telegram 전송 오류]`, err.response ? err.response.data : err.message);
  }
  
  // 텔레그램 속도 제한 방어
  await new Promise(resolve => setTimeout(resolve, 2000));
}

module.exports = { broadcastToTelegram };
