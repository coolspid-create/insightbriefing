const { broadcastReportToTelegram } = require('./telegram');
const supabase = require('./supabaseClient');

async function testTelegram() {
  const { data, error } = await supabase.from('trend_reports').select('*').limit(1).single();
  if (data) {
    console.log("Sending telegram for sector:", data.sector_id);
    await broadcastReportToTelegram(data.sector_id, data);
  } else {
    console.error("No report found to send.");
  }
}

testTelegram();
