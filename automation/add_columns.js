const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  console.log("Attempting to add missing columns to trend_reports table...");
  // Note: execute_sql is a common custom RPC function in Supabase projects for migrations
  const sql = `
    ALTER TABLE public.trend_reports ADD COLUMN IF NOT EXISTS trend_summary TEXT;
    ALTER TABLE public.trend_reports ADD COLUMN IF NOT EXISTS impact_summary TEXT;
    ALTER TABLE public.trend_reports ADD COLUMN IF NOT EXISTS future_summary TEXT;
  `;
  const { error } = await supabase.rpc('execute_sql', { sql });
  
  if (error) {
    console.error("RPC 'execute_sql' failed. This usually means the function isn't defined in your Supabase DB.");
    console.error("Error details:", error.message);
    console.log("\n>>> PLEASE RUN THE FOLLOWING SQL IN YOUR SUPABASE SQL EDITOR:");
    console.log(sql);
  } else {
    console.log("Successfully added columns!");
  }
}
run();
