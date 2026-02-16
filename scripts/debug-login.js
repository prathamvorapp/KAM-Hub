/**
 * Debug Login Issue
 * Tests if user exists and password verification works
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLogin() {
  const testEmail = 'rahul.taak@petpooja.com';
  const testPassword = 'Test@123';

  console.log('🔍 Debugging login for:', testEmail);
  console.log('━'.repeat(60));

  // Step 1: Check if user exists
  console.log('\n1️⃣ Checking if user exists...');
  const { data: users, error: searchError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', testEmail);

  if (searchError) {
    console.error('❌ Error searching for user:', searchError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('❌ User not found in database');
    console.log('\n💡 Available users:');
    const { data: allUsers } = await supabase
      .from('user_profiles')
      .select('email, full_name, role, is_active')
      .limit(10);
    console.table(allUsers);
    return;
  }

  console.log(`✅ Found ${users.length} user(s) with this email`);
  const user = users[0];
  
  console.log('\n📋 User Details:');
  console.log('  Email:', user.email);
  console.log('  Name:', user.full_name);
  console.log('  Role:', user.role);
  console.log('  Team:', user.team_name);
  console.log('  Active:', user.is_active);
  console.log('  Has Password Hash:', !!user.password_hash);
  console.log('  Password Hash Length:', user.password_hash?.length || 0);

  // Step 2: Check if user is active
  console.log('\n2️⃣ Checking if user is active...');
  if (!user.is_active) {
    console.log('❌ User is INACTIVE');
    return;
  }
  console.log('✅ User is active');

  // Step 3: Check password hash
  console.log('\n3️⃣ Checking password hash...');
  if (!user.password_hash) {
    console.log('❌ No password hash found for user');
    console.log('💡 User needs to set a password');
    return;
  }
  console.log('✅ Password hash exists');
  console.log('  Hash preview:', user.password_hash.substring(0, 20) + '...');

  // Step 4: Verify password
  console.log('\n4️⃣ Verifying password...');
  console.log('  Testing password:', testPassword);
  
  try {
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    
    if (isValid) {
      console.log('✅ Password is CORRECT!');
      console.log('\n🎉 Login should work. Check these:');
      console.log('  1. Is the API route receiving the correct email?');
      console.log('  2. Is there any input sanitization removing characters?');
      console.log('  3. Check browser console for the exact email being sent');
    } else {
      console.log('❌ Password is INCORRECT');
      console.log('\n💡 Possible issues:');
      console.log('  1. Password might be different than expected');
      console.log('  2. Password hash might be corrupted');
      console.log('  3. Try resetting the password');
      
      // Test if we can create a new hash
      console.log('\n🔧 Creating test hash for comparison...');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('  New hash:', newHash.substring(0, 20) + '...');
      const testVerify = await bcrypt.compare(testPassword, newHash);
      console.log('  Test verify:', testVerify ? '✅ Works' : '❌ Failed');
    }
  } catch (error) {
    console.error('❌ Error verifying password:', error);
  }

  // Step 5: Check column name
  console.log('\n5️⃣ Checking database schema...');
  const { data: columns, error: schemaError } = await supabase
    .from('user_profiles')
    .select('*')
    .limit(1);
  
  if (columns && columns.length > 0) {
    console.log('✅ Available columns:', Object.keys(columns[0]).join(', '));
  }

  console.log('\n━'.repeat(60));
  console.log('Debug complete!');
}

debugLogin().catch(console.error);
