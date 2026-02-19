/**
 * User Migration Script
 * 
 * Migrates existing users from custom auth to Supabase Auth
 * 
 * Usage:
 *   npx ts-node scripts/migrate-users-to-supabase-auth.ts
 */

// @ts-nocheck
import * as dotenv from 'dotenv';
import { createServiceRoleClient } from '../lib/supabase-server';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team_name: string | null;
  auth_id: string | null;
  is_active: boolean;
}

async function migrateUsers() {
  console.log('🚀 Starting user migration to Supabase Auth...\n');
  
  const supabase = createServiceRoleClient();
  
  // Get all active users without auth_id
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('*')
    .is('auth_id', null)
    .eq('is_active', true);
  
  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log('✅ No users to migrate. All users already have auth_id.');
    return;
  }
  
  console.log(`📊 Found ${users.length} users to migrate\n`);
  
  let successCount = 0;
  let failCount = 0;
  const failedUsers: string[] = [];
  
  for (const user of users as UserProfile[]) {
    try {
      console.log(`\n🔄 Migrating: ${user.email}`);
      
      // Check if auth user already exists
      const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
      const authUserExists = existingAuthUser?.users.find(u => u.email === user.email);
      
      let authUserId: string;
      
      if (authUserExists) {
        console.log(`  ℹ️  Auth user already exists, linking...`);
        authUserId = authUserExists.id;
      } else {
        // Generate a temporary password
        const tempPassword = `Temp${Math.random().toString(36).substring(2, 15)}!${Date.now()}`;
        
        // Create Supabase Auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            full_name: user.full_name,
            role: user.role,
            team_name: user.team_name
          }
        });
        
        if (authError) {
          console.error(`  ❌ Failed to create auth user:`, authError.message);
          failCount++;
          failedUsers.push(user.email);
          continue;
        }
        
        if (!authUser.user) {
          console.error(`  ❌ No user returned from auth creation`);
          failCount++;
          failedUsers.push(user.email);
          continue;
        }
        
        authUserId = authUser.user.id;
        console.log(`  ✅ Created auth user: ${authUserId}`);
      }
      
      // Update user_profiles with auth_id
      const updateData: { auth_id: string } = { auth_id: authUserId };
      const { error: updateError } = await (supabase
        .from('user_profiles')
        .update(updateData as any)
        .eq('id', user.id) as any);
      
      if (updateError) {
        console.error(`  ❌ Failed to update profile:`, updateError.message);
        failCount++;
        failedUsers.push(user.email);
        continue;
      }
      
      console.log(`  ✅ Updated profile with auth_id`);
      
      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3022'}/reset-password`
      });
      
      if (resetError) {
        console.warn(`  ⚠️  Failed to send password reset email:`, resetError.message);
        // Don't fail the migration if email fails
      } else {
        console.log(`  📧 Password reset email sent`);
      }
      
      successCount++;
      console.log(`  ✅ Migration complete for ${user.email}`);
      
    } catch (error) {
      console.error(`  ❌ Error migrating ${user.email}:`, error);
      failCount++;
      failedUsers.push(user.email);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total users: ${users.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (failedUsers.length > 0) {
    console.log('\n❌ Failed users:');
    failedUsers.forEach(email => console.log(`  - ${email}`));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Migration complete!');
  console.log('='.repeat(60));
  
  if (successCount > 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Notify users to check their email for password reset link');
    console.log('2. Test login with migrated users');
    console.log('3. Monitor for any issues');
    console.log('4. After successful testing, remove password column from user_profiles');
  }
}

// Run migration
migrateUsers()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
