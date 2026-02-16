#!/usr/bin/env node
/**
 * One-Command Master Data Cleanup
 * 
 * This script provides an interactive way to clean up master_data duplicates
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fetchAllRecords() {
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

    if (error) throw error;

    if (data && data.length > 0) {
      allRecords = allRecords.concat(data);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

async function analyzeDuplicates(records) {
  const exactDuplicateMap = new Map();
  
  records.forEach(record => {
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

  const duplicateGroups = Array.from(exactDuplicateMap.entries())
    .filter(([_, records]) => records.length > 1);

  let totalDuplicates = 0;
  duplicateGroups.forEach(([_, records]) => {
    totalDuplicates += records.length - 1;
  });

  return { duplicateGroups, totalDuplicates, uniqueCount: exactDuplicateMap.size };
}

async function removeDuplicates(duplicateGroups) {
  const idsToDelete = [];
  duplicateGroups.forEach(([_, records]) => {
    idsToDelete.push(...records.slice(1).map(r => r.id));
  });

  const batchSize = 100;
  let deleted = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error } = await supabase
      .from('master_data')
      .delete()
      .in('id', batch);
    
    if (error) throw error;
    
    deleted += batch.length;
    const progress = ((deleted / idsToDelete.length) * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${deleted}/${idsToDelete.length} (${progress}%)   `);
  }
  
  console.log('');
  return deleted;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║        Master Data Cleanup - Interactive Mode         ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Fetch records
    console.log('📥 Step 1: Fetching all records...');
    const allRecords = await fetchAllRecords();
    console.log(`   ✅ Fetched ${allRecords.length} records\n`);

    // Step 2: Analyze
    console.log('🔍 Step 2: Analyzing for duplicates...');
    const { duplicateGroups, totalDuplicates, uniqueCount } = await analyzeDuplicates(allRecords);
    console.log(`   ✅ Analysis complete\n`);

    // Step 3: Show results
    console.log('📊 Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Current records:      ${allRecords.length}`);
    console.log(`   Duplicate groups:     ${duplicateGroups.length}`);
    console.log(`   Duplicate records:    ${totalDuplicates}`);
    console.log(`   Unique records:       ${uniqueCount}`);
    console.log(`   After cleanup:        ${allRecords.length - totalDuplicates}`);
    console.log('');

    if (totalDuplicates === 0) {
      console.log('✅ No duplicates found! Your database is clean.\n');
      rl.close();
      return;
    }

    // Show examples
    console.log('📋 Top 5 Duplicate Examples:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    duplicateGroups.slice(0, 5).forEach(([_, records], index) => {
      const sample = records[0];
      console.log(`\n${index + 1}. ${sample.brand_name}`);
      console.log(`   KAM: ${sample.kam_name}`);
      console.log(`   Duplicates: ${records.length} identical records`);
      console.log(`   Will keep oldest, delete ${records.length - 1} record(s)`);
    });
    console.log('');

    // Step 4: Ask for confirmation
    const answer = await question('\n❓ Do you want to remove these duplicates? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('\n❌ Cleanup cancelled. No changes were made.\n');
      rl.close();
      return;
    }

    // Step 5: Remove duplicates
    console.log('\n🗑️  Step 3: Removing duplicates...');
    const deleted = await removeDuplicates(duplicateGroups);
    console.log(`   ✅ Deleted ${deleted} duplicate records\n`);

    // Step 6: Verify
    console.log('✅ Step 4: Verifying...');
    const { count: finalCount } = await supabase
      .from('master_data')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   ✅ Final count: ${finalCount} records\n`);

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                  Cleanup Complete! ✅                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`   Before:  ${allRecords.length} records`);
    console.log(`   Deleted: ${deleted} duplicates`);
    console.log(`   After:   ${finalCount} records`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nPlease check your .env.local file and Supabase connection.\n');
  } finally {
    rl.close();
  }
}

main();
