const fs = require('fs');
const path = require('path');
const supabase = require('./supabaseClient');

/**
 * Performs a full backup of the trend_reports table.
 * Saves to local JSON and uploads to Supabase Storage.
 */
async function backupTrendReports() {
  console.log('[Backup] Starting data archival process...');
  
  try {
    // 1. Fetch data from Supabase
    const { data: reports, error } = await supabase
      .from('trend_reports')
      .select('*')
      .order('period_end', { ascending: false });

    if (error) throw error;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    const localPath = path.join(backupDir, `trend_reports_${timestamp}.json`);
    
    // 2. Save locally
    fs.writeFileSync(localPath, JSON.stringify(reports, null, 2));
    console.log(`[Backup] Local backup saved: ${localPath}`);

    // 3. Upload to Supabase Storage
    const bucketName = 'backups';
    const remotePath = `reports/trend_reports_${timestamp}.json`;
    
    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets.find(b => b.name === bucketName)) {
      console.log(`[Backup] Creating bucket: ${bucketName}`);
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(remotePath, fs.readFileSync(localPath), {
        contentType: 'application/json'
      });

    if (uploadError) throw uploadError;
    
    console.log(`[Backup] Remote backup uploaded: ${remotePath}`);
    return true;
  } catch (err) {
    console.error('[Backup] Process failed:', err.message);
    return false;
  }
}

// If run directly
if (require.main === module) {
  backupTrendReports();
}

module.exports = { backupTrendReports };
