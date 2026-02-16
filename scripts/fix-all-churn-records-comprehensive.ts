/**
 * Comprehensive Churn Records Fix Script
 * 
 * This script fixes ALL churn records in the database at once:
 * 1. Records with completed reasons but wrong follow_up_status
 * 2. Records with 3+ call attempts but not marked as completed
 * 3. Records with inconsistent is_follow_up_active flags
 * 
 * Run this ONCE to fix all existing data, then the auto-fix will handle new records.
 */

import { getSupabaseAdmin } from '../lib/supabase-client';
import { isCompletedReason, isNoAgentResponse } from '../lib/constants/churnReasons';

async function fixAllChurnRecords() {
  console.log('🔧 Starting comprehensive churn records fix...\n');
  
  try {
    // Fetch ALL churn records
    console.log('📊 Fetching all churn records...');
    const { data: allRecords, error: fetchError } = await getSupabaseAdmin()
      .from('churn_records')
      .select('*');
    
    if (fetchError) {
      throw new Error(`Failed to fetch records: ${fetchError.message}`);
    }
    
    if (!allRecords || allRecords.length === 0) {
      console.log('❌ No records found in database');
      return;
    }
    
    console.log(`✅ Fetched ${allRecords.length} records\n`);
    
    // Analyze and categorize records that need fixing
    const recordsToFix: any[] = [];
    const fixReasons: Record<string, string[]> = {
      'completed_reason': [],
      'three_calls': [],
      'inconsistent_status': []
    };
    
    for (const record of allRecords) {
      const churnReason = record.churn_reason?.trim() || "";
      const callAttempts = record.call_attempts || [];
      const currentStatus = record.follow_up_status;
      
      // Check if should be completed
      const hasCompletedReason = isCompletedReason(churnReason);
      const hasThreeCalls = callAttempts.length >= 3;
      const shouldBeCompleted = hasCompletedReason || hasThreeCalls;
      
      if (shouldBeCompleted && currentStatus !== "COMPLETED") {
        recordsToFix.push(record);
        
        if (hasCompletedReason) {
          fixReasons.completed_reason.push(record.rid);
        }
        if (hasThreeCalls) {
          fixReasons.three_calls.push(record.rid);
        }
      }
      
      // Check for inconsistent active flags
      if (currentStatus === "COMPLETED" && record.is_follow_up_active) {
        if (!recordsToFix.find(r => r.rid === record.rid)) {
          recordsToFix.push(record);
        }
        fixReasons.inconsistent_status.push(record.rid);
      }
    }
    
    console.log('📋 Analysis Results:');
    console.log(`   Total records: ${allRecords.length}`);
    console.log(`   Records needing fix: ${recordsToFix.length}`);
    console.log(`   - With completed reasons: ${fixReasons.completed_reason.length}`);
    console.log(`   - With 3+ calls: ${fixReasons.three_calls.length}`);
    console.log(`   - With inconsistent status: ${fixReasons.inconsistent_status.length}\n`);
    
    if (recordsToFix.length === 0) {
      console.log('✅ All records are already correct! No fixes needed.');
      return;
    }
    
    // Show sample of records to be fixed
    console.log('📝 Sample records to be fixed (first 10):');
    recordsToFix.slice(0, 10).forEach(record => {
      console.log(`   RID ${record.rid}: "${record.churn_reason}" (status: ${record.follow_up_status}, calls: ${record.call_attempts?.length || 0})`);
    });
    console.log('');
    
    // Fix all records in batches
    console.log('🔧 Fixing records in batches of 50...');
    const batchSize = 50;
    let fixedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < recordsToFix.length; i += batchSize) {
      const batch = recordsToFix.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(recordsToFix.length / batchSize);
      
      console.log(`   Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);
      
      // Fix each record in the batch
      const fixPromises = batch.map(async (record) => {
        try {
          const { error } = await getSupabaseAdmin()
            .from('churn_records')
            .update({
              follow_up_status: "COMPLETED",
              is_follow_up_active: false,
              next_reminder_time: null,
              follow_up_completed_at: record.follow_up_completed_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('rid', record.rid);
          
          if (error) {
            console.error(`      ❌ Failed to fix RID ${record.rid}: ${error.message}`);
            return { success: false, rid: record.rid };
          }
          
          return { success: true, rid: record.rid };
        } catch (error: any) {
          console.error(`      ❌ Exception fixing RID ${record.rid}: ${error.message}`);
          return { success: false, rid: record.rid };
        }
      });
      
      const results = await Promise.all(fixPromises);
      const batchFixed = results.filter(r => r.success).length;
      const batchErrors = results.filter(r => !r.success).length;
      
      fixedCount += batchFixed;
      errorCount += batchErrors;
      
      console.log(`      ✅ Fixed ${batchFixed} records, ${batchErrors} errors`);
    }
    
    console.log('\n📊 Final Results:');
    console.log(`   ✅ Successfully fixed: ${fixedCount} records`);
    console.log(`   ❌ Errors: ${errorCount} records`);
    console.log(`   📈 Success rate: ${((fixedCount / recordsToFix.length) * 100).toFixed(1)}%`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some records failed to update. Check the error messages above.');
    } else {
      console.log('\n🎉 All records fixed successfully!');
    }
    
    // Show breakdown by fix reason
    console.log('\n📋 Breakdown by fix reason:');
    console.log(`   - Completed reasons: ${fixReasons.completed_reason.length} records`);
    console.log(`   - Three calls: ${fixReasons.three_calls.length} records`);
    console.log(`   - Inconsistent status: ${fixReasons.inconsistent_status.length} records`);
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
console.log('═══════════════════════════════════════════════════════════');
console.log('  COMPREHENSIVE CHURN RECORDS FIX');
console.log('═══════════════════════════════════════════════════════════\n');

fixAllChurnRecords()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
