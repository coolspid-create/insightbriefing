const { generateWeeklyReport } = require('./reportPipeline');
const supabase = require('./supabaseClient');

async function generatePastWeeks() {
  const weeks = [
    { start: '2026-04-27', end: '2026-05-03', label: '4/27(월)~5/3(일)' },
    { start: '2026-05-04', end: '2026-05-10', label: '5/4(월)~5/10(일)' },
  ];

  const { data: sectors, error: sectorError } = await supabase
    .from('sector_config')
    .select('id, name');

  if (sectorError) {
    console.error("섹터 조회 오류:", sectorError.message);
    return;
  }

  for (const week of weeks) {
    console.log(`\n${'='.repeat(64)}`);
    console.log(`📊 ${week.label} 주간 리포트 생성 시작`);
    console.log(`${'='.repeat(64)}`);

    for (const sector of sectors) {
      console.log(`\n>>> [${sector.name}] (${sector.id}) 분석 시작...`);
      try {
        const result = await generateWeeklyReport(sector.id, week.start, week.end);
        console.log(`>>> [성공] ${sector.name} 완료 (ID: ${result.id})`);
      } catch (err) {
        console.error(`>>> [실패] ${sector.name}:`, err.message);
      }
    }
  }

  console.log(`\n${'='.repeat(64)}`);
  console.log("모든 과거 주간 리포트 생성 완료.");
  console.log(`${'='.repeat(64)}`);
}

generatePastWeeks().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
