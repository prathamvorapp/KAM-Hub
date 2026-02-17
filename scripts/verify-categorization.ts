/**
 * Categorization Verification Script
 * 
 * This script verifies that the categorization logic is working correctly
 * by analyzing all records and showing which category each would fall into.
 */

import { getSupabaseAdmin } from '../lib/supabase-client';
import { isCompletedReason, isNoAgentResponse } from '../lib/constants/churnReasons';

function safeParseDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const cleanDate = dateStr.trim();
  if (!cleanDate) return null;

  const parts = cleanDate.split(/[-/.]/);
  if (parts.length === 3) {
    try {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].length === 3 ? parts[1] : parts[1].padStart(2, '0');
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      const testDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(testDate.getTime())) return testDate;
    } catch (e) {}
  }

  try {
    const fallback = new Date(cleanDate);
    return isNaN(fallback.getTime()) ? null : fallback;
  } catch (e) {
    return null;
  }
}

async function verifyCategorizationLogic() {
  console.log('🔍 Verifying categorization logic...\n');
  
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
    
    // Calculate categorization
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeDaysAgo = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000));
    
    const categories = {
      completed: [] as any[],
      followUps: [] as any[],
      newCount: [] as any[],
      overdue: [] as any[],
      invalid: [] as any[]
    };
    
    for (const record of allRecords) {
      const recordDate = safeParseDate((record as any).date);
      if (!recordDate) {
        categories.invalid.push(record);
        continue;
      }
      
      const churnReason = (record as any).churn_reason?.trim() || "";
      
      // PRIORITY 1: Check if completed
      const hasCompletedReason = isCompletedReason(churnReason);
      const hasCompletedStatus = (record as any).follow_up_status === "COMPLETED";
      const hasThreeCalls = (record as any).call_attempts && (record as any).call_attempts.length >= 3;
      const completed = hasCompletedReason || hasCompletedStatus || hasThreeCalls;
      
      if (completed) {
        categories.completed.push({
          ...(record as any),
          reason: hasCompletedReason ? 'completed_reason' : hasThreeCalls ? 'three_calls' : 'completed_status'
        });
        continue;
      }
      
      // PRIORITY 2: Check if in follow-up
      const hasCallAttempts = (record as any).call_attempts && (record as any).call_attempts.length > 0;
      const hasActiveFollowUp = (record as any).follow_up_status === "ACTIVE" || 
                               (record as any).is_follow_up_active ||
                               ((record as any).follow_up_status === "INACTIVE" && (record as any).next_reminder_time);
      const noResponse = isNoAgentResponse(churnReason);
      const hasRealChurnReason = !noResponse && churnReason !== "";
      const hasAgentAction = hasCallAttempts || hasActiveFollowUp || hasRealChurnReason;
      
      if (hasAgentAction) {
        categories.followUps.push({
          ...(record as any),
          reason: hasCallAttempts ? 'has_calls' : hasActiveFollowUp ? 'active_followup' : 'real_reason'
        });
        continue;
      }
      
      // PRIORITY 3: Categorize by date
      if (noResponse) {
        if (recordDate >= threeDaysAgo) {
          categories.newCount.push(record);
        } else {
          categories.overdue.push(record);
        }
      }
    }
    
    // Print results
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  CATEGORIZATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`📊 Total Records: ${allRecords.length}\n`);
    
    console.log(`✅ Completed: ${categories.completed.length}`);
    console.log(`   - By completed reason: ${categories.completed.filter(r => r.reason === 'completed_reason').length}`);
    console.log(`   - By 3+ calls: ${categories.completed.filter(r => r.reason === 'three_calls').length}`);
    console.log(`   - By status: ${categories.completed.filter(r => r.reason === 'completed_status').length}\n`);
    
    console.log(`📞 Follow-Ups: ${categories.followUps.length}`);
    console.log(`   - Has call attempts: ${categories.followUps.filter(r => r.reason === 'has_calls').length}`);
    console.log(`   - Active follow-up: ${categories.followUps.filter(r => r.reason === 'active_followup').length}`);
    console.log(`   - Real churn reason: ${categories.followUps.filter(r => r.reason === 'real_reason').length}\n`);
    
    console.log(`🆕 New Count: ${categories.newCount.length}`);
    console.log(`   (Last 3 days, no agent response)\n`);
    
    console.log(`⚠️  Overdue: ${categories.overdue.length}`);
    console.log(`   (Older than 3 days, no agent response)\n`);
    
    if (categories.invalid.length > 0) {
      console.log(`❌ Invalid (bad date): ${categories.invalid.length}\n`);
    }
    
    // Show sample records from each category
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SAMPLE RECORDS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (categories.completed.length > 0) {
      console.log('✅ Completed (first 5):');
      categories.completed.slice(0, 5).forEach((record: any) => {
        console.log(`   RID ${record.rid}: "${record.churn_reason}" (${record.reason})`);
      });
      console.log('');
    }
    
    if (categories.followUps.length > 0) {
      console.log('📞 Follow-Ups (first 5):');
      categories.followUps.slice(0, 5).forEach((record: any) => {
        console.log(`   RID ${record.rid}: "${record.churn_reason}" (${record.reason})`);
      });
      console.log('');
    }
    
    if (categories.overdue.length > 0) {
      console.log('⚠️  Overdue (first 5):');
      categories.overdue.slice(0, 5).forEach((record: any) => {
        console.log(`   RID ${record.rid}: date=${record.date}, reason="${record.churn_reason}"`);
      });
      console.log('');
    }
    
    if (categories.newCount.length > 0) {
      console.log('🆕 New Count (first 5):');
      categories.newCount.slice(0, 5).forEach((record: any) => {
        console.log(`   RID ${record.rid}: date=${record.date}, reason="${record.churn_reason}"`);
      });
      console.log('');
    }
    
    // Check for potential issues
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  POTENTIAL ISSUES');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const completedWithWrongStatus = categories.completed.filter(
      r => r.reason === 'completed_reason' && r.follow_up_status !== 'COMPLETED'
    );
    
    if (completedWithWrongStatus.length > 0) {
      console.log(`⚠️  Found ${completedWithWrongStatus.length} records with completed reasons but wrong status:`);
      completedWithWrongStatus.slice(0, 5).forEach((record: any) => {
        console.log(`   RID ${record.rid}: "${record.churn_reason}" (status: ${record.follow_up_status})`);
      });
      console.log('   → Run FIX_ALL_CHURN_COMPREHENSIVE.ps1 to fix these\n');
    } else {
      console.log('✅ All completed records have correct status\n');
    }
    
    if (categories.invalid.length > 0) {
      console.log(`⚠️  Found ${categories.invalid.length} records with invalid dates:`);
      categories.invalid.slice(0, 5).forEach((record: any) => {
        console.log(`   RID ${record.rid}: date="${record.date}"`);
      });
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
console.log('═══════════════════════════════════════════════════════════');
console.log('  CATEGORIZATION VERIFICATION');
console.log('═══════════════════════════════════════════════════════════\n');

verifyCategorizationLogic()
  .then(() => {
    console.log('✅ Verification completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
