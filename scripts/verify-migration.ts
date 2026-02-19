/**
 * Verify Migration Script
 * 
 * Verifies that the Supabase Auth migration is complete and working
 * 
 * Usage:
 *   npx ts-node scripts/verify-migration.ts
 */

// @ts-nocheck
import * as dotenv from 'dotenv';
import { createServiceRoleClient } from '../lib/supabase-server';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function verifyMigration() {
  console.log('🔍 Verifying Supabase Auth migration...\n');
  
  const supabase = createServiceRoleClient();
  
  // Check 1: Get all user profiles
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, email, auth_id, is_active, role');
  
  if (profileError) {
    console.error('❌ Error fetching user profiles:', profileError);
    return;
  }
  
  console.log(`📊 Total user profiles: ${profiles?.length || 0}\n`);
  
  // Check 2: Count profiles with auth_id
  const profilesWithAuthId = profiles?.filter(p => p.auth_id) || [];
  const profilesWithoutAuthId = profiles?.filter(p => !p.auth_id) || [];
  
  console.log('✅ Profiles with auth_id:', profilesWithAuthId.length);
  console.log('❌ Profiles without auth_id:', profilesWithoutAuthId.length);
  
  if (profilesWithoutAuthId.length > 0) {
    console.log('\n⚠️  Profiles missing auth_id:');
    profilesWithoutAuthId.forEach(p => {
      console.log(`  - ${p.email} (${p.role})`);
    });
  }
  
  // Check 3: Get all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    console.error('\n❌ Error fetching auth users:', authError);
    return;
  }
  
  console.log(`\n📊 Total Supabase Auth users: ${authData?.users.length || 0}`);
  
  // Check 4: Verify each profile has matching auth user
  console.log('\n🔍 Verifying profile-auth user mapping...\n');
  
  let validMappings = 0;
  let invalidMappings = 0;
  const issues: string[] = [];
  
  for (const profile of profilesWithAuthId) {
    const authUser = authData?.users.find(u => u.id === profile.auth_id);
    
    if (!authUser) {
      invalidMappings++;
      issues.push(`Profile ${profile.email} has auth_id ${profile.auth_id} but no matching auth user found`);
    } else if (authUser.email?.toLowerCase() !== profile.email.toLowerCase()) {
      invalidMappings++;
      issues.push(`Email mismatch: Profile ${profile.email} linked to auth user ${authUser.email}`);
    } else {
      validMappings++;
    }
  }
  
  console.log('✅ Valid mappings:', validMappings);
  console.log('❌ Invalid mappings:', invalidMappings);
  
  if (issues.length > 0) {
    console.log('\n⚠️  Issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
  
  // Check 5: Find orphaned auth users (auth users without profiles)
  const orphanedAuthUsers = authData?.users.filter(authUser => {
    return !profiles?.some(p => p.auth_id === authUser.id);
  }) || [];
  
  if (orphanedAuthUsers.length > 0) {
    console.log(`\n⚠️  Orphaned auth users (${orphanedAuthUsers.length}):`);
    orphanedAuthUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.id})`);
    });
    console.log('💡 These auth users have no corresponding user_profile');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Verification Summary');
  console.log('='.repeat(60));
  console.log(`User Profiles: ${profiles?.length || 0}`);
  console.log(`Auth Users: ${authData?.users.length || 0}`);
  console.log(`Profiles with auth_id: ${profilesWithAuthId.length}`);
  console.log(`Profiles without auth_id: ${profilesWithoutAuthId.length}`);
  console.log(`Valid mappings: ${validMappings}`);
  console.log(`Invalid mappings: ${invalidMappings}`);
  console.log(`Orphaned auth users: ${orphanedAuthUsers.length}`);
  
  const allGood = 
    profilesWithoutAuthId.length === 0 && 
    invalidMappings === 0 && 
    orphanedAuthUsers.length === 0;
  
  if (allGood) {
    console.log('\n✅ Migration is complete and verified!');
    console.log('🎉 All user profiles are correctly linked to Supabase Auth users.');
  } else {
    console.log('\n⚠️  Migration has issues that need to be resolved.');
    console.log('📝 Review the issues above and run the appropriate scripts.');
  }
  
  console.log('='.repeat(60));
}

// Run verification
verifyMigration()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
