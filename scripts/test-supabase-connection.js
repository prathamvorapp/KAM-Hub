/**
 * Test Supabase Connection
 * 
 * Run this script to verify your Supabase connection is working
 * Usage: node scripts/test-supabase-connection.js
 */

require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('🔍 Testing Supabase Connection...\n');

  // Check environment variables
  console.log('📋 Checking environment variables:');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_JWT_SECRET'
  ];

  let allVarsPresent = true;
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`  ✅ ${varName}: ${value.substring(0, 20)}...`);
    } else {
      console.log(`  ❌ ${varName}: MISSING`);
      allVarsPresent = false;
    }
  }

  if (!allVarsPresent) {
    console.log('\n❌ Some environment variables are missing!');
    console.log('Please check your .env.local file.');
    process.exit(1);
  }

  console.log('\n✅ All environment variables present\n');

  // Test Supabase connection
  console.log('🔌 Testing Supabase connection...');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test 1: Check if we can connect
    console.log('  Testing basic connection...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (healthError) {
      console.log(`  ❌ Connection failed: ${healthError.message}`);
      process.exit(1);
    }

    console.log('  ✅ Connection successful');

    // Test 2: Check tables exist
    console.log('\n📊 Checking database tables:');
    const tables = [
      'user_profiles',
      'master_data',
      'churn_records',
      'visits',
      'demos',
      'health_checks',
      'mom',
      'notification_preferences',
      'notification_log'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  ✅ ${table}: exists`);
      }
    }

    // Test 3: Get table counts
    console.log('\n📈 Table record counts:');
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${table}: ${error.message}`);
      } else {
        console.log(`  📊 ${table}: ${count || 0} records`);
      }
    }

    console.log('\n✅ All tests passed!');
    console.log('\n🎉 Supabase is ready to use!');
    console.log('\nNext steps:');
    console.log('  1. Review MIGRATION_CHECKLIST.md');
    console.log('  2. Start migrating API routes');
    console.log('  3. Test each route after migration');

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    console.log('\nTroubleshooting:');
    console.log('  1. Check your Supabase project is active');
    console.log('  2. Verify your credentials are correct');
    console.log('  3. Check your network connection');
    console.log('  4. Ensure tables are created (run supabase_schema.sql)');
    process.exit(1);
  }
}

testConnection();
