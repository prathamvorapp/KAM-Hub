# Code Changes for Demo Service

## File: lib/services/demoService.ts

### Change 1: Update completeDemo function (Line ~461)

**Location:** In the `completeDemo` function, in the update statement

**FIND:**
```typescript
await (getSupabaseAdmin()
  .from('demos') as any)
  .update({
    demo_completed: true,
    demo_completed_date: now,
    demo_conducted_by: params.conductedBy,
    demo_completion_notes: params.completionNotes,
    current_status: "Feedback Awaited",
    updated_at: now,
  })
  .eq('demo_id', params.demoId);
```

**REPLACE WITH:**
```typescript
await (getSupabaseAdmin()
  .from('demos') as any)
  .update({
    demo_completed: true,
    demo_completed_date: now,
    demo_conducted_by: params.conductedBy,
    demo_completion_notes: params.completionNotes,
    completed_by_agent_id: demo.agent_id,  // ✅ NEW: Track who completed it
    completed_by_agent_name: demo.agent_name,  // ✅ NEW: Track who completed it
    current_status: "Feedback Awaited",
    updated_at: now,
  })
  .eq('demo_id', params.demoId);
```

---

### Change 2: Update bulkCompleteDemo function (Line ~902)

**Location:** In the `bulkCompleteDemo` function, in the final update statement

**FIND:**
```typescript
await (getSupabaseAdmin()
  .from('demos') as any)
  .update({
    // Step 1
    is_applicable: params.isApplicable,
    step1_completed_at: now,
    // Step 2
    usage_status: params.usageStatus,
    step2_completed_at: now,
    // Step 3
    demo_scheduled_date: params.scheduledDate,
    demo_scheduled_time: params.scheduledTime,
    // Step 4
    demo_completed: true,
    demo_completed_date: now,
    demo_conducted_by: params.conductedBy,
    demo_completion_notes: params.completionNotes,
    // Step 5
    conversion_status: params.conversionStatus,
    non_conversion_reason: params.nonConversionReason,
    conversion_decided_at: now,
    // Final state
    current_status: finalStatus,
    workflow_completed: workflowCompleted,
    updated_at: now,
  })
  .eq('demo_id', params.demoId);
```

**REPLACE WITH:**
```typescript
await (getSupabaseAdmin()
  .from('demos') as any)
  .update({
    // Step 1
    is_applicable: params.isApplicable,
    step1_completed_at: now,
    // Step 2
    usage_status: params.usageStatus,
    step2_completed_at: now,
    // Step 3
    demo_scheduled_date: params.scheduledDate,
    demo_scheduled_time: params.scheduledTime,
    // Step 4
    demo_completed: true,
    demo_completed_date: now,
    demo_conducted_by: params.conductedBy,
    demo_completion_notes: params.completionNotes,
    completed_by_agent_id: demo.agent_id,  // ✅ NEW: Track who completed it
    completed_by_agent_name: demo.agent_name,  // ✅ NEW: Track who completed it
    // Step 5
    conversion_status: params.conversionStatus,
    non_conversion_reason: params.nonConversionReason,
    conversion_decided_at: now,
    // Final state
    current_status: finalStatus,
    workflow_completed: workflowCompleted,
    updated_at: now,
  })
  .eq('demo_id', params.demoId);
```

---

### Change 3: Add Brand Transfer Function (Add at end of demoService object, before closing brace)

**Location:** At the end of the `demoService` object, after the `bulkCompleteDemo` function

**ADD THIS NEW FUNCTION:**
```typescript
  // Transfer Brand Demos (Admin/Team Lead only)
  async transferBrandDemos(params: {
    brandId: string;
    fromAgentEmail: string;
    toAgentEmail: string;
    toAgentName: string;
    toTeamName?: string;
    transferReason: string;
    transferredBy: string;
  }, rawProfile: UserProfile) {
    const userProfile = normalizeUserProfile(rawProfile);
    const normalizedRole = userProfile.role.toLowerCase().replace(/\s+/g, '_');

    // Authorization: Only Admin or Team Lead
    if (normalizedRole !== 'admin' && normalizedRole !== 'team_lead' && normalizedRole !== 'teamlead') {
      throw new Error(`Access denied: User ${userProfile.email} (Role: ${userProfile.role}) is not authorized to transfer brands`);
    }

    const now = new Date().toISOString();

    // Get all demos for the brand
    const { data: demos, error: fetchError } = await getSupabaseAdmin()
      .from('demos')
      .select('*')
      .eq('brand_id', params.brandId);

    if (fetchError) {
      throw new Error(`Failed to fetch demos: ${fetchError.message}`);
    }

    if (!demos || demos.length === 0) {
      throw new Error(`No demos found for brand ${params.brandId}`);
    }

    console.log(`🔄 Transferring ${demos.length} demos from ${params.fromAgentEmail} to ${params.toAgentEmail}`);

    // Update each demo
    let successCount = 0;
    let errorCount = 0;

    for (const demo of demos) {
      const transferEntry = {
        from_agent_id: params.fromAgentEmail,
        to_agent_id: params.toAgentEmail,
        transferred_at: now,
        transferred_by: params.transferredBy,
        reason: params.transferReason,
        demo_status_at_transfer: demo.current_status,
        was_completed: demo.demo_completed || false
      };

      const updatedHistory = [...(demo.transfer_history || []), transferEntry];

      const { error: updateError } = await getSupabaseAdmin()
        .from('demos')
        .update({
          agent_id: params.toAgentEmail,
          agent_name: params.toAgentName,
          team_name: params.toTeamName || demo.team_name,
          transfer_history: updatedHistory,
          // Keep completed_by_* unchanged - preserves who did the work
          updated_at: now
        })
        .eq('demo_id', demo.demo_id);

      if (updateError) {
        console.error(`❌ Failed to transfer demo ${demo.demo_id}:`, updateError);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`✅ Transfer complete: ${successCount} success, ${errorCount} errors`);

    return {
      success: errorCount === 0,
      totalDemos: demos.length,
      successCount,
      errorCount,
      message: `Transferred ${successCount} demos from ${params.fromAgentEmail} to ${params.toAgentEmail}`
    };
  },
```

---

## Testing Steps After Changes:

1. **Test Demo Completion:**
   - Complete a demo
   - Verify `completed_by_agent_id` is set
   - Check that `agent_id` and `completed_by_agent_id` match

2. **Test Existing Demos:**
   - View existing demos
   - Ensure they still display correctly
   - Verify no errors in console

3. **Test Demo Statistics:**
   - Check demo statistics page
   - Ensure counts are correct
   - Verify no broken queries
