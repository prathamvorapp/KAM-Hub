/**
 * Check Actual Master Data Count
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCount() {
  console.log('🔍 Checking actual master_data count...\n');

  // Method 1: Count with head
  const { count: headCount, error: headError } = await supabase
    .from('master_data')
    .select('*', { count: 'exact', head: true });

  console.log(`Method 1 (head count): ${headCount}`);

  // Method 2: Fetch all with pagination
  let allRecords = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('master_data')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error:', error);
      break;
    }

    if (data && data.length > 0) {
      allRecords = allRecords.concat(data);
      console.log(`Fetched page ${page + 1}: ${data.length} records (total so far: ${allRecords.length})`);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  console.log(`\nMethod 2 (fetch all): ${allRecords.length} records`);
  console.log(`\n📊 Summary:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Actual count: ${headCount || allRecords.length}`);
  console.log(`Expected: 1,390`);
  console.log(`Difference: ${(headCount || allRecords.length) - 1390}`);

  // Check for duplicates in all records
  if (allRecords.length > 0) {
    const exactDuplicateMap = new Map();
    
    allRecords.forEach(record => {
      const key = JSON.stringify({
        brand_name: record.brand_name,
        brand_email_id: record.brand_email_id || null,
        kam_name: record.kam_name,
        kam_email_id: record.kam_email_id,
        brand_state: record.brand_state,
        zone: record.zone,
        outlet_counts: record.outlet_counts
      });
      
      if (!exactDuplicateMap.has(key)) {
        exactDuplicateMap.set(key, []);
      }
      exactDuplicateMap.get(key).push(record);
    });

    const duplicateGroups = Array.from(exactDuplicateMap.entries())
      .filter(([_, records]) => records.length > 1);

    console.log(`\nDuplicate Analysis:`);
    console.log(`Exact duplicate groups: ${duplicateGroups.length}`);
    
    let totalDupes = 0;
    duplicateGroups.forEach(([_, records]) => {
      totalDupes += records.length - 1;
    });
    
    console.log(`Total duplicate records: ${totalDupes}`);
    console.log(`Unique records: ${exactDuplicateMap.size}`);
    console.log(`After cleanup: ${allRecords.length - totalDupes}`);
  }
}

checkCount().catch(console.error);
