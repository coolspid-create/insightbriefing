const { generateWeeklyReport } = require('./reportPipeline');
const supabase = require('./supabaseClient');

async function rebuild() {
  // 월~일 기준 주간 리포트 (4/20 월 ~ 4/26 일)
  const startDate = '2026-04-20'; // 월요일
  const endDate = '2026-04-26';   // 일요일

  console.log(`주간 리포트 재생성: ${startDate} (월) ~ ${endDate} (일)`);

  // 1. Delete existing weekly reports for this period
  console.log("기존 주간 리포트 삭제 중...");
  const { error: delError } = await supabase
    .from('trend_reports')
    .delete()
    .eq('report_type', 'weekly');

  if (delError) {
    console.error("삭제 오류:", delError.message);
    return;
  }
  console.log("기존 리포트 삭제 완료.");

  // 2. Fetch all sectors
  const { data: sectors, error: sectorError } = await supabase
    .from('sector_config')
    .select('id, name');

  if (sectorError) {
    console.error("섹터 조회 오류:", sectorError.message);
    return;
  }

  console.log(`${sectors.length}개 섹터 리포트 생성 시작...\n`);

  // 3. Generate for each sector
  for (const sector of sectors) {
    console.log(`================================================================`);
    console.log(`>>> [${sector.name}] (${sector.id}) 분석 시작...`);
    console.log(`================================================================`);
    try {
      const result = await generateWeeklyReport(sector.id, startDate, endDate);
      console.log(`>>> [성공] ${sector.name} 리포트 생성 완료 (ID: ${result.id})\n`);
    } catch (err) {
      console.error(`>>> [실패] ${sector.name} 오류:`, err.message, '\n');
    }
  }

  console.log("================================================================");
  console.log("모든 섹터의 주간 리포트 재생성 완료.");
  console.log("================================================================");
}

rebuild().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
