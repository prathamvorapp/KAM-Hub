/**
 * Check Database Tables and Data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Checking Supabase Database');
  console.log('━'.repeat(60));
  console.log('URL:', supabaseUrl);
  console.log('━'.repeat(60));

  // Check user_profiles
  console.log('\n📊 Checking user_profiles table...');
  const { data: users, error: userError, count } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact' });

  if (userError) {
    console.error('❌ Error:', userError.message);
    console.error('Details:', userError);
  } else {
    console.log(`✅ Found ${users?.length || 0} users`);
    if (users && users.length > 0) {
      console.log('\n👥 Sample users:');
      users.slice(0, 5).forEach(u => {
        console.log(`  - ${u.email} (${u.role}) - Active: ${u.is_active}`);
      });
    }
  }

  // Check master_data
  console.log('\n📊 Checking master_data table...');
  const { data: brands, error: brandError } = await supabase
    .from('master_data')
    .select('*')
    .limit(5);

  if (brandError) {
    console.error('❌ Error:', brandError.message);
  } else {
    console.log(`✅ Found ${brands?.length || 0} records (showing first 5)`);
    if (brands && brands.length > 0) {
      console.log('\n🏢 Sample brands:');
      brands.forEach(b => {
        console.log(`  - ${b.brand_name} (${b.kam_email_id})`);
      });
    }
  }

  // Check churn_records
  console.log('\n📊 Checking churn_records table...');
  const { data: churn, error: churnError } = await supabase
    .from('churn_records')
    .select('*')
    .limit(1);

  if (churnError) {
    console.error('❌ Error:', churnError.message);
  } else {
    console.log(`✅ Found ${churn?.length || 0} records`);
  }

  console.log('\n━'.repeat(60));
}

checkDatabase().catch(console.error);
