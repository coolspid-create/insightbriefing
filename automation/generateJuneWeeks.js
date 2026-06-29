const { generateWeeklyReport } = require('./reportPipeline');
const supabase = require('./supabaseClient');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateJuneWeeks() {
  const weeks = [
    { start: '2026-06-08', end: '2026-06-14', label: '6/8(월) ~ 6/14(일)' },
    { start: '2026-06-15', end: '2026-06-21', label: '6/15(월) ~ 6/21(일)' },
    { start: '2026-06-22', end: '2026-06-28', label: '6/22(월) ~ 6/28(일)' }
  ];

  console.log('--- Fetching sectors from database ---');
  const { data: sectors, error: sectorError } = await supabase
    .from('sector_config')
    .select('id, name')
    .order('weight', { ascending: false });

  if (sectorError) {
    console.error("❌ 섹터 조회 실패:", sectorError.message);
    return;
  }

  console.log(`Found ${sectors.length} sectors:`, sectors.map(s => s.name).join(', '));

  for (const week of weeks) {
    console.log(`\n======================================================`);
    console.log(`📅 [기간] ${week.label} 주간 리포트 생성 시작`);
    console.log(`======================================================`);

    for (const sector of sectors) {
      console.log(`\n>>> [${sector.name}] (${sector.id}) 분석 및 생성 시작...`);
      try {
        const result = await generateWeeklyReport(sector.id, week.start, week.end);
        console.log(`>>> ✅ [성공] ${sector.name} 완료 (ID: ${result.id}, Title: ${result.title})`);
      } catch (err) {
        console.error(`>>> ❌ [실패] ${sector.name} 오류:`, err.message);
      }
      
      // OpenAI API 속도 제어 및 부하 분산을 위한 딜레이 추가 (2.5초)
      console.log('Waiting 2.5 seconds before next request...');
      await sleep(2500);
    }
  }

  console.log(`\n======================================================`);
  console.log("🏁 모든 지정된 주간 리포트 생성 프로세스가 완료되었습니다.");
  console.log(`======================================================`);
}

generateJuneWeeks().catch(err => {
  console.error("Fatal execution error:", err);
  process.exit(1);
});
