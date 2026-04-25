const { generateWeeklyReport } = require('./reportPipeline');

async function test() {
  console.log("Testing generateWeeklyReport for 'sector-ai'...");
  try {
    const report = await generateWeeklyReport('sector-ai');
    console.log("Report generated successfully!");
    console.log("Title:", report.title);
    console.log("Summary:", report.one_line_summary);
    console.log("Issues:", report.key_issues);
  } catch (error) {
    console.error("Test failed:", error);
  }
}

test();
