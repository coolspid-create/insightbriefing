const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/KPSA/Documents/Codex/IB/automation/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSectors() {
  const { data, error } = await supabase.from('sector_config').select('*');
  if (error) {
    console.error('Error fetching sector_config:', error);
  } else {
    console.log('--- sector_config Table Data ---');
    console.log(JSON.stringify(data, null, 2));
  }
}

checkSectors();
