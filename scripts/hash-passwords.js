/**
 * Hash all plaintext passwords in user_profiles table
 * This will convert "Test@123" to bcrypt hashes
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function hashPasswords() {
  console.log('🔐 Starting Password Hashing');
  console.log('━'.repeat(60));

  // Get all users
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, email, password');

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  console.log(`📦 Found ${users.length} users`);

  let hashed = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    try {
      console.log(`\n👤 ${user.email}`);

      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      const isAlreadyHashed = user.password && (
        user.password.startsWith('$2a$') || 
        user.password.startsWith('$2b$') ||
        user.password.startsWith('$2y$')
      );

      if (isAlreadyHashed) {
        console.log('  ✅ Already hashed, skipping');
        skipped++;
        continue;
      }

      if (!user.password) {
        console.log('  ⚠️  No password set');
        skipped++;
        continue;
      }

      // Hash the plaintext password
      console.log(`  🔒 Hashing password: "${user.password}"`);
      const passwordHash = await bcrypt.hash(user.password, 10);
      console.log(`  📝 Hash: ${passwordHash.substring(0, 20)}...`);

      // Update the user with hashed password
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ password: passwordHash })
        .eq('id', user.id);

      if (updateError) {
        console.error('  ❌ Error updating:', updateError.message);
        errors++;
      } else {
        console.log('  ✅ Password hashed successfully');
        hashed++;
      }

    } catch (error) {
      console.error(`  ❌ Exception:`, error.message);
      errors++;
    }
  }

  console.log('\n━'.repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✅ Hashed: ${hashed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📦 Total: ${users.length}`);
  console.log('━'.repeat(60));

  // Test login with one user
  if (hashed > 0) {
    console.log('\n🧪 Testing login with rahul.taak@petpooja.com...');
    
    const { data: testUser } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'rahul.taak@petpooja.com')
      .single();

    if (testUser) {
      const testPassword = 'Test@123';
      const isValid = await bcrypt.compare(testPassword, testUser.password);
      
      if (isValid) {
        console.log('✅ Login test PASSED! Password verification works.');
      } else {
        console.log('❌ Login test FAILED! Password verification not working.');
      }
    } else {
      console.log('⚠️  Test user not found');
    }
  }

  console.log('\n✅ Password hashing complete!');
  console.log('💡 You can now login with email and password "Test@123"');
}

hashPasswords().catch(console.error);
