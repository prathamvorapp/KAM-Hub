/**
 * Migration Script: Fix All Churn Record Statuses
 * 
 * This script updates ALL existing churn records to have correct follow_up_status
 * based on their churn_reason and call_attempts.
 * 
 * Run this ONCE to fix all 300+ records at once.
 */

import { getSupabaseAdmin } from '../lib/supabase-client';
import { isCompletedReason, isNoAgentResponse } from '../lib/constants/churnReasons';

async function fixAllChurnStatuses() {
  console.log('🔧 Starting migration to fix all churn record statuses...');
  
  try {
    // Get ALL churn records
    const { data: allRecords, error } = await getSupabaseAdmin()
      .from('churn_records')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching records:', error);
      return;
    }
    
    console.log(`📊 Found ${allRecords?.length || 0} total records`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errors = 0;
    
    for (const record of (allRecords as any[] || [])) {
      try {
        const churnReason = record.churn_reason?.trim() || "";
        const callAttempts = record.call_attempts || [];
        const hasThreeAttempts = callAttempts.length >= 3;
        
        // Determine what the status SHOULD be
        let correctStatus = "INACTIVE";
        let correctIsActive = false;
        let correctNextReminder = record.next_reminder_time;
        let correctCompletedAt = record.follow_up_completed_at;
        
        // Check if should be COMPLETED
        const shouldBeCompleted = 
          isCompletedReason(churnReason) || 
          hasThreeAttempts ||
          record.follow_up_status === "COMPLETED";
        
        if (shouldBeCompleted) {
          correctStatus = "COMPLETED";
          correctIsActive = false;
          correctNextReminder = null;
          if (!correctCompletedAt) {
            correctCompletedAt = record.updated_at || new Date().toISOString();
          }
        } else {
          // Not completed - check if should be ACTIVE or INACTIVE
          const noResponse = isNoAgentResponse(churnReason);
          
          if (noResponse && callAttempts.length === 0) {
            // No attempts yet - should be ACTIVE (needs first call)
            correctStatus = "INACTIVE";
            correctIsActive = true; // Actually needs action
            correctNextReminder = null; // No reminder set yet
          } else if (callAttempts.length > 0 && callAttempts.length < 3) {
            // Has attempts but not completed - check last attempt
            const lastAttempt = callAttempts[callAttempts.length - 1];
            const wasConnected = lastAttempt.call_response === "Connected";
            
            if (wasConnected && !isCompletedReason(lastAttempt.churn_reason)) {
              // Connected but didn't provide completed reason - needs follow-up
              correctStatus = "INACTIVE";
              correctIsActive = false;
              // Set next reminder if not already set
              if (!correctNextReminder) {
                const nextReminder = new Date(lastAttempt.timestamp);
                nextReminder.setHours(nextReminder.getHours() + 24);
                correctNextReminder = nextReminder.toISOString();
              }
            } else if (!wasConnected) {
              // Not connected - needs follow-up
              correctStatus = "INACTIVE";
              correctIsActive = false;
              // Set next reminder if not already set
              if (!correctNextReminder) {
                const nextReminder = new Date(lastAttempt.timestamp);
                nextReminder.setHours(nextReminder.getHours() + 24);
                correctNextReminder = nextReminder.toISOString();
              }
            }
          }
        }
        
        // Check if current status is wrong
        const needsUpdate = 
          record.follow_up_status !== correctStatus ||
          record.is_follow_up_active !== correctIsActive ||
          (correctStatus === "COMPLETED" && record.next_reminder_time !== null);
        
        if (needsUpdate) {
          console.log(`🔄 Fixing RID ${record.rid}:`);
          console.log(`   Churn Reason: "${churnReason}"`);
          console.log(`   Call Attempts: ${callAttempts.length}`);
          console.log(`   Current Status: ${record.follow_up_status} → ${correctStatus}`);
          console.log(`   Current Active: ${record.is_follow_up_active} → ${correctIsActive}`);
          
          // Update the record
          const { error: updateError } = await (getSupabaseAdmin()
            .from('churn_records') as any)
            .update({
              follow_up_status: correctStatus,
              is_follow_up_active: correctIsActive,
              next_reminder_time: correctNextReminder,
              follow_up_completed_at: correctCompletedAt,
              updated_at: new Date().toISOString()
            })
            .eq('rid', record.rid);
          
          if (updateError) {
            console.error(`   ❌ Error updating RID ${record.rid}:`, updateError);
            errors++;
          } else {
            console.log(`   ✅ Fixed`);
            fixedCount++;
          }
        } else {
          alreadyCorrectCount++;
        }
        
      } catch (err) {
        console.error(`❌ Error processing RID ${record.rid}:`, err);
        errors++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   Total Records: ${allRecords?.length || 0}`);
    console.log(`   ✅ Fixed: ${fixedCount}`);
    console.log(`   ✓ Already Correct: ${alreadyCorrectCount}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n✨ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
fixAllChurnStatuses();
