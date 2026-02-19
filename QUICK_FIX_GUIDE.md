# Health Check Fix - Quick Reference

## 🚀 What Was Fixed

The Assessment tab was showing 0 brands despite 49 being pending. This was caused by incorrect filtering logic that excluded brands across all agents when any agent assessed them.

## ✅ What Changed

**File:** `lib/services/healthCheckService.ts`
- Fixed `getBrandsForAssessment()` to use KAM-specific filtering
- Each agent now sees only their own pending brands

**File:** `app/api/data/health-checks/clear-cache/route.ts`
- Added statistics cache clearing

## 🔧 How to Apply the Fix

### Step 1: Deploy the Changes
The code changes are already made. Just deploy:
```bash
npm run build
# Restart your application
```

### Step 2: Clear Cache
1. Open the Health Check-ups page
2. Click the "Clear Cache" button (🗑️)
3. Refresh the page

### Step 3: Verify
- Assessment tab should now show 49 brands
- Progress should show: 50 total, 1 completed, 49 remaining

## 🐛 If Brands Still Don't Show

### Quick Checks
1. **Check browser console** - Look for error messages
2. **Verify user email** - Make sure it matches `kam_email_id` in database
3. **Check user role** - Should be "Agent", "Team Lead", or "Admin"

### Run Diagnostic Query
```sql
-- Replace [USER_EMAIL] with actual email
SELECT 
  (SELECT COUNT(*) FROM master_data WHERE kam_email_id = '[USER_EMAIL]') as total_brands,
  (SELECT COUNT(*) FROM health_checks WHERE kam_email = '[USER_EMAIL]' AND assessment_month = '2026-02') as assessed,
  (SELECT COUNT(*) FROM master_data md WHERE kam_email_id = '[USER_EMAIL]' 
   AND NOT EXISTS (
     SELECT 1 FROM health_checks hc 
     WHERE LOWER(TRIM(hc.brand_name)) = LOWER(TRIM(md.brand_name))
     AND hc.kam_email = '[USER_EMAIL]'
     AND hc.assessment_month = '2026-02'
   )) as pending;
```

### Fix Data Issues
Run this to fix common problems:
```sql
-- Trim whitespace from brand names
UPDATE master_data SET brand_name = TRIM(brand_name) WHERE brand_name != TRIM(brand_name);
UPDATE health_checks SET brand_name = TRIM(brand_name) WHERE brand_name != TRIM(brand_name);

-- Normalize emails
UPDATE master_data md SET kam_email_id = up.email 
FROM user_profiles up 
WHERE LOWER(md.kam_email_id) = LOWER(up.email) AND md.kam_email_id != up.email;
```

## 📊 Expected Results

### Before Fix
```
Assessment Progress:
  Total: 50
  Completed: 1
  Remaining: 49

Brands Pending Assessment: (0)
  ✓ All brands assessed for this month!
```

### After Fix
```
Assessment Progress:
  Total: 50
  Completed: 1
  Remaining: 49

Brands Pending Assessment: (49)
  [Grid showing 49 brand cards]
```

## 📝 Testing Checklist

- [ ] Clear cache button works
- [ ] 49 brands appear in Assessment tab
- [ ] Can click on a brand to open assessment modal
- [ ] Can submit an assessment
- [ ] Brand disappears from pending list after assessment
- [ ] Counts update correctly (48 remaining)
- [ ] Assessment appears in History tab
- [ ] Statistics tab shows correct numbers

## 🆘 Need Help?

### Check These Files
1. `HEALTH_CHECK_COMPLETE_FIX.md` - Full technical details
2. `test-health-check-fix.md` - Detailed testing guide
3. `diagnose-health-check-issue.sql` - Diagnostic queries
4. `fix-health-check-data-integrity.sql` - Data fixes

### Common Issues

**Issue:** "Authentication required" error
**Fix:** User needs to log in again

**Issue:** Brands show but can't assess
**Fix:** Check user permissions and role

**Issue:** Assessment saves but brand doesn't disappear
**Fix:** Clear cache and refresh page

**Issue:** Wrong brand count
**Fix:** Run data integrity fixes in `fix-health-check-data-integrity.sql`

## 🎯 Success Indicators

✅ Assessment tab shows correct number of brands
✅ Each agent sees only their own pending brands
✅ Assessing a brand updates counts immediately
✅ No console errors
✅ History tab shows all assessments
✅ Statistics are accurate

## 📞 Escalation

If the fix doesn't work:
1. Collect browser console logs
2. Run diagnostic SQL queries
3. Check network tab for API errors
4. Note user email and role
5. Document steps to reproduce

---

**Quick Start:** Deploy → Clear Cache → Verify 49 brands appear → Test assessment flow → Done! ✨
