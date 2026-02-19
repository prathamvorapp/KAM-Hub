/**
 * Test script to diagnose churn API issues
 * Run with: node test-churn-api.js
 */

const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = 'https://qvgnrdarwsnweizifech.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2Z25yZGFyd3Nud2VpemlmZWNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDg4ODc5OCwiZXhwIjoyMDg2NDY0Nzk4fQ.HLTCQ54D8DNHM5gJteRv6l9MZ8_i0c3A2_SqRxuAcAw';

async function testDirectSupabaseQuery() {
  console.log('🔍 Testing direct Supabase query...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/churn_records?select=*&limit=5`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Records returned:', Array.isArray(data) ? data.length : 'Not an array');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('\n📋 Sample record:');
      console.log(JSON.stringify(data[0], null, 2));
    } else if (data.message) {
      console.log('❌ Error message:', data.message);
    } else {
      console.log('⚠️ No records found or unexpected response:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testChurnRecordsCount() {
  console.log('\n🔍 Testing churn records count...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/churn_records?select=count`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'count=exact'
      }
    });
    
    const count = response.headers.get('content-range');
    console.log('✅ Total records:', count);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testWithFilters() {
  console.log('\n🔍 Testing with KAM filter...\n');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/churn_records?select=*&kam=eq.Abhishek%20Sharma&limit=5`, {
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Records for Abhishek Sharma:', Array.isArray(data) ? data.length : 'Not an array');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Churn API Diagnostics\n');
  console.log('=' .repeat(50));
  
  await testDirectSupabaseQuery();
  await testChurnRecordsCount();
  await testWithFilters();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Diagnostics complete!\n');
}

runAllTests();
