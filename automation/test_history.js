require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHistory() {
  console.log("Checking news_history...");
  const { data, error } = await supabase
    .from('news_history')
    .select('id, sector_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error("Error fetching news_history:", error);
  } else {
    console.log("Found records:", data.length);
    console.log(data);
  }

  // Check structure of first row
  const { data: fullData } = await supabase.from('news_history').select('*').limit(1);
  if (fullData && fullData.length > 0) {
    console.log("Sample structure:", Object.keys(fullData[0]));
  }
}

checkHistory();
