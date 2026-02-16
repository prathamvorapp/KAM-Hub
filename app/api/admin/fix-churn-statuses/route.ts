/**
 * Admin API: Fix All Churn Record Statuses
 * 
 * This endpoint updates ALL existing churn records to have correct follow_up_status
 * based on their churn_reason and call_attempts.
 * 
 * Call this endpoint ONCE to fix all 300+ records.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-client';
import { isCompletedReason, isNoAgentResponse } from '@/lib/constants/churnReasons';

export async function POST(request: NextRequest) {
  try {
    // Get user info from middleware
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');
    
    // Only allow admins to run this
    if (userRole?.toLowerCase() !== 'admin') {
      return NextResponse.json({
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    console.log('🔧 Starting migration to fix all churn record statuses...');
    console.log(`👤 Initiated by: ${userEmail}`);
    
    // Get ALL churn records
    const { data: allRecords, error } = await getSupabaseAdmin()
      .from('churn_records')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching records:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch records',
        detail: error.message
      }, { status: 500 });
    }
    
    console.log(`📊 Found ${allRecords?.length || 0} total records`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let errors = 0;
    const fixedRecords: any[] = [];
    const errorRecords: any[] = [];
    
    const records = (allRecords || []) as any[];
    for (const record of records) {
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
          hasThreeAttempts;
        
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
            // No attempts yet - should be INACTIVE (waiting for agent)
            correctStatus = "INACTIVE";
            correctIsActive = false;
            correctNextReminder = null;
          } else if (callAttempts.length > 0 && callAttempts.length < 3) {
            // Has attempts but not completed - needs follow-up
            correctStatus = "INACTIVE";
            correctIsActive = false;
            
            // Set next reminder based on last attempt
            const lastAttempt = callAttempts[callAttempts.length - 1];
            if (!correctNextReminder) {
              const nextReminder = new Date(lastAttempt.timestamp);
              nextReminder.setHours(nextReminder.getHours() + 24);
              correctNextReminder = nextReminder.toISOString();
            }
          }
        }
        
        // Check if current status is wrong
        const needsUpdate = 
          record.follow_up_status !== correctStatus ||
          record.is_follow_up_active !== correctIsActive ||
          (correctStatus === "COMPLETED" && record.next_reminder_time !== null);
        
        if (needsUpdate) {
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
            console.error(`❌ Error updating RID ${record.rid}:`, updateError);
            errors++;
            errorRecords.push({
              rid: record.rid,
              error: updateError.message
            });
          } else {
            fixedCount++;
            fixedRecords.push({
              rid: record.rid,
              churn_reason: churnReason,
              old_status: record.follow_up_status,
              new_status: correctStatus,
              call_attempts: callAttempts.length
            });
          }
        } else {
          alreadyCorrectCount++;
        }
        
      } catch (err) {
        console.error(`❌ Error processing RID ${record.rid}:`, err);
        errors++;
        errorRecords.push({
          rid: record.rid,
          error: String(err)
        });
      }
    }
    
    const summary = {
      total_records: allRecords?.length || 0,
      fixed: fixedCount,
      already_correct: alreadyCorrectCount,
      errors: errors,
      initiated_by: userEmail,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n📊 Migration Summary:', summary);
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      summary,
      fixed_records: fixedRecords.slice(0, 50), // Return first 50 for review
      error_records: errorRecords
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      detail: String(error)
    }, { status: 500 });
  }
}
