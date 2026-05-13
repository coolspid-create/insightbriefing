const supabase = require('./supabaseClient');

async function cleanReferences() {
  try {
    // 모든 리포트를 가져옵니다.
    const { data: reports, error } = await supabase
      .from('trend_reports')
      .select('id, trend_analysis, impact_analysis, future_outlook');

    if (error) {
      console.error("데이터베이스 조회 실패:", error.message);
      return;
    }

    let updatedCount = 0;
    
    // 정규식: (기사 1), (기사 3, 6), (기사1,2) 등 (괄호 안에 '기사'와 숫자/쉼표/공백이 들어간 패턴)
    const regex = /\(기사\s*[\d\s,]+\)/g;

    for (const report of reports) {
      let needsUpdate = false;
      
      const newTrendAnalysis = report.trend_analysis ? report.trend_analysis.replace(regex, '').trim() : null;
      const newImpactAnalysis = report.impact_analysis ? report.impact_analysis.replace(regex, '').trim() : null;
      const newFutureOutlook = report.future_outlook ? report.future_outlook.replace(regex, '').trim() : null;

      if (
        newTrendAnalysis !== report.trend_analysis ||
        newImpactAnalysis !== report.impact_analysis ||
        newFutureOutlook !== report.future_outlook
      ) {
        needsUpdate = true;
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('trend_reports')
          .update({
            trend_analysis: newTrendAnalysis,
            impact_analysis: newImpactAnalysis,
            future_outlook: newFutureOutlook
          })
          .eq('id', report.id);

        if (updateError) {
          console.error(`업데이트 실패 (${report.id}):`, updateError.message);
        } else {
          updatedCount++;
        }
      }
    }

    console.log(`\n작업 완료. 총 ${updatedCount}개의 리포트에서 '(기사 X)' 참조가 삭제되었습니다.`);

  } catch (err) {
    console.error("스크립트 실행 오류:", err);
  }
}

cleanReferences();
