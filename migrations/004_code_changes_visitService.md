# Code Changes for Visit Service

## File: lib/services/visitServiceEnhanced.ts

### Change 1: Update createOrUpdateDemoInVisit function (Line ~290)

**Location:** In the `createOrUpdateDemoInVisit` function, where demo_completed is set

**FIND:**
```typescript
// Step 4: Completion (if provided)
if (demoData.demo_completed) {
  demoRecord.demo_completed = true;
  demoRecord.demo_completed_date = now;
  demoRecord.demo_conducted_by = demoData.demo_conducted_by || 'Agent';
  demoRecord.demo_completion_notes = demoData.demo_completion_notes || '';
}
```

**REPLACE WITH:**
```typescript
// Step 4: Completion (if provided)
if (demoData.demo_completed) {
  demoRecord.demo_completed = true;
  demoRecord.demo_completed_date = now;
  demoRecord.demo_conducted_by = demoData.demo_conducted_by || 'Agent';
  demoRecord.demo_completion_notes = demoData.demo_completion_notes || '';
  demoRecord.completed_by_agent_id = agentId;  // ✅ NEW: Track who completed it
  demoRecord.completed_by_agent_name = agentName;  // ✅ NEW: Track who completed it
}
```

---

### Change 2: Update the updateData section (Line ~373)

**Location:** In the same function, where updateData is being built

**FIND:**
```typescript
// Update completion if provided
if (demoData.demo_completed !== undefined) {
  updateData.demo_completed = demoData.demo_completed;
  if (demoData.demo_completed) {
    updateData.demo_completed_date = now;
    updateData.demo_conducted_by = demoData.demo_conducted_by || 'Agent';
    updateData.demo_completion_notes = demoData.demo_completion_notes || '';
  }
}
```

**REPLACE WITH:**
```typescript
// Update completion if provided
if (demoData.demo_completed !== undefined) {
  updateData.demo_completed = demoData.demo_completed;
  if (demoData.demo_completed) {
    updateData.demo_completed_date = now;
    updateData.demo_conducted_by = demoData.demo_conducted_by || 'Agent';
    updateData.demo_completion_notes = demoData.demo_completion_notes || '';
    updateData.completed_by_agent_id = agentId;  // ✅ NEW: Track who completed it
    updateData.completed_by_agent_name = agentName;  // ✅ NEW: Track who completed it
  }
}
```

---

## File: lib/services/visitService.ts

### Change 3: Add Visit Transfer Function

**Location:** At the end of the `visitService` object, before closing brace

**ADD THIS NEW FUNCTION:**
```typescript
  // Transfer Brand Visits (Admin/Team Lead only)
  async transferBrandVisits(params: {
    brandId: string;
    fromAgentEmail: string;
    toAgentEmail: string;
    toAgentName: string;
    toTeamName?: string;
    transferYear: string;
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

    // Get all visits for the brand in the specified year
    const { data: visits, error: fetchError } = await getSupabaseAdmin()
      .from('visits')
      .select('*')
      .eq('brand_id', params.brandId)
      .eq('visit_year', params.transferYear);

    if (fetchError) {
      throw new Error(`Failed to fetch visits: ${fetchError.message}`);
    }

    if (!visits || visits.length === 0) {
      console.log(`⚠️ No visits found for brand ${params.brandId} in year ${params.transferYear}`);
      return {
        success: true,
        totalVisits: 0,
        successCount: 0,
        errorCount: 0,
        message: `No visits to transfer for year ${params.transferYear}`
      };
    }

    console.log(`🔄 Transferring ${visits.length} visits from ${params.fromAgentEmail} to ${params.toAgentEmail}`);

    // Update each visit
    let successCount = 0;
    let errorCount = 0;

    for (const visit of visits) {
      const transferEntry = {
        from_agent_id: params.fromAgentEmail,
        to_agent_id: params.toAgentEmail,
        transferred_at: now,
        transferred_by: params.transferredBy,
        reason: params.transferReason,
        visit_status_at_transfer: visit.visit_status,
        was_completed: visit.visit_status === 'Completed'
      };

      const updatedHistory = [...(visit.transfer_history || []), transferEntry];

      const { error: updateError } = await getSupabaseAdmin()
        .from('visits')
        .update({
          agent_id: params.toAgentEmail,
          agent_name: params.toAgentName,
          team_name: params.toTeamName || visit.team_name,
          transfer_history: updatedHistory,
          // Keep completed_by_* unchanged - preserves who did the work
          updated_at: now
        })
        .eq('visit_id', visit.visit_id);

      if (updateError) {
        console.error(`❌ Failed to transfer visit ${visit.visit_id}:`, updateError);
        errorCount++;
      } else {
        successCount++;
      }
    }

    console.log(`✅ Transfer complete: ${successCount} success, ${errorCount} errors`);

    return {
      success: errorCount === 0,
      totalVisits: visits.length,
      successCount,
      errorCount,
      message: `Transferred ${successCount} visits from ${params.fromAgentEmail} to ${params.toAgentEmail}`
    };
  },
```

---

## Testing Steps After Changes:

1. **Test Visit with Demo Completion:**
   - Create a visit with demo data
   - Mark demo as completed
   - Verify `completed_by_agent_id` is set in demos table

2. **Test Existing Visits:**
   - View existing visits
   - Ensure they still display correctly
   - Verify no errors in console

3. **Test Visit Statistics:**
   - Check visit statistics
   - Ensure counts are correct
