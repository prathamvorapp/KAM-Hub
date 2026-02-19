/**
 * Link Existing Auth Users Script
 * 
 * Links existing Supabase Auth users to user_profiles table
 * Use this when users are already created in Supabase Auth
 * 
 * Usage:
 *   npx ts-node scripts/link-existing-auth-users.ts
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

async function linkAuthUsers() {
  console.log('🚀 Starting to link existing Supabase Auth users...\n');
  
  const supabase = createServiceRoleClient();
  
  // Get all Supabase Auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError);
    return;
  }
  
  if (!authData?.users || authData.users.length === 0) {
    console.log('❌ No auth users found in Supabase Auth');
    return;
  }
  
  console.log(`📊 Found ${authData.users.length} auth users\n`);
  
  // Get all user profiles without auth_id
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .is('auth_id', null);
  
  if (profileError) {
    console.error('❌ Error fetching user profiles:', profileError);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('✅ All user profiles already have auth_id. Nothing to link.');
    return;
  }
  
  console.log(`📊 Found ${profiles.length} profiles without auth_id\n`);
  
  let successCount = 0;
  let failCount = 0;
  const failedUsers: string[] = [];
  const notFoundUsers: string[] = [];
  
  for (const profile of profiles as UserProfile[]) {
    try {
      console.log(`\n🔄 Processing: ${profile.email}`);
      
      // Find matching auth user by email
      const authUser = authData.users.find(u => u.email?.toLowerCase() === profile.email.toLowerCase());
      
      if (!authUser) {
        console.log(`  ⚠️  No auth user found for ${profile.email}`);
        notFoundUsers.push(profile.email);
        continue;
      }
      
      console.log(`  ✅ Found auth user: ${authUser.id}`);
      
      // Update user_profiles with auth_id
      const updateData: { auth_id: string } = { auth_id: authUser.id };
      const { error: updateError } = await (supabase
        .from('user_profiles')
        .update(updateData as any)
        .eq('id', profile.id) as any);
      
      if (updateError) {
        console.error(`  ❌ Failed to update profile:`, updateError.message);
        failCount++;
        failedUsers.push(profile.email);
        continue;
      }
      
      console.log(`  ✅ Linked profile to auth_id: ${authUser.id}`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ Error processing ${profile.email}:`, error);
      failCount++;
      failedUsers.push(profile.email);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Linking Summary');
  console.log('='.repeat(60));
  console.log(`Total profiles to link: ${profiles.length}`);
  console.log(`✅ Successfully linked: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  No auth user found: ${notFoundUsers.length}`);
  
  if (notFoundUsers.length > 0) {
    console.log('\n⚠️  Profiles without matching auth user:');
    notFoundUsers.forEach(email => console.log(`  - ${email}`));
    console.log('\n💡 These users need to be created in Supabase Auth first.');
  }
  
  if (failedUsers.length > 0) {
    console.log('\n❌ Failed to link:');
    failedUsers.forEach(email => console.log(`  - ${email}`));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Linking complete!');
  console.log('='.repeat(60));
  
  if (successCount > 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Test login with linked users');
    console.log('2. Verify sessions work correctly');
    console.log('3. Check role-based access control');
    console.log('4. After successful testing, you can remove the password column');
  }
}

// Run linking
linkAuthUsers()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
