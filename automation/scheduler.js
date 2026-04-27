const cron = require('node-cron');
const { fetchAndProcessNews } = require('./pipeline');
const { broadcastToTelegram } = require('./telegram');
const { generateWeeklyReport } = require('./reportPipeline');
const { backupTrendReports } = require('./backupManager');
const supabase = require('./supabaseClient');

/**
 * 스케줄러 초기화 함수
 * server.js에서 require('./scheduler').initScheduler(clearNewsCache) 로 호출
 * @param {Function} clearNewsCache - server.js의 뉴스 캐시 무효화 함수
 */
function initScheduler(clearNewsCache) {
  console.log("================================================");
  console.log("📡 Insight Briefing 파이프라인 엔진 스케줄러 가동");
  console.log("⏰ 일간 브리핑: 매일 오전 09:00 (KST)");
  console.log("💾 주간 백업  : 매주 일요일 밤 23:00 (KST)");
  console.log("📊 주간 리포트: 매주 월요일 오전 08:00 (KST)");
  console.log("================================================\n");

  // ──────────────────────────────────────────────
  // 일간 뉴스 브리핑: 매일 오전 9시 (KST)
  // ──────────────────────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log("\n[⏰ 스케줄러 트리거] 오전 9시 정규 브리핑 생성을 시작합니다.");
    if (global.updateStatus) global.updateStatus('all', 'working', '⏰ 오전 9시 자동 브리핑 파이프라인 가동', 'info');

    try {
      const { data: sectors, error: cfgError } = await supabase
        .from('sector_config')
        .select('*')
        .order('weight', { ascending: false });
      if (cfgError) throw cfgError;

      for (const sector of sectors) {
        try {
          if (global.updateStatus) global.updateStatus(sector.id, 'working', `🔄 [자동] ${sector.name} 수집 중...`);

          const allData = await fetchAndProcessNews(sector.id);
          const sectorData = allData[sector.id];

          if (sectorData && sectorData.length > 0) {
            // Supabase에 뉴스 저장
            await supabase.from('news_items').delete().eq('sector_id', sector.id);
            const { error: insError } = await supabase.from('news_items').insert({
              sector_id: sector.id,
              content: sectorData
            });
            if (insError) throw insError;

            // 히스토리 아카이빙 (이미지 제외)
            const historyData = sectorData.map(({ image, ...rest }) => rest);
            await supabase.from('news_history').insert({ sector_id: sector.id, content: historyData });

            // 텔레그램 발송
            if (global.updateStatus) global.updateStatus(sector.id, 'working', `📡 [자동] ${sector.name} 텔레그램 발송 중...`);
            await broadcastToTelegram(sector.id, sectorData);

            if (global.updateStatus) global.updateStatus(sector.id, 'idle', `✅ [자동] ${sector.name} 완료! (${sectorData.length}건)`, 'success');
          } else {
            if (global.updateStatus) global.updateStatus(sector.id, 'idle', `⚠️ [자동] ${sector.name}: 유효한 기사 없음, 기존 데이터 유지`, 'info');
          }
        } catch (err) {
          console.error(`[Scheduler Sector Error] ${sector.id}:`, err.message);
          if (global.updateStatus) global.updateStatus(sector.id, 'idle', `❌ [자동-Error] ${sector.name}: ${err.message}`, 'error');
        }
        // 섹터 간 rate limit 방지
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (clearNewsCache) clearNewsCache();
      if (global.updateStatus) global.updateStatus('all', 'idle', '🏁 오전 9시 자동 브리핑 파이프라인 전체 완료!', 'success');
      console.log("\n✅ [오전 9시 파이프라인] 모든 작업이 성공적으로 종료되었습니다.\n");
    } catch (error) {
      console.error(`[Scheduler Critical Error]`, error);
      if (global.updateStatus) global.updateStatus('all', 'idle', `🚨 [Scheduler Critical Error]: ${error.message}`, 'error');
    }
  }, { timezone: "Asia/Seoul" });

  // ──────────────────────────────────────────────
  // 주간 데이터 백업: 매주 일요일 밤 11시 (KST)
  // ──────────────────────────────────────────────
  cron.schedule('0 23 * * 0', async () => {
    console.log("\n[💾 주간 백업] 일요일 밤 11시 — 데이터 아카이빙을 시작합니다.");
    try {
      await backupTrendReports();
      console.log("✅ [주간 백업] 아카이빙 프로세스가 종료되었습니다.\n");
    } catch (error) {
      console.error("[주간 백업 오류]", error.message);
    }
  }, { timezone: "Asia/Seoul" });

  // ──────────────────────────────────────────────
  // 주간 트렌드 리포트: 매주 월요일 오전 8시 (KST)
  // ──────────────────────────────────────────────
  cron.schedule('0 8 * * 1', async () => {
    console.log("\n[📊 주간 리포트] 월요일 오전 8시 — 주간 트렌드 리포트 자동 생성을 시작합니다.");

    try {
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
  }, { timezone: "Asia/Seoul" });

  console.log("-----------------------------------------------------");
  console.log("🚀 스케줄러가 서버와 함께 다음 일정을 대기합니다:");
  console.log("  - 일간 브리핑: 매일 09:00 AM (KST)");
  console.log("  - 주간 백업  : 매주 일요일 23:00 (KST)");
  console.log("  - 주간 리포트: 매주 월요일 08:00 AM (KST)");
  console.log("-----------------------------------------------------");
}

module.exports = { initScheduler };
