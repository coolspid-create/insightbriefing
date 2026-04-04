const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. 환경 변수 로드
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogging() {
  console.log('--- 🧪 Supabase 로깅 시스템 테스트 시작 ---');
  
  const testEntry = {
    level: 'success',
    sector_id: 'system-test',
    message: '🎉 로깅 시스템이 성공적으로 구축되었습니다! (테스트 신호)'
  };

  try {
    console.log('1. system_logs 테이블에 테스트 데이터 전송 중...');
    const { data: insertData, error: insertError } = await supabase
      .from('system_logs')
      .insert(testEntry)
      .select();

    if (insertError) throw insertError;
    console.log('✅ 저장 완료:', insertData[0]);

    console.log('\n2. 저장된 로그 다시 조회 중...');
    const { data: fetchData, error: fetchError } = await supabase
      .from('system_logs')
      .select('*')
      .eq('sector_id', 'system-test')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;
    
    if (fetchData.length > 0 && fetchData[0].message === testEntry.message) {
      console.log('🎉 최종 결과: 로깅 시스템이 완벽하게 작동합니다!');
    } else {
      console.log('❌ 결과 불일치: 데이터를 찾을 수 없거나 내용이 다릅니다.');
    }
  } catch (err) {
    console.error('❌ 테스트 중 오류 발생:', err.message);
    if (err.message.includes('relation "public.system_logs" does not exist')) {
      console.log('👉 오류분석: 테이블 이름이 틀렸거나 스키마가 다릅니다.');
    }
  }
}

testLogging();
