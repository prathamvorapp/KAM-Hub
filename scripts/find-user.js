/**
 * Find a specific user in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findUser() {
  const searchEmail = 'pratham.vora@petpooja.com';
  
  console.log(`🔍 Searching for: ${searchEmail}`);
  console.log('━'.repeat(60));

  // Search for exact match
  const { data: exact, error: exactError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', searchEmail);

  console.log('\n1️⃣ Exact match search:');
  if (exactError) {
    console.error('❌ Error:', exactError);
  } else if (!exact || exact.length === 0) {
    console.log('❌ User not found');
  } else {
    console.log('✅ Found:', exact.length, 'user(s)');
    exact.forEach(u => {
      console.log(`  - ${u.email} (${u.role}) - Active: ${u.is_active}`);
    });
  }

  // Search for similar emails
  const { data: similar, error: similarError } = await supabase
    .from('user_profiles')
    .select('email, full_name, role, is_active')
    .ilike('email', '%pratham%');

  console.log('\n2️⃣ Similar emails (contains "pratham"):');
  if (similarError) {
    console.error('❌ Error:', similarError);
  } else if (!similar || similar.length === 0) {
    console.log('❌ No similar users found');
  } else {
    console.log('✅ Found:', similar.length, 'user(s)');
    similar.forEach(u => {
      console.log(`  - ${u.email} (${u.full_name}) - ${u.role} - Active: ${u.is_active}`);
    });
  }

  // List all users
  const { data: allUsers, error: allError } = await supabase
    .from('user_profiles')
    .select('email, full_name, role, is_active')
    .order('email');

  console.log('\n3️⃣ All users in database:');
  if (allError) {
    console.error('❌ Error:', allError);
  } else {
    console.log(`✅ Total users: ${allUsers?.length || 0}`);
    if (allUsers && allUsers.length > 0) {
      console.log('\n📋 User list:');
      allUsers.forEach((u, i) => {
        console.log(`${(i+1).toString().padStart(3)}. ${u.email.padEnd(40)} ${u.role.padEnd(12)} Active: ${u.is_active}`);
      });
    }
  }

  console.log('\n━'.repeat(60));
}

findUser().catch(console.error);
