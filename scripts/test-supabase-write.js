/**
 * Test Supabase write permissions
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection & Permissions');
console.log('━'.repeat(60));
console.log('URL:', supabaseUrl);
console.log('Has Anon Key:', !!anonKey);
console.log('Has Service Key:', !!serviceKey);
console.log('━'.repeat(60));

async function testWithAnonKey() {
  console.log('\n1️⃣ Testing with ANON key...');
  const supabase = createClient(supabaseUrl, anonKey);

  // Try to read
  const { data: readData, error: readError } = await supabase
    .from('user_profiles')
    .select('count');

  if (readError) {
    console.log('❌ Read failed:', readError.message);
  } else {
    console.log('✅ Read successful');
  }

  // Try to insert
  const { data: insertData, error: insertError } = await supabase
    .from('user_profiles')
    .insert({
      email: 'test@example.com',
      full_name: 'Test User',
      password: 'test123',
      role: 'Agent',
      is_active: true
    })
    .select();

  if (insertError) {
    console.log('❌ Insert failed:', insertError.message);
    console.log('   Code:', insertError.code);
    console.log('   Details:', insertError.details);
  } else {
    console.log('✅ Insert successful');
    
    // Clean up
    await supabase
      .from('user_profiles')
      .delete()
      .eq('email', 'test@example.com');
  }
}

async function testWithServiceKey() {
  if (!serviceKey) {
    console.log('\n2️⃣ Service key not available, skipping...');
    return;
  }

  console.log('\n2️⃣ Testing with SERVICE ROLE key...');
  const supabase = createClient(supabaseUrl, serviceKey);

  // Try to read
  const { data: readData, error: readError } = await supabase
    .from('user_profiles')
    .select('*');

  if (readError) {
    console.log('❌ Read failed:', readError.message);
  } else {
    console.log('✅ Read successful - Found', readData?.length || 0, 'users');
  }

  // Try to insert
  const { data: insertData, error: insertError } = await supabase
    .from('user_profiles')
    .insert({
      email: 'test@example.com',
      full_name: 'Test User',
      password: 'test123',
      role: 'Agent',
      is_active: true
    })
    .select();

  if (insertError) {
    console.log('❌ Insert failed:', insertError.message);
    console.log('   Code:', insertError.code);
  } else {
    console.log('✅ Insert successful');
    console.log('   User ID:', insertData[0]?.id);
    
    // Clean up
    const { error: deleteError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('email', 'test@example.com');
    
    if (deleteError) {
      console.log('⚠️  Cleanup failed:', deleteError.message);
    } else {
      console.log('✅ Cleanup successful');
    }
  }
}

async function checkRLS() {
  console.log('\n3️⃣ Checking RLS policies...');
  const supabase = createClient(supabaseUrl, serviceKey || anonKey);

  const { data, error } = await supabase
    .rpc('pg_get_tabledef', { tablename: 'user_profiles' })
    .single();

  if (error) {
    console.log('⚠️  Cannot check RLS (this is normal)');
  } else {
    console.log('Table definition:', data);
  }
}

async function run() {
  await testWithAnonKey();
  await testWithServiceKey();
  await checkRLS();
  
  console.log('\n━'.repeat(60));
  console.log('💡 Recommendation:');
  console.log('   If inserts are failing, you need to:');
  console.log('   1. Disable RLS on user_profiles table, OR');
  console.log('   2. Add RLS policies to allow inserts, OR');
  console.log('   3. Use SERVICE_ROLE_KEY for admin operations');
  console.log('━'.repeat(60));
}

run().catch(console.error);
