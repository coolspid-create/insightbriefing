const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/KPSA/Documents/Codex/IB/automation/.env' });

async function debugTelegram() {
  const sectors = ['REN', 'SAFE', 'CONST', 'AI', 'COMM'];
  
  for (const sec of sectors) {
    const token = process.env[`TELEGRAM_BOT_TOKEN_${sec}`] || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env[`TELEGRAM_CHAT_ID_${sec}`] || process.env.TELEGRAM_CHAT_ID;
    
    console.log(`\n=== Sector: ${sec} ===`);
    console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'NONE'}`);
    console.log(`Chat ID: ${chatId}`);
    
    if (!token || !chatId) {
      console.log('Skipping due to missing config');
      continue;
    }
    
    try {
      const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
      console.log(`Bot Identity: SUCCESS! Username is @${response.data.result.username}`);
    } catch (err) {
      console.log(`Bot Identity: FAILED! ${err.response ? JSON.stringify(err.response.data) : err.message}`);
    }
  }
}

debugTelegram();
