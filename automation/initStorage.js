const supabase = require('./supabaseClient');

async function initStorage() {
  console.log('🚀 Supabase Storage 초기화를 시작합니다...');
  
  const bucketsToCreate = [
    { name: 'trend-images', public: true },
    { name: 'backups', public: false }
  ];

  for (const bucket of bucketsToCreate) {
    console.log(`\n[${bucket.name}] 확인 중...`);
    
    // 1. 버킷 존재 여부 확인
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`❌ 버킷 목록 조회 실패:`, listError.message);
      continue;
    }

    const exists = buckets.find(b => b.name === bucket.name);

    if (exists) {
      console.log(`✅ 이미 존재하는 버킷입니다.`);
    } else {
      // 2. 버킷 생성
      console.log(`➕ 버킷 생성 중...`);
      const { data, error: createError } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
        allowedMimeTypes: bucket.name === 'trend-images' ? ['image/png', 'image/jpeg'] : ['application/json'],
        fileSizeLimit: 5242880 // 5MB
      });

      if (createError) {
        console.error(`❌ 버킷 생성 실패:`, createError.message);
        if (createError.message.includes('403')) {
          console.error('💡 TIP: Supabase API Key가 "service_role" 권한인지 확인해 주세요.');
        }
      } else {
        console.log(`🎉 [${bucket.name}] 버킷이 성공적으로 생성되었습니다.`);
      }
    }
  }

  console.log('\n✨ 초기화 프로세스가 완료되었습니다.');
}

initStorage();
