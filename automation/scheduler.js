const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { fetchAndProcessNews } = require('./pipeline');
const { broadcastToTelegram } = require('./telegram');
const { generateWeeklyReport } = require('./reportPipeline');
const { backupTrendReports } = require('./backupManager');
const supabase = require('./supabaseClient');

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
console.log("⏰ 일간 브리핑: 매일 오전 09:00");
console.log("💾 주간 백업  : 매주 일요일 밤 23:00");
console.log("📊 주간 리포트: 매주 월요일 오전 08:00");
console.log("================================================\n");

// ──────────────────────────────────────────────
// 일간 뉴스 브리핑: 매일 오전 9시
// ──────────────────────────────────────────────
cron.schedule('0 9 * * *', async () => {
  console.log("\n[⏰ 스케줄러 트리거] 오전 9시 정규 브리핑 생성을 시작합니다.");
  
  const data = await fetchAndProcessNews();
  updateDatabase(data);
  
  console.log("\n[📩 발송 프로세스] DB 갱신 완료 후 텔레그램 발송 준비 중...");
  
  for (const [sectorId, newsItems] of Object.entries(data)) {
    await broadcastToTelegram(sectorId, newsItems);
  }
  
  console.log("\n✅ [오전 9시 파이프라인] 모든 작업이 성공적으로 종료되었습니다.\n");
});

// ──────────────────────────────────────────────
// 주간 데이터 백업: 매주 일요일 밤 11시
// ──────────────────────────────────────────────
cron.schedule('0 23 * * 0', async () => {
  console.log("\n[💾 주간 백업] 일요일 밤 11시 — 데이터 아카이빙을 시작합니다.");
  await backupTrendReports();
  console.log("✅ [주간 백업] 아카이빙 프로세스가 종료되었습니다.\n");
});

// ──────────────────────────────────────────────
// 주간 트렌드 리포트: 매주 월요일 오전 8시
// 직전 주 월~일 데이터를 분석하여 전 섹터 리포트 자동 생성
// ──────────────────────────────────────────────
cron.schedule('0 8 * * 1', async () => {
  console.log("\n[📊 주간 리포트] 월요일 오전 8시 — 주간 트렌드 리포트 자동 생성을 시작합니다.");
  
  try {
    // Fetch all sectors
    const { data: sectors, error: sectorError } = await supabase
      .from('sector_config')
      .select('id, name');

    if (sectorError) {
      console.error("[주간 리포트 오류] 섹터 목록 조회 실패:", sectorError.message);
      return;
    }

    console.log(`[주간 리포트] ${sectors.length}개 섹터 리포트 생성 시작...`);

    for (const sector of sectors) {
      console.log(`\n>>> [${sector.name}] 주간 리포트 분석 시작...`);
      try {
        const result = await generateWeeklyReport(sector.id);
        console.log(`>>> [성공] ${sector.name} 리포트 생성 완료 (ID: ${result.id})`);
      } catch (err) {
        console.error(`>>> [실패] ${sector.name} 리포트 생성 오류:`, err.message);
      }
    }

    console.log("\n✅ [주간 리포트] 전 섹터 주간 트렌드 리포트 생성이 완료되었습니다.\n");
  } catch (error) {
    console.error("[주간 리포트 치명적 오류]", error.message);
  }
});

    console.log("\n✅ [주간 리포트] 전 섹터 주간 트렌드 리포트 생성이 완료되었습니다.\n");
  } catch (error) {
    console.error("[주간 리포트 치명적 오류]", error.message);
  }
});

console.log("-----------------------------------------------------");
console.log("🚀 스케줄러가 백그라운드에서 다음 일정을 대기합니다:");
console.log("  - 일간 브리핑: 매일 09:00 AM");
console.log("  - 주간 백업  : 매주 일요일 23:00 PM");
console.log("  - 주간 리포트: 매주 월요일 08:00 AM");
console.log("-----------------------------------------------------");
