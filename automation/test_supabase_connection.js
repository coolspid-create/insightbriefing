const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 에러: SUPABASE_URL 또는 SUPABASE_KEY가 .env 파일에 설정되어 있지 않습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  console.log('--- Supabase 연결 점검 시작 ---');
  console.log('URL:', supabaseUrl);
  
  try {
    const { data, error } = await supabase
      .from('news_items')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
         console.log('✅ Supabase 연결 성공! (단, news_items 테이블이 비어있거나 단일 행 조회 결과 없음)');
      } else {
         throw error;
      }
    } else {
      console.log('✅ Supabase 연결 및 news_items 테이블 접근 성공!');
      console.log('조회된 데이터 샘플:', data);
    }
  } catch (err) {
    console.error('❌ Supabase 연결 실패:', err.message);
    if (err.message.includes('404')) {
      console.log('💡 팁: news_items 테이블이 데이터베이스에 생성되어 있는지 확인해 보세요.');
    }
  }
}

checkConnection();
