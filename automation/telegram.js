require('dotenv').config();
const axios = require('axios');
const config = require('./config');

// 섹터별 텔레그램 봇 매핑 설정
const BOT_CONFIG = {
  'sector-ren': {
    token: process.env.TELEGRAM_BOT_TOKEN_REN || process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID_REN || process.env.TELEGRAM_CHAT_ID,
    name: '신재생에너지(태양광)'
  },
  'sector-safe': {
    token: process.env.TELEGRAM_BOT_TOKEN_SAFE,
    chatId: process.env.TELEGRAM_CHAT_ID_SAFE,
    name: '제품안전'
  },
  'sector-const': {
    token: process.env.TELEGRAM_BOT_TOKEN_CONST,
    chatId: process.env.TELEGRAM_CHAT_ID_CONST,
    name: '인테리어·건설'
  },
  'sector-ai': {
    token: process.env.TELEGRAM_BOT_TOKEN_AI,
    chatId: process.env.TELEGRAM_CHAT_ID_AI,
    name: 'AI·테크'
  },
  'sector-comm': {
    token: process.env.TELEGRAM_BOT_TOKEN_COMM,
    chatId: process.env.TELEGRAM_CHAT_ID_COMM,
    name: '커머스'
  }
};

async function broadcastToTelegram(sectorId, newsItems) {
  console.log(`[Telegram Debug] ${sectorId} 섹터 발송 시도 중... (기사 수: ${newsItems?.length || 0})`);
  
  if (!newsItems || newsItems.length === 0) {
    console.log(`[Telegram Status] ${sectorId} 섹터에 발송할 기사가 없습니다. 수집을 먼저 진행해 주세요.`);
    return;
  }
  
  const botInfo = BOT_CONFIG[sectorId];

  // 연동 정보가 없는 섹터는 발송 제외
  if (!botInfo || !botInfo.token || !botInfo.chatId) {
    console.log(`[Telegram Error] '${sectorId}' 섹터의 봇 설정(Token/ChatID)이 누락되었습니다. .env 설정을 확인하세요.`);
    return;
  }

  const sector = config.sectors.find(s => s.id === sectorId);
  const isUrgent = sector ? sector.isUrgent : false;
  const sectorName = sector ? sector.name : botInfo.name;
  
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  let message = `☀️ <b>${sectorName} 데일리 브리핑</b>\n`;
  message += `📅 일자: ${dateStr}\n\n`;
  
  if (isUrgent && sectorId !== 'sector-safe') {
    message = `🚨 <b>[긴급 필독] ${sectorName} 주요 리스크 및 동향 알림</b>\n📅 일자: ${dateStr}\n\n`;
  } else if (isUrgent && sectorId === 'sector-safe') {
    message = `🚨 <b>${sectorName} 주요 리스크 및 동향 알림</b>\n📅 일자: ${dateStr}\n\n`;
  }

  newsItems.forEach((news, idx) => {
    message += `<b>${idx + 1}. ${news.title}</b>\n`;
    message += `${news.summary}\n`;
    message += `🔗 <a href="${news.link}">원문 보기</a>\n\n`;
  });

  message += `[INSIGHT BRIEFING]`;

  const TELEGRAM_URL = `https://api.telegram.org/bot${botInfo.token}/sendMessage`;

  try {
    console.log(`[Telegram 발송] ${sectorName} 채널로 브리핑 푸시 메시지를 전송합니다... (ChatID: ${botInfo.chatId})`);
    
    await axios.post(TELEGRAM_URL, {
      chat_id: botInfo.chatId,
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
