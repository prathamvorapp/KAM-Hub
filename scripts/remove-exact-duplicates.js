/**
 * Remove Exact Duplicate Records from Master Data
 * 
 * This script removes records where ALL fields match exactly,
 * keeping only the oldest record (earliest created_at)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeExactDuplicates(dryRun = true) {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Remove Exact Duplicates from Master Data            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (Safe)' : '⚠️  LIVE MODE (Will Delete)'}\n`);

  // Get all records with pagination
  console.log('📥 Fetching all records...');
  let allRecords = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('master_data')
      .select('*')
      .order('created_at', { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('❌ Error fetching records:', error);
      return;
    }

    if (data && data.length > 0) {
      allRecords = allRecords.concat(data);
      console.log(`   Fetched page ${page + 1}: ${data.length} records (total: ${allRecords.length})`);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Total records: ${allRecords.length}\n`);

  // Group by exact field match
  const exactDuplicateMap = new Map();
  
  allRecords.forEach(record => {
    // Create a key from all business fields (excluding id, created_at, updated_at)
    const key = JSON.stringify({
      brand_name: record.brand_name,
      brand_email_id: record.brand_email_id || null,
      kam_name: record.kam_name,
      kam_email_id: record.kam_email_id,
      brand_state: record.brand_state,
      zone: record.zone,
      kam_name_secondary: record.kam_name_secondary || null,
      outlet_counts: record.outlet_counts
    });
    
    if (!exactDuplicateMap.has(key)) {
      exactDuplicateMap.set(key, []);
    }
    exactDuplicateMap.get(key).push(record);
  });

  // Find duplicate groups
  const duplicateGroups = Array.from(exactDuplicateMap.entries())
    .filter(([_, records]) => records.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log(`🔍 Analysis Results:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Exact duplicate groups found: ${duplicateGroups.length}`);
  
  let totalDuplicateRecords = 0;
  duplicateGroups.forEach(([_, records]) => {
    totalDuplicateRecords += records.length - 1; // -1 because we keep one
  });
  
  console.log(`Total duplicate records to remove: ${totalDuplicateRecords}`);
  console.log(`Records after cleanup: ${allRecords.length - totalDuplicateRecords}`);
  console.log(`Unique records: ${exactDuplicateMap.size}\n`);

  // Show top 10 duplicate groups
  if (duplicateGroups.length > 0) {
    console.log(`📋 Top 10 Duplicate Groups:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    duplicateGroups.slice(0, 10).forEach(([key, records], index) => {
      const sample = records[0];
      console.log(`\n${index + 1}. Brand: ${sample.brand_name}`);
      console.log(`   KAM: ${sample.kam_name} (${sample.kam_email_id})`);
      console.log(`   Zone: ${sample.zone}, State: ${sample.brand_state}`);
      console.log(`   Duplicate count: ${records.length} identical records`);
      console.log(`   IDs: ${records.map(r => r.id.substring(0, 8)).join(', ')}...`);
      console.log(`   Created: ${records.map(r => new Date(r.created_at).toLocaleDateString()).join(', ')}`);
      console.log(`   → Will keep: ${records[0].id.substring(0, 8)} (oldest)`);
      console.log(`   → Will delete: ${records.length - 1} record(s)`);
    });
  }

  // Collect IDs to delete (keep oldest, delete rest)
  const idsToDelete = [];
  duplicateGroups.forEach(([_, records]) => {
    // records are already sorted by created_at (ascending)
    // Keep first (oldest), delete rest
    const toDelete = records.slice(1);
    idsToDelete.push(...toDelete.map(r => r.id));
  });

  console.log(`\n📊 Summary:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total records: ${allRecords.length}`);
  console.log(`Unique records: ${exactDuplicateMap.size}`);
  console.log(`Duplicate records: ${totalDuplicateRecords}`);
  console.log(`Records to delete: ${idsToDelete.length}`);
  console.log(`Final count: ${allRecords.length - idsToDelete.length}`);

  if (!dryRun && idsToDelete.length > 0) {
    console.log(`\n⚠️  Proceeding with deletion...\n`);
    
    // Delete in batches
    const batchSize = 100;
    let deleted = 0;
    let errors = 0;
    
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);
      const { error } = await supabase
        .from('master_data')
        .delete()
        .in('id', batch);
      
      if (error) {
        console.error(`❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error);
        errors++;
        break;
      }
      
      deleted += batch.length;
      const progress = ((deleted / idsToDelete.length) * 100).toFixed(1);
      console.log(`✅ Progress: ${deleted}/${idsToDelete.length} (${progress}%)`);
    }
    
    if (errors === 0) {
      console.log(`\n✅ Deletion complete!`);
      
      // Verify final count
      const { count: finalCount } = await supabase
        .from('master_data')
        .select('*', { count: 'exact', head: true });
      
      console.log(`\n📊 Final Results:`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Records before: ${allRecords.length}`);
      console.log(`Records deleted: ${deleted}`);
      console.log(`Records now: ${finalCount}`);
      console.log(`Expected: ${allRecords.length - idsToDelete.length}`);
      console.log(`Match: ${finalCount === allRecords.length - idsToDelete.length ? '✅ Yes' : '❌ No'}`);
    } else {
      console.log(`\n❌ Deletion failed with errors`);
    }
  } else if (dryRun) {
    console.log(`\n💡 This was a DRY RUN - no changes were made`);
    console.log(`\nTo actually remove duplicates, run:`);
    console.log(`   node scripts/remove-exact-duplicates.js --delete`);
  } else {
    console.log(`\n✅ No duplicates found - database is clean!`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const shouldDelete = args.includes('--delete');
  
  await removeExactDuplicates(!shouldDelete);
}

main().catch(console.error);
