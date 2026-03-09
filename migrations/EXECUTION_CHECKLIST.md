# Brand Transfer Feature - Execution Checklist

## ✅ Pre-Execution Checklist

- [ ] Backup database (full backup recommended)
- [ ] Verify you have admin access to Supabase
- [ ] Ensure no active brand transfers are happening
- [ ] Notify team about maintenance window (optional, changes are non-disruptive)
- [ ] Have rollback plan ready (database backup)

---

## 📋 PHASE 1: Database Schema Changes (5 minutes)

### Step 1: Run Migration Script
```bash
# In Supabase SQL Editor, run:
migrations/001_add_transfer_tracking_columns.sql
```

**Expected Output:**
- ✅ demos.completed_by_agent_id column added successfully
- ✅ visits.completed_by_agent_id column added successfully
- ✅ master_data.kam_history column added successfully
- 8 rows showing all new columns

### Step 2: Verify Migration
```bash
# In Supabase SQL Editor, run:
migrations/verify_migration_001.sql
```

**Expected Output:**
- ✅ All 8 columns added successfully
- ✅ Demos table data intact
- ✅ Visits table data intact
- ✅ Master data table intact
- All columns show "✅ Nullable (Safe)"

**If any errors occur:**
- [ ] Check error message
- [ ] Verify table names are correct
- [ ] Ensure you have ALTER TABLE permissions
- [ ] Contact DBA if needed

---

## 📋 PHASE 2: Backfill Historical Data (10 minutes)

### Step 3: Run Backfill Script
```bash
# In Supabase SQL Editor, run:
migrations/002_backfill_historical_data.sql
```

**Expected Output:**
- 📊 Shows count of records to backfill
- ✅ All completed demos have completed_by fields
- ✅ All completed visits have completed_by fields
- ✅ All brands have kam_history initialized
- Summary table showing 0 missing_completed_by

### Step 4: Verify Backfill
```bash
# Run these queries to spot-check:

-- Check demos
SELECT demo_id, agent_id, completed_by_agent_id, demo_completed
FROM demos
WHERE demo_completed = true
LIMIT 10;

-- Check visits
SELECT visit_id, agent_id, completed_by_agent_id, visit_status
FROM visits
WHERE visit_status = 'Completed'
LIMIT 10;

-- Verify agent_id = completed_by_agent_id for completed records
```

**Expected:**
- agent_id should equal completed_by_agent_id for all completed records
- No NULL values in completed_by_agent_id for completed records

**If any errors occur:**
- [ ] Check which records failed
- [ ] Manually update failed records
- [ ] Re-run backfill script (it's safe to run multiple times)

---

## 📋 PHASE 3: Update Application Code (30 minutes)

### Step 5: Update Demo Service

**File:** `lib/services/demoService.ts`

Follow instructions in: `migrations/003_code_changes_demoService.md`

**Changes:**
1. [ ] Update `completeDemo` function (add completed_by fields)
2. [ ] Update `bulkCompleteDemo` function (add completed_by fields)
3. [ ] Add `transferBrandDemos` function (copy from migration doc)

**Test after changes:**
```bash
# Run TypeScript compiler to check for errors
npm run build
# or
npx tsc --noEmit
```

### Step 6: Update Visit Service

**File:** `lib/services/visitServiceEnhanced.ts`

Follow instructions in: `migrations/004_code_changes_visitService.md`

**Changes:**
1. [ ] Update `createOrUpdateDemoInVisit` function (add completed_by fields)
2. [ ] Update the updateData section (add completed_by fields)

**File:** `lib/services/visitService.ts`

**Changes:**
3. [ ] Add `transferBrandVisits` function (copy from migration doc)

**Test after changes:**
```bash
npm run build
```

### Step 7: Verify New Files Created

Check that these files exist:
- [ ] `lib/services/brandTransferService.ts`
- [ ] `lib/services/index.ts` (updated with brandTransferService export)
- [ ] `app/api/admin/transfer-brand/route.ts`
- [ ] `app/api/admin/transferable-brands/route.ts`
- [ ] `app/admin/transfer-brand/page.tsx`

### Step 8: Build and Test Locally

```bash
# Install dependencies (if needed)
npm install

# Build the project
npm run build

# Run locally
npm run dev
```

**Test checklist:**
- [ ] Application starts without errors
- [ ] No TypeScript compilation errors
- [ ] No console errors on page load
- [ ] Can navigate to admin pages

---

## 📋 PHASE 4: Deploy to Production (10 minutes)

### Step 9: Deploy Application

```bash
# Commit changes
git add .
git commit -m "feat: Add brand transfer functionality with historical tracking"

# Push to repository
git push origin main

# Deploy (depends on your deployment method)
# Vercel: Automatic deployment on push
# Other: Follow your deployment process
```

### Step 10: Verify Deployment

- [ ] Check deployment logs for errors
- [ ] Visit production site
- [ ] Check browser console for errors
- [ ] Test login

---

## 📋 PHASE 5: Testing in Production (20 minutes)

### Step 11: Test Existing Functionality (Regression Testing)

**Test that nothing broke:**

1. [ ] **Login** - Can users log in?
2. [ ] **View Demos** - Can agents see their demos?
3. [ ] **Complete Demo** - Can agents complete a demo?
4. [ ] **View Visits** - Can agents see their visits?
5. [ ] **Create Visit** - Can agents create a visit?
6. [ ] **Demo Statistics** - Do statistics load correctly?
7. [ ] **Visit Statistics** - Do statistics load correctly?

**If any test fails:**
- [ ] Check browser console for errors
- [ ] Check server logs
- [ ] Verify database queries are working
- [ ] Rollback if critical functionality is broken

### Step 12: Test New Transfer Functionality

**Access Transfer Page:**
1. [ ] Login as Admin or Team Lead
2. [ ] Navigate to `/admin/transfer-brand`
3. [ ] Page loads without errors

**Test Transfer Flow:**
1. [ ] Select a brand from dropdown
2. [ ] Current KAM displays correctly
3. [ ] Select new KAM from dropdown
4. [ ] Enter transfer reason
5. [ ] Click "Preview Transfer"
6. [ ] Preview shows correct information
7. [ ] Click "Confirm Transfer"
8. [ ] Transfer completes successfully
9. [ ] Success message displays

**Verify Transfer Results:**
1. [ ] Check master_data table - kam_email_id updated
2. [ ] Check demos table - agent_id updated, completed_by_agent_id preserved
3. [ ] Check visits table - agent_id updated, completed_by_agent_id preserved
4. [ ] New KAM can see the transferred brand
5. [ ] Old KAM no longer sees the brand
6. [ ] Completed work still credited to old KAM in statistics

**SQL Verification Queries:**
```sql
-- Check a transferred brand
SELECT 
  id,
  brand_name,
  kam_email_id,
  kam_history
FROM master_data
WHERE id = 'BRAND_ID_HERE';

-- Check transferred demos
SELECT 
  demo_id,
  product_name,
  agent_id,
  completed_by_agent_id,
  demo_completed,
  transfer_history
FROM demos
WHERE brand_id = 'BRAND_ID_HERE';

-- Check transferred visits
SELECT 
  visit_id,
  agent_id,
  completed_by_agent_id,
  visit_status,
  transfer_history
FROM visits
WHERE brand_id = 'BRAND_ID_HERE';
```

---

## 📋 PHASE 6: Post-Deployment (Ongoing)

### Step 13: Monitor for Issues

**First 24 hours:**
- [ ] Monitor error logs
- [ ] Check for user complaints
- [ ] Verify statistics are accurate
- [ ] Watch for performance issues

**First week:**
- [ ] Collect user feedback
- [ ] Monitor transfer usage
- [ ] Verify data integrity
- [ ] Check for edge cases

### Step 14: Documentation

- [ ] Update user documentation
- [ ] Train admins/team leads on transfer process
- [ ] Document any issues encountered
- [ ] Create FAQ for common questions

---

## 🚨 Rollback Plan (If Needed)

### If Critical Issues Occur:

1. **Immediate Rollback:**
   ```bash
   # Revert code changes
   git revert HEAD
   git push origin main
   
   # Redeploy previous version
   ```

2. **Database Rollback (if needed):**
   ```sql
   -- Remove new columns (data will be lost)
   ALTER TABLE demos DROP COLUMN IF EXISTS completed_by_agent_id;
   ALTER TABLE demos DROP COLUMN IF EXISTS completed_by_agent_name;
   ALTER TABLE demos DROP COLUMN IF EXISTS transfer_history;
   
   ALTER TABLE visits DROP COLUMN IF EXISTS completed_by_agent_id;
   ALTER TABLE visits DROP COLUMN IF EXISTS completed_by_agent_name;
   ALTER TABLE visits DROP COLUMN IF EXISTS transfer_history;
   
   ALTER TABLE master_data DROP COLUMN IF EXISTS kam_history;
   ALTER TABLE master_data DROP COLUMN IF EXISTS current_kam_assigned_date;
   ```

3. **Restore from Backup (if needed):**
   - Use Supabase backup restore feature
   - Restore to point before migration

---

## ✅ Success Criteria

The implementation is successful when:

- [ ] All database migrations completed without errors
- [ ] All code changes deployed successfully
- [ ] No regression in existing functionality
- [ ] Transfer page is accessible to admins/team leads
- [ ] Brand transfers work correctly
- [ ] Historical data is preserved
- [ ] Metrics remain accurate
- [ ] No performance degradation
- [ ] No user complaints about broken features

---

## 📞 Support Contacts

**If you encounter issues:**
- Database Issues: [DBA Contact]
- Code Issues: [Dev Team Lead]
- Deployment Issues: [DevOps Contact]
- User Issues: [Support Team]

---

## 📝 Notes

- This migration is designed to be non-disruptive
- All changes are backward compatible
- Existing data is preserved
- New columns are nullable
- Rollback is possible at any stage
- No downtime required

**Estimated Total Time:** 2-3 hours (including testing)

**Risk Level:** LOW (backward compatible, non-destructive)

**Recommended Execution Time:** During low-traffic hours (optional)
