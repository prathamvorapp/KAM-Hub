# Developer Quick Start Guide

## 🚀 Getting Started

This guide helps developers understand and work with the Demo-MOM integration feature.

## 📁 File Structure

```
project/
├── components/
│   └── modals/
│       ├── EnhancedSubmitMomModal.tsx              # Old modal (still works)
│       └── EnhancedSubmitMomModalWithDemos.tsx     # New enhanced modal ⭐
│
├── lib/
│   ├── services/
│   │   ├── visitService.ts                         # Original visit service
│   │   ├── visitServiceEnhanced.ts                 # Enhanced with demos ⭐
│   │   ├── demoService.ts                          # Demo operations
│   │   └── index.ts                                # Service exports
│   │
│   ├── api-client.ts                               # API client methods
│   └── api.ts                                      # API exports
│
├── app/
│   ├── dashboard/
│   │   └── visits/
│   │       └── page.tsx                            # Visits page (updated)
│   │
│   └── api/
│       └── data/
│           └── visits/
│               └── [visitId]/
│                   ├── mom/
│                   │   └── route.ts                # Original MOM endpoint
│                   └── mom-with-demos/
│                       └── route.ts                # Enhanced endpoint ⭐
│
└── docs/
    ├── DEMO_MOM_INTEGRATION_GUIDE.md              # Technical docs
    ├── USER_GUIDE_DEMO_MOM.md                     # User guide
    ├── IMPLEMENTATION_SUMMARY.md                   # Summary
    ├── WORKFLOW_COMPARISON.md                      # Before/After
    └── DEVELOPER_QUICK_START.md                    # This file
```

## 🔧 Key Components

### 1. Enhanced Modal Component

**File**: `components/modals/EnhancedSubmitMomModalWithDemos.tsx`

```typescript
// Usage
import EnhancedSubmitMomModalWithDemos from '@/components/modals/EnhancedSubmitMomModalWithDemos';

<EnhancedSubmitMomModalWithDemos
  isOpen={isMomModalOpen}
  onClose={handleCloseMomModal}
  onSubmit={handleSubmitMom}
  visitId={visit._id}
  brandId={visit.brand_id}        // Required for demo creation
  brandName={visit.brand_name}
  agentName={visit.agent_name}
  visitCompletionDate={visit.visit_date}
/>
```

**Key Props:**
- `brandId`: Required for creating demos (links to master_data)
- `demos`: Optional array returned in onSubmit callback

### 2. Enhanced Service

**File**: `lib/services/visitServiceEnhanced.ts`

```typescript
import { visitServiceEnhanced } from '@/lib/services';

// Submit MOM with demos
const result = await visitServiceEnhanced.submitMoMWithDemos({
  visit_id: 'visit_123',
  open_points: [...],
  demos: [
    {
      product_name: 'Task',
      is_applicable: true,
      demo_completed: true,
      conversion_status: 'Converted'
    }
  ]
}, userProfile);

// Returns
{
  success: true,
  demos_created: true,
  demos_count: 1
}
```

### 3. API Endpoint

**File**: `app/api/data/visits/[visitId]/mom-with-demos/route.ts`

```typescript
// POST /api/data/visits/[visitId]/mom-with-demos
// Request body:
{
  visit_id: string;
  open_points: OpenPoint[];
  demos?: DemoData[];
  // ... other MOM fields
}

// Response:
{
  success: true,
  message: "MOM submitted successfully",
  data: {
    success: true,
    demos_created: boolean,
    demos_count?: number
  }
}
```

### 4. API Client

**File**: `lib/api-client.ts`

```typescript
import { api } from '@/lib/api';

// Use enhanced API
const result = await api.submitVisitMOMWithDemos({
  visit_id: visitId,
  open_points: [...],
  demos: [...]
});

// Or use original API (backward compatible)
const result = await api.submitVisitMOM({
  visit_id: visitId,
  open_points: [...]
});
```

## 🔄 Data Flow

### Complete Request Flow

```typescript
// 1. User submits form
handleSubmitMom(formData) {
  // formData includes demos array
}

// 2. Component calls API
const result = await api.submitVisitMOMWithDemos({
  visit_id: selectedVisit.visit_id,
  open_points: formData.open_points,
  demos: formData.demos  // Optional
});

// 3. API route authenticates and calls service
const result = await visitServiceEnhanced.submitMoMWithDemos(
  params,
  user
);

// 4. Service processes
// 4a. Submit MOM (existing logic)
await visitService.submitMoM(params, user);

// 4b. Process demos (new logic)
for (const demo of params.demos) {
  if (existingDemo) {
    await _updateExistingDemo(demo);
  } else {
    await _createNewDemo(demo);
  }
}

// 5. Return success
return {
  success: true,
  demos_created: true,
  demos_count: params.demos.length
};
```

## 🗄️ Database Schema

### Demos Table Structure

```typescript
interface Demo {
  demo_id: string;                    // Primary key
  brand_id: string;                   // Foreign key to master_data
  brand_name: string;
  product_name: string;               // One of 8 products
  agent_id: string;
  agent_name: string;
  team_name: string;
  
  // Step 1: Applicability
  is_applicable: boolean;
  non_applicable_reason?: string;
  step1_completed_at?: string;
  
  // Step 2: Usage Status
  usage_status?: string;
  step2_completed_at?: string;
  
  // Step 3: Scheduling
  demo_scheduled_date?: string;
  demo_scheduled_time?: string;
  demo_rescheduled_count?: number;
  
  // Step 4: Completion
  demo_completed?: boolean;
  demo_completed_date?: string;
  demo_conducted_by?: string;
  demo_completion_notes?: string;
  
  // Step 5: Conversion
  conversion_status?: string;
  non_conversion_reason?: string;
  conversion_decided_at?: string;
  
  // Metadata
  current_status: string;             // Auto-calculated
  workflow_completed: boolean;
  created_at: string;
  updated_at: string;
}
```

### Workflow States

```typescript
const WORKFLOW_STATES = {
  'Step 1 Pending': 'Initial state',
  'Not Applicable': 'Product not applicable',
  'Step 2 Pending': 'Applicability confirmed',
  'Step 3 Pending': 'Usage status set',
  'Step 4 Pending': 'Demo scheduled',
  'Step 5 Pending': 'Demo completed',
  'Workflow Completed': 'Conversion decided'
};
```

## 🧪 Testing

### Unit Tests

```typescript
// Test demo creation
describe('visitServiceEnhanced', () => {
  it('should create new demo', async () => {
    const result = await visitServiceEnhanced._createNewDemo(
      'brand_123',
      'Test Brand',
      'agent@test.com',
      'Agent Name',
      'Team A',
      {
        product_name: 'Task',
        is_applicable: true,
        demo_completed: true
      },
      userProfile
    );
    
    expect(result.demo_id).toBeDefined();
    expect(result.current_status).toBe('Step 5 Pending');
  });
});
```

### Integration Tests

```typescript
// Test full MOM + demo submission
describe('MOM with Demos', () => {
  it('should submit MOM and create demos', async () => {
    const response = await fetch('/api/data/visits/visit_123/mom-with-demos', {
      method: 'POST',
      body: JSON.stringify({
        visit_id: 'visit_123',
        open_points: [...],
        demos: [...]
      })
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.demos_created).toBe(true);
  });
});
```

## 🐛 Debugging

### Common Issues

#### 1. Brand ID Missing

```typescript
// Error: Brand ID not found in visit record
// Solution: Ensure visit has brand_id field
const visit = await getVisit(visitId);
if (!visit.brand_id) {
  console.error('Visit missing brand_id');
}
```

#### 2. Demo Creation Fails

```typescript
// Check Supabase logs
console.log('Creating demo:', demoData);
const { error } = await supabase.from('demos').insert(demoData);
if (error) {
  console.error('Demo creation error:', error);
}
```

#### 3. Authorization Issues

```typescript
// Verify user profile
console.log('User profile:', userProfile);
console.log('Normalized role:', normalizeUserProfile(userProfile).role);
```

### Debug Logging

```typescript
// Enable debug mode
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('📝 Submitting MOM with demos');
  console.log('Visit ID:', visitId);
  console.log('Demos count:', demos?.length);
  console.log('User:', user.email);
}
```

## 🔐 Security Considerations

### Authorization Checks

```typescript
// Service level
const isAuthorized = await visitService._authorizeVisitAccess(visit, user);
if (!isAuthorized) {
  throw new Error('Access denied');
}

// API level
const { user, error } = await authenticateRequest(request);
if (error) return error;
```

### Data Validation

```typescript
// Validate demo data
if (demo.is_applicable && !demo.demo_scheduled_date) {
  // Warning: Applicable demo without schedule
}

if (demo.demo_completed && !demo.conversion_status) {
  // Warning: Completed demo without conversion status
}
```

## 📝 Code Style

### TypeScript Types

```typescript
// Always define interfaces
interface DemoData {
  product_name: string;
  is_applicable: boolean;
  // ... other fields
}

// Use type safety
const demos: DemoData[] = formData.demos || [];
```

### Error Handling

```typescript
try {
  await visitServiceEnhanced.submitMoMWithDemos(params, user);
} catch (error) {
  console.error('Error submitting MOM with demos:', error);
  // Don't fail entire operation if demos fail
  return { success: true, demos_created: false, demo_error: error };
}
```

### Async/Await

```typescript
// Use async/await consistently
async function submitMoMWithDemos(params, user) {
  // Submit MOM first
  await visitService.submitMoM(params, user);
  
  // Then process demos
  for (const demo of params.demos) {
    await processDemo(demo);
  }
}
```

## 🚀 Deployment

### Environment Variables

```bash
# No new environment variables required
# Uses existing Supabase configuration
```

### Database Migrations

```sql
-- No schema changes required
-- Uses existing demos table
-- Ensure brand_id exists in visits table
```

### Rollback Plan

```typescript
// If issues occur, revert to old modal
import EnhancedSubmitMomModal from '@/components/modals/EnhancedSubmitMomModal';

// Old API still works
await api.submitVisitMOM(params);
```

## 📚 Additional Resources

- [Technical Documentation](./DEMO_MOM_INTEGRATION_GUIDE.md)
- [User Guide](./USER_GUIDE_DEMO_MOM.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Workflow Comparison](./WORKFLOW_COMPARISON.md)

## 💬 Support

For questions or issues:
1. Check console logs for errors
2. Review Supabase logs
3. Check this documentation
4. Contact the development team

## ✅ Checklist for New Developers

- [ ] Read this guide
- [ ] Review the enhanced modal component
- [ ] Understand the service layer
- [ ] Test the API endpoint
- [ ] Run local tests
- [ ] Review user guide
- [ ] Understand workflow states
- [ ] Know rollback procedure

---

**Happy Coding! 🎉**
