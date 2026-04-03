const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { fetchAndProcessNews } = require('./pipeline');
const { broadcastToTelegram } = require('./telegram');

const DB_PATH = path.join(__dirname, 'database.json');

function updateDatabase(newsResults) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(newsResults, null, 2), 'utf8');
    console.log(`[💾 데이터 동기화] Backend Database(database.json) 갱신 완료!`);
  } catch (err) {
    console.error(`[💾 데이터 동기화 실패]`, err.message);
  }
}

console.log("================================================");
console.log("📡 Insight Briefing 파이프라인 엔진 스케줄러 가동 준비");
console.log("⏰ 설정된 알림 시간: 매일 오전 09:00 정각");
console.log("================================================\n");

// 0 9 * * * = 매일 오전 9시 (서버 타임존 기준)
cron.schedule('0 9 * * *', async () => {
  console.log("\n[⏰ 스케줄러 트리거] 오전 9시 정규 브리핑 생성을 시작합니다.");
  
  // 1. 뉴스 스크래핑 및 가중치(리스크 평가) 기반 점수 추출 수행
  const data = await fetchAndProcessNews();
  
  // 2. 자체 데이터베이스 반영 (우선순위 1)
  updateDatabase(data);
  
  console.log("\n[📩 발송 프로세스] DB 갱신 완료 후 텔레그램 발송 준비 중...");
  
  // 3. 텔레그램으로 각 채널에 별도 발송 (우선순위 2)
  for (const [sectorId, newsItems] of Object.entries(data)) {
    await broadcastToTelegram(sectorId, newsItems);
  }
  
  console.log("\n✅ [오전 9시 파이프라인] 모든 작업이 성공적으로 종료되었습니다.\n");
});

// 프로세스 실행 테스트 모드 (실제 서버에서는 cron만 대기)
(async () => {
    console.log("------------- 파이프라인 테스트 즉시 가동 -------------");
    const data = await fetchAndProcessNews();
    
    console.log("\n[📩 발송 프로세스] 텔레그램 연동 테스트 진행");
    for (const [sectorId, newsItems] of Object.entries(data)) {
        await broadcastToTelegram(sectorId, newsItems);
    }
    console.log("-----------------------------------------------------");
    console.log("\n이제 스케줄러가 백그라운드에서 다음 09:00 AM 일정을 대기합니다...");
})();
