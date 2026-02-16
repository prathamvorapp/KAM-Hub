/**
 * Master Data Count Investigation Script
 * 
 * This script investigates why there are 2,129 records instead of 1,390
 * Possible reasons:
 * 1. Multiple KAMs per brand (legitimate)
 * 2. Different zones/states for same brand
 * 3. Data import issues
 * 4. Expected count might be outdated
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

async function investigateCount() {
  console.log('🔍 Investigating master_data record count discrepancy...\n');

  // Get all records
  const { data: allRecords, error } = await supabase
    .from('master_data')
    .select('*')
    .order('brand_name');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Total Records: ${allRecords.length}`);
  console.log(`📊 Expected: 1,390`);
  console.log(`📊 Difference: ${allRecords.length - 1390}\n`);

  // 1. Count unique brands
  const uniqueBrands = new Set(allRecords.map(r => r.brand_name));
  console.log(`📌 Unique Brand Names: ${uniqueBrands.size}`);

  // 2. Count unique brand emails
  const uniqueBrandEmails = new Set(
    allRecords
      .filter(r => r.brand_email_id)
      .map(r => r.brand_email_id)
  );
  console.log(`📌 Unique Brand Emails: ${uniqueBrandEmails.size}`);

  // 3. Count unique brand + KAM combinations
  const uniqueCombos = new Set(
    allRecords.map(r => `${r.brand_name}|||${r.kam_email_id}`)
  );
  console.log(`📌 Unique Brand + KAM Combinations: ${uniqueCombos.size}`);

  // 4. Brands with multiple KAMs
  const brandKamMap = new Map();
  allRecords.forEach(r => {
    if (!brandKamMap.has(r.brand_name)) {
      brandKamMap.set(r.brand_name, new Set());
    }
    brandKamMap.get(r.brand_name).add(r.kam_email_id);
  });

  const brandsWithMultipleKams = Array.from(brandKamMap.entries())
    .filter(([_, kams]) => kams.size > 1)
    .sort((a, b) => b[1].size - a[1].size);

  console.log(`\n📌 Brands with Multiple KAMs: ${brandsWithMultipleKams.length}`);
  
  if (brandsWithMultipleKams.length > 0) {
    console.log(`\n📋 Top 20 Brands with Multiple KAMs:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    brandsWithMultipleKams.slice(0, 20).forEach(([brand, kams], index) => {
      const records = allRecords.filter(r => r.brand_name === brand);
      console.log(`\n${index + 1}. ${brand}`);
      console.log(`   KAM Count: ${kams.size}`);
      console.log(`   Total Records: ${records.length}`);
      records.forEach(r => {
        console.log(`   - ${r.kam_name} (${r.kam_email_id}) - Zone: ${r.zone}, State: ${r.brand_state}`);
      });
    });
  }

  // 5. Brands with multiple zones/states
  const brandLocationMap = new Map();
  allRecords.forEach(r => {
    const key = `${r.brand_name}|||${r.kam_email_id}`;
    if (!brandLocationMap.has(key)) {
      brandLocationMap.set(key, new Set());
    }
    brandLocationMap.get(key).add(`${r.zone}|||${r.brand_state}`);
  });

  const brandsWithMultipleLocations = Array.from(brandLocationMap.entries())
    .filter(([_, locations]) => locations.size > 1);

  console.log(`\n📌 Brand+KAM with Multiple Zones/States: ${brandsWithMultipleLocations.length}`);

  // 6. Calculate what the count should be
  let totalRecordsNeeded = 0;
  brandKamMap.forEach((kams, brand) => {
    totalRecordsNeeded += kams.size; // One record per brand-KAM combination
  });

  console.log(`\n📊 Analysis Summary:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Current total records: ${allRecords.length}`);
  console.log(`Unique brands: ${uniqueBrands.size}`);
  console.log(`Brands with multiple KAMs: ${brandsWithMultipleKams.length}`);
  console.log(`Expected records (1 per brand-KAM): ${totalRecordsNeeded}`);
  console.log(`\nIf expected count is 1,390:`);
  console.log(`  - Current: ${allRecords.length}`);
  console.log(`  - Expected: 1,390`);
  console.log(`  - Difference: ${allRecords.length - 1390}`);
  console.log(`\nPossible explanations:`);
  console.log(`  1. Multiple KAMs per brand (${brandsWithMultipleKams.length} brands)`);
  console.log(`  2. Expected count (1,390) might be outdated`);
  console.log(`  3. Data was imported multiple times`);
  console.log(`  4. Brands expanded to new zones/regions`);

  // 7. Check for recent imports
  const recordsByDate = new Map();
  allRecords.forEach(r => {
    const date = new Date(r.created_at).toLocaleDateString();
    recordsByDate.set(date, (recordsByDate.get(date) || 0) + 1);
  });

  console.log(`\n📅 Records by Creation Date:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  Array.from(recordsByDate.entries())
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .forEach(([date, count]) => {
      console.log(`${date}: ${count} records`);
    });

  // 8. Check for exact duplicates (all fields)
  const exactDuplicateMap = new Map();
  allRecords.forEach(r => {
    const key = JSON.stringify({
      brand_name: r.brand_name,
      brand_email_id: r.brand_email_id,
      kam_name: r.kam_name,
      kam_email_id: r.kam_email_id,
      brand_state: r.brand_state,
      zone: r.zone,
      outlet_counts: r.outlet_counts
    });
    if (!exactDuplicateMap.has(key)) {
      exactDuplicateMap.set(key, []);
    }
    exactDuplicateMap.get(key).push(r);
  });

  const exactDuplicates = Array.from(exactDuplicateMap.entries())
    .filter(([_, records]) => records.length > 1);

  console.log(`\n📌 Exact Duplicates (all fields match): ${exactDuplicates.length}`);
  
  if (exactDuplicates.length > 0) {
    console.log(`\n⚠️  Found ${exactDuplicates.length} groups of exact duplicates!`);
    let totalExactDupes = 0;
    exactDuplicates.forEach(([_, records]) => {
      totalExactDupes += records.length - 1;
    });
    console.log(`   Total duplicate records: ${totalExactDupes}`);
    console.log(`   After removing: ${allRecords.length - totalExactDupes} records`);
  }

  // 9. Recommendation
  console.log(`\n💡 Recommendations:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  if (exactDuplicates.length > 0) {
    console.log(`✅ Remove ${exactDuplicates.length} exact duplicate groups`);
  }
  
  if (brandsWithMultipleKams.length > 0) {
    console.log(`⚠️  Review ${brandsWithMultipleKams.length} brands with multiple KAMs`);
    console.log(`   (These might be legitimate if brands have multiple territories)`);
  }
  
  if (allRecords.length - 1390 > exactDuplicates.length) {
    console.log(`ℹ️  The expected count of 1,390 might need to be updated`);
    console.log(`   Current unique brand-KAM combinations: ${totalRecordsNeeded}`);
  }
}

investigateCount().catch(console.error);
