# Demo-MOM Integration Enhancement

## Overview

This enhancement streamlines the workflow for agents by allowing them to submit product demo information directly while creating Minutes of Meeting (MOM), eliminating the need for separate demo entry.

## Problem Statement

**Previous Flow:**
1. Agent visits brand → Completes visit
2. Agent submits MOM separately  
3. Agent marks demos separately (8 products per brand)

This required agents to navigate to multiple pages and fill forms multiple times for the same visit.

**New Enhanced Flow:**
1. Agent visits brand → Completes visit
2. Agent submits MOM with integrated demo submission option
3. Demos are automatically created/updated during MOM submission

## Features

### 1. Enhanced MOM Modal with Demo Tab

The new `EnhancedSubmitMomModalWithDemos` component adds a "Product Demos" tab alongside existing tabs:

- **Manual Entry**: Add action items manually
- **CSV Upload**: Upload MOM topics from CSV
- **Product Demos**: NEW - Record demo information
- **Meeting Summary**: Overall meeting notes

### 2. Product Demo Entry

For each of the 8 products (Task, Purchase, Payroll, TRM, Reputation, Franchise Module, Petpooja Franchise, Marketing Automation), agents can:

#### Basic Information:
- Mark product as Applicable/Not Applicable
- Provide reason if not applicable

#### Demo Scheduling:
- Set demo date and time
- Select who conducted the demo (Agent/RM/MP Training/Product Team)

#### Demo Completion:
- Mark demo as completed
- Add completion notes
- Set conversion status (Converted/Not Converted/Pending Decision)
- Provide reason for non-conversion if applicable

### 3. Flexible Entry

- Agents can fill complete demo details during MOM submission
- Or just mark basic applicability and update details later from Demos page
- Only modified demos are saved (not all 8 products if not discussed)

## Technical Implementation

### New Files Created

1. **components/modals/EnhancedSubmitMomModalWithDemos.tsx**
   - Enhanced modal component with demo integration
   - Adds "Product Demos" tab to existing MOM modal
   - Handles demo state management

2. **lib/services/visitServiceEnhanced.ts**
   - Extended visit service with demo creation capabilities
   - `submitMoMWithDemos()` - Main function that submits MOM and creates/updates demos
   - `_createNewDemo()` - Creates new demo records
   - `_updateExistingDemo()` - Updates existing demo records

3. **app/api/data/visits/[visitId]/mom-with-demos/route.ts**
   - New API endpoint for enhanced MOM submission
   - POST `/api/data/visits/[visitId]/mom-with-demos`

### Modified Files

1. **lib/services/index.ts**
   - Added export for `visitServiceEnhanced`

2. **lib/api-client.ts**
   - Added `submitVisitMOMWithDemos()` method

3. **app/dashboard/visits/page.tsx**
   - Updated to use `EnhancedSubmitMomModalWithDemos`
   - Modified `handleSubmitMom()` to support demo data
   - Automatically uses enhanced API when demos are included

## API Structure

### Request Format

```typescript
POST /api/data/visits/[visitId]/mom-with-demos

{
  visit_id: string;
  open_points: OpenPoint[];
  csv_topics?: CSVTopic[];
  meeting_summary?: string;
  demos?: DemoData[];
  brand_name: string;
  agent_name: string;
  mom_shared: "Yes";
}
```

### Demo Data Structure

```typescript
interface DemoData {
  product_name: string;
  is_applicable: boolean;
  non_applicable_reason?: string;
  demo_scheduled_date?: string;
  demo_scheduled_time?: string;
  demo_conducted_by?: string;
  demo_completed?: boolean;
  demo_completion_notes?: string;
  conversion_status?: string;
  non_conversion_reason?: string;
}
```

### Response Format

```typescript
{
  success: true;
  message: "MOM submitted successfully";
  data: {
    success: true;
    demos_created: boolean;
    demos_count?: number;
    demo_error?: any;
  }
}
```

## Database Schema

### Demos Table

The service automatically manages demo workflow states:

- **Step 1**: Applicability (is_applicable, non_applicable_reason)
- **Step 2**: Usage Status (usage_status)
- **Step 3**: Scheduling (demo_scheduled_date, demo_scheduled_time)
- **Step 4**: Completion (demo_completed, demo_conducted_by, demo_completion_notes)
- **Step 5**: Conversion (conversion_status, non_conversion_reason)

Current status is automatically calculated based on completed steps.

## User Experience

### For Agents

1. Complete visit as usual
2. Click "Submit MOM" button
3. Fill action items in "Manual Entry" or "CSV Upload" tabs
4. Switch to "Product Demos" tab
5. For each product discussed:
   - Check "Applicable" checkbox
   - Fill demo details (as much as known)
   - Mark as completed if demo was given during visit
6. Submit MOM - both MOM and demos are saved together

### Benefits

- **Time Saving**: Single form instead of multiple pages
- **Context Preservation**: Demo details recorded while visit is fresh in memory
- **Flexibility**: Can fill partial information and update later
- **Reduced Errors**: Less chance of forgetting to record demos

## Backward Compatibility

- Existing MOM submission still works (without demos)
- Old `EnhancedSubmitMomModal` component remains functional
- New modal is opt-in via import change
- API automatically detects if demos are included

## Future Enhancements

Potential improvements:

1. **Bulk Actions**: "Mark all as applicable" button
2. **Smart Defaults**: Pre-fill based on brand's previous demos
3. **Demo Templates**: Save common demo patterns
4. **Inline Validation**: Real-time validation of demo data
5. **Demo History**: Show previous demos for same brand
6. **Conversion Tracking**: Analytics on demo-to-conversion rates

## Testing Checklist

- [ ] Submit MOM without demos (backward compatibility)
- [ ] Submit MOM with 1 demo
- [ ] Submit MOM with all 8 demos
- [ ] Mark product as not applicable
- [ ] Schedule demo for future date
- [ ] Mark demo as completed with conversion
- [ ] Mark demo as completed without conversion
- [ ] Update existing demo via MOM submission
- [ ] Verify demo appears in Demos page
- [ ] Test with Agent role
- [ ] Test with Team Lead role
- [ ] Test with Admin role

## Rollout Plan

### Phase 1: Soft Launch
- Deploy to production
- Keep both old and new modals available
- Monitor for issues

### Phase 2: User Training
- Create user guide with screenshots
- Conduct training sessions for agents
- Gather feedback

### Phase 3: Full Rollout
- Make new modal default
- Deprecate old modal
- Monitor adoption metrics

## Support

For issues or questions:
- Check console logs for detailed error messages
- Verify brand_id is present in visit record
- Ensure user has proper permissions
- Check Supabase logs for database errors

## Metrics to Track

- MOM submission time (before vs after)
- Demo completion rate
- User adoption rate
- Error rates
- User satisfaction scores
