/**
 * Import Users from Convex Backup to Supabase
 * Hashes passwords with bcrypt during import
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importUsers() {
  console.log('🚀 Starting User Import from Convex Backup');
  console.log('━'.repeat(60));

  // Read backup file
  const backupPath = path.join(__dirname, '../convex_backups/user_profiles_backup_2026-02-05_07-54-39-688Z.json');
  
  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found:', backupPath);
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`📦 Found ${backupData.length} users in backup`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of backupData) {
    try {
      console.log(`\n👤 Processing: ${user.email}`);

      // Check if user already exists
      const { data: existing } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('email', user.email)
        .single();

      if (existing) {
        console.log('  ⏭️  Already exists, skipping');
        skipped++;
        continue;
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(user.password, 10);

      // Prepare user data
      const userData = {
        email: user.email,
        full_name: user.full_name,
        password_hash: passwordHash,
        role: user.role,
        team_name: user.team_name || null,
        contact_number: user.contact_number || null,
        employee_code: user.employee_code || null,
        is_active: user.is_active !== false,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || new Date().toISOString()
      };

      // Insert user
      const { error } = await supabase
        .from('user_profiles')
        .insert(userData);

      if (error) {
        console.error('  ❌ Error:', error.message);
        errors++;
      } else {
        console.log(`  ✅ Imported (Role: ${user.role})`);
        imported++;
      }

    } catch (error) {
      console.error(`  ❌ Exception:`, error.message);
      errors++;
    }
  }

  console.log('\n━'.repeat(60));
  console.log('📊 Import Summary:');
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log(`  📦 Total: ${backupData.length}`);
  console.log('━'.repeat(60));

  // Verify import
  console.log('\n🔍 Verifying import...');
  const { data: allUsers, error: verifyError } = await supabase
    .from('user_profiles')
    .select('email, role, is_active')
    .order('role');

  if (verifyError) {
    console.error('❌ Verification error:', verifyError);
  } else {
    console.log(`✅ Total users in database: ${allUsers?.length || 0}`);
    
    // Count by role
    const roleCount = {};
    allUsers?.forEach(u => {
      roleCount[u.role] = (roleCount[u.role] || 0) + 1;
    });
    
    console.log('\n📊 Users by role:');
    Object.entries(roleCount).forEach(([role, count]) => {
      console.log(`  ${role}: ${count}`);
    });
  }

  console.log('\n✅ Import complete!');
}

importUsers().catch(console.error);
