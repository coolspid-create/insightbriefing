const supabase = require('./supabaseClient');
const axios = require('axios');

/**
 * Downloads image from a URL and uploads to Supabase Storage.
 */
async function migrateImage(imageUrl, sectorId, reportId) {
  try {
    if (!imageUrl || imageUrl.includes('supabase.co')) {
      console.log(`[Skip] 이미 Supabase에 저장되어 있거나 URL이 없습니다: ${reportId}`);
      return null;
    }

    console.log(`[Migrate] Downloading image for report ${reportId}...`);
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    const fileName = `weekly_${sectorId}_migrated_${reportId}.png`;
    const path = `reports/${fileName}`;

    console.log(`[Migrate] Uploading to Supabase: ${path}`);
    const { error: uploadError } = await supabase.storage
      .from('trend-images')
      .upload(path, buffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from('trend-images')
      .getPublicUrl(path);

    return publicData.publicUrl;
  } catch (error) {
    console.error(`[Error] Migration failed for ${reportId}:`, error.message);
    return null;
  }
}

async function startMigration() {
  console.log('🚀 기존 리포트 이미지 마이그레이션을 시작합니다...');

  // 1. 모든 리포트 가져오기
  const { data: reports, error } = await supabase
    .from('trend_reports')
    .select('id, sector_id, diagram_image_url');

  if (error) {
    console.error('리포트 조회 실패:', error.message);
    return;
  }

  console.log(`총 ${reports.length}개의 리포트를 확인합니다.`);

  let successCount = 0;
  for (const report of reports) {
    const newUrl = await migrateImage(report.diagram_image_url, report.sector_id, report.id);
    
    if (newUrl) {
      // 2. DB 업데이트
      const { error: updateError } = await supabase
        .from('trend_reports')
        .update({ diagram_image_url: newUrl })
        .eq('id', report.id);

      if (updateError) {
        console.error(`[Update Error] DB 갱신 실패 (ID: ${report.id}):`, updateError.message);
      } else {
        console.log(`✅ [Success] 리포트 ${report.id} 마이그레이션 완료`);
        successCount++;
      }
    }
  }

  console.log(`\n✨ 마이그레이션 종료: ${successCount}개 이미지 처리 완료`);
  
  // 3. 최종 데이터 백업 실행
  console.log('\n📦 최종 데이터 백업을 시작합니다...');
  const { backupTrendReports } = require('./backupManager');
  await backupTrendReports();
}

startMigration();
