/**
 * Update User Roles and Teams Script
 * 
 * Updates user profiles with correct roles and team assignments
 * 
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/update-user-roles.ts
 */

// @ts-nocheck
import * as dotenv from 'dotenv';
import { createServiceRoleClient } from '../lib/supabase-server';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface UserUpdate {
  email: string;
  full_name: string;
  role: string;
  team_name: string | null;
}

const USERS_TO_UPDATE: UserUpdate[] = [
  {
    email: 'shaikh.farhan@petpooja.com',
    full_name: 'Shaikh Mohammad Farhan',
    role: 'team_lead',
    team_name: 'South_1 Team'
  },
  {
    email: 'helly.gandhi@petpooja.com',
    full_name: 'Helly Gandhi',
    role: 'admin',
    team_name: null
  },
  {
    email: 'sagar.kothari@petpooja.com',
    full_name: 'Sagar Prakashkumar Kothari',
    role: 'team_lead',
    team_name: 'South_2 Team'
  },
  {
    email: 'snehal.dwivedi@petpooja.com',
    full_name: 'Dwivedi Snehal',
    role: 'team_lead',
    team_name: 'North-East Team'
  },
  {
    email: 'pratham.vora@petpooja.com',
    full_name: 'Pratham Jatilbhai Vora',
    role: 'admin',
    team_name: null
  },
  {
    email: 'ranjan.singh@petpooja.com',
    full_name: 'Ranjan Singh',
    role: 'admin',
    team_name: 'BO Team'
  },
  {
    email: 'akash.yedur@petpooja.com',
    full_name: 'Akash Yedur',
    role: 'team_lead',
    team_name: 'BO Team'
  },
  {
    email: 'manisha.balotiya@petpooja.com',
    full_name: 'Manisha Balotiya',
    role: 'team_lead',
    team_name: 'Central-West Team'
  }
];

async function updateUserRoles() {
  console.log('🚀 Starting user roles and teams update...\n');
  
  const supabase = createServiceRoleClient();
  
  let successCount = 0;
  let failCount = 0;
  let notFoundCount = 0;
  const failedUsers: string[] = [];
  const notFoundUsers: string[] = [];
  
  for (const user of USERS_TO_UPDATE) {
    try {
      console.log(`\n🔄 Processing: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Team: ${user.team_name || 'None'}`);
      
      // Check if user exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id, email, role, team_name')
        .eq('email', user.email)
        .single();
      
      if (fetchError || !existingProfile) {
        console.log(`  ⚠️  User not found: ${user.email}`);
        notFoundCount++;
        notFoundUsers.push(user.email);
        continue;
      }
      
      console.log(`  ✅ Found user profile`);
      
      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          full_name: user.full_name,
          role: user.role,
          team_name: user.team_name,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);
      
      if (updateError) {
        console.error(`  ❌ Failed to update:`, updateError.message);
        failCount++;
        failedUsers.push(user.email);
        continue;
      }
      
      console.log(`  ✅ Updated successfully`);
      successCount++;
      
    } catch (error) {
      console.error(`  ❌ Error processing ${user.email}:`, error);
      failCount++;
      failedUsers.push(user.email);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Update Summary');
  console.log('='.repeat(60));
  console.log(`Total users to update: ${USERS_TO_UPDATE.length}`);
  console.log(`✅ Successfully updated: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Not found: ${notFoundCount}`);
  
  if (notFoundUsers.length > 0) {
    console.log('\n⚠️  Users not found in database:');
    notFoundUsers.forEach(email => console.log(`  - ${email}`));
  }
  
  if (failedUsers.length > 0) {
    console.log('\n❌ Failed to update:');
    failedUsers.forEach(email => console.log(`  - ${email}`));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Update complete!');
  console.log('='.repeat(60));
  
  if (successCount > 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Verify user roles in the application');
    console.log('2. Test team-based access control');
    console.log('3. Ensure RLS policies work correctly');
  }
}

// Run update
updateUserRoles()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
