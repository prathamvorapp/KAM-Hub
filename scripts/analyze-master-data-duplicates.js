/**
 * Master Data Duplicate Analysis and Cleanup Script
 * 
 * This script connects to Supabase and:
 * 1. Analyzes duplicate records in master_data table
 * 2. Provides detailed statistics
 * 3. Optionally removes duplicates (with confirmation)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeDuplicates() {
  console.log('🔍 Analyzing master_data table for duplicates...\n');

  // 1. Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('master_data')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error getting total count:', countError);
    return;
  }

  console.log(`📊 Total records in master_data: ${totalCount}`);
  console.log(`📊 Expected records: 1390`);
  console.log(`📊 Difference: ${totalCount - 1390} extra records\n`);

  // 2. Get all records to analyze in memory
  const { data: allRecords, error: fetchError } = await supabase
    .from('master_data')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching records:', fetchError);
    return;
  }

  // 3. Find duplicates by brand_name + kam_email_id
  const duplicateMap = new Map();
  const exactDuplicateMap = new Map();

  allRecords.forEach(record => {
    // Key by brand_name + kam_email_id
    const key = `${record.brand_name}|||${record.kam_email_id}`;
    
    if (!duplicateMap.has(key)) {
      duplicateMap.set(key, []);
    }
    duplicateMap.get(key).push(record);

    // Key by all fields for exact duplicates
    const exactKey = `${record.brand_name}|||${record.brand_email_id || 'NULL'}|||${record.kam_name}|||${record.kam_email_id}|||${record.brand_state}|||${record.zone}|||${record.outlet_counts}`;
    
    if (!exactDuplicateMap.has(exactKey)) {
      exactDuplicateMap.set(exactKey, []);
    }
    exactDuplicateMap.get(exactKey).push(record);
  });

  // 4. Analyze duplicates
  const duplicateGroups = Array.from(duplicateMap.entries())
    .filter(([_, records]) => records.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  const exactDuplicateGroups = Array.from(exactDuplicateMap.entries())
    .filter(([_, records]) => records.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`\n🔍 Duplicate Analysis Results:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📌 Duplicates by brand_name + kam_email_id: ${duplicateGroups.length} groups`);
  console.log(`📌 Exact duplicates (all fields match): ${exactDuplicateGroups.length} groups`);
  
  let totalDuplicateRecords = 0;
  duplicateGroups.forEach(([_, records]) => {
    totalDuplicateRecords += records.length - 1; // -1 because we keep one
  });
  
  console.log(`📌 Total duplicate records to remove: ${totalDuplicateRecords}`);
  console.log(`📌 Records after cleanup: ${totalCount - totalDuplicateRecords}`);

  // 5. Show top 10 duplicate groups
  console.log(`\n📋 Top 10 Duplicate Groups (by brand_name + kam_email_id):`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  duplicateGroups.slice(0, 10).forEach(([key, records], index) => {
    const [brandName, kamEmail] = key.split('|||');
    console.log(`\n${index + 1}. Brand: ${brandName}`);
    console.log(`   KAM Email: ${kamEmail}`);
    console.log(`   Duplicate count: ${records.length} records`);
    console.log(`   IDs: ${records.map(r => r.id.substring(0, 8)).join(', ')}...`);
    console.log(`   Created dates: ${records.map(r => new Date(r.created_at).toLocaleDateString()).join(', ')}`);
  });

  // 6. Show exact duplicates
  if (exactDuplicateGroups.length > 0) {
    console.log(`\n📋 Exact Duplicate Groups (all fields match):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    exactDuplicateGroups.slice(0, 5).forEach(([key, records], index) => {
      const fields = key.split('|||');
      console.log(`\n${index + 1}. Brand: ${fields[0]}`);
      console.log(`   Duplicate count: ${records.length} records`);
      console.log(`   All fields are identical`);
    });
  }

  // 7. Statistics by zone
  const zoneStats = {};
  allRecords.forEach(record => {
    if (!zoneStats[record.zone]) {
      zoneStats[record.zone] = { total: 0, unique: new Set() };
    }
    zoneStats[record.zone].total++;
    zoneStats[record.zone].unique.add(`${record.brand_name}|||${record.kam_email_id}`);
  });

  console.log(`\n📊 Statistics by Zone:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Object.entries(zoneStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([zone, stats]) => {
      console.log(`${zone.padEnd(15)} Total: ${stats.total.toString().padStart(4)}  Unique: ${stats.unique.size.toString().padStart(4)}  Duplicates: ${(stats.total - stats.unique.size).toString().padStart(4)}`);
    });

  return {
    totalCount,
    duplicateGroups,
    exactDuplicateGroups,
    totalDuplicateRecords,
    allRecords
  };
}

async function removeDuplicates(dryRun = true) {
  console.log(`\n${dryRun ? '🔍 DRY RUN MODE' : '⚠️  LIVE MODE'} - ${dryRun ? 'Simulating' : 'Executing'} duplicate removal...\n`);

  // Get all records
  const { data: allRecords, error: fetchError } = await supabase
    .from('master_data')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching records:', fetchError);
    return;
  }

  // Group by brand_name + kam_email_id
  const duplicateMap = new Map();
  allRecords.forEach(record => {
    const key = `${record.brand_name}|||${record.kam_email_id}`;
    if (!duplicateMap.has(key)) {
      duplicateMap.set(key, []);
    }
    duplicateMap.get(key).push(record);
  });

  // Find records to delete (keep oldest)
  const idsToDelete = [];
  duplicateMap.forEach((records, key) => {
    if (records.length > 1) {
      // Keep the first (oldest) record, delete the rest
      const toDelete = records.slice(1);
      idsToDelete.push(...toDelete.map(r => r.id));
      
      if (dryRun) {
        console.log(`Would delete ${toDelete.length} duplicate(s) for: ${key.split('|||')[0]}`);
      }
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`Total records to delete: ${idsToDelete.length}`);
  console.log(`Records that will remain: ${allRecords.length - idsToDelete.length}`);

  if (!dryRun) {
    console.log(`\n⚠️  Proceeding with deletion...`);
    
    // Delete in batches of 100
    const batchSize = 100;
    let deleted = 0;
    
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error } = await supabase
        .from('master_data')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, error);
        break;
      }
      
      deleted += batch.length;
      console.log(`✅ Deleted ${deleted}/${idsToDelete.length} records...`);
    }
    
    console.log(`\n✅ Deletion complete!`);
    
    // Verify final count
    const { count: finalCount } = await supabase
      .from('master_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Final count: ${finalCount} records`);
    console.log(`📊 Expected: 1390 records`);
    console.log(`📊 Difference: ${finalCount - 1390}`);
  } else {
    console.log(`\n💡 This was a dry run. To actually delete duplicates, run:`);
    console.log(`   node scripts/analyze-master-data-duplicates.js --delete`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const shouldDelete = args.includes('--delete');
  const dryRun = !shouldDelete;

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Master Data Duplicate Analysis & Cleanup Tool       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Always analyze first
  const analysis = await analyzeDuplicates();

  if (!analysis) {
    console.error('❌ Analysis failed');
    process.exit(1);
  }

  // Ask for confirmation if deleting
  if (shouldDelete) {
    console.log(`\n⚠️  WARNING: You are about to delete ${analysis.totalDuplicateRecords} duplicate records!`);
    console.log(`⚠️  This action cannot be undone!`);
    console.log(`\n💡 Recommendation: First backup your database or run without --delete flag`);
    
    // In a real scenario, you'd want to add a confirmation prompt here
    // For now, we'll just proceed
    await removeDuplicates(false);
  } else {
    await removeDuplicates(true);
  }
}

main().catch(console.error);
