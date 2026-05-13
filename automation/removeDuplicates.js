const supabase = require('./supabaseClient');

async function removeDuplicates() {
  try {
    // 1. 4.13 ~ 4.19 주차의 리포트를 모두 가져옵니다.
    const { data: reports, error } = await supabase
      .from('trend_reports')
      .select('id, sector_id, created_at')
      .eq('period_start', '2026-04-13')
      .eq('period_end', '2026-04-19')
      .order('created_at', { ascending: false }); // 가장 최근에 생성된 것이 배열 앞에 오도록 정렬

    if (error) {
      console.error("오류 발생:", error.message);
      return;
    }

    console.log(`조회된 4.20~4.26 리포트 수: ${reports.length}`);

    // 섹터별로 분류
    const sectorMap = {};
    for (const report of reports) {
      if (!sectorMap[report.sector_id]) {
        sectorMap[report.sector_id] = [];
      }
      sectorMap[report.sector_id].push(report);
    }

    // 중복 제거 진행 (각 섹터당 1개(가장 최근)만 남기고 나머지 삭제)
    let deletedCount = 0;
    for (const sectorId in sectorMap) {
      const sectorReports = sectorMap[sectorId];
      if (sectorReports.length > 1) {
        console.log(`[${sectorId}] 중복 리포트 발견: ${sectorReports.length}개`);
        // 첫 번째(가장 최신) 리포트 제외하고 삭제
        const toDelete = sectorReports.slice(1);
        for (const reportToDelete of toDelete) {
          const { error: deleteError } = await supabase
            .from('trend_reports')
            .delete()
            .eq('id', reportToDelete.id);
            
          if (deleteError) {
            console.error(`- 삭제 실패 (${reportToDelete.id}):`, deleteError.message);
          } else {
            console.log(`- 삭제 성공 (${reportToDelete.id})`);
            deletedCount++;
          }
        }
      } else {
        console.log(`[${sectorId}] 정상 (1개)`);
      }
    }

    console.log(`\n작업 완료. 총 ${deletedCount}개의 중복 리포트가 삭제되었습니다.`);

  } catch (err) {
    console.error("스크립트 오류:", err);
  }
}

removeDuplicates();
