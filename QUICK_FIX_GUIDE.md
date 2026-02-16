# Quick Fix Guide - Churn Page Issues

## 🚀 IMMEDIATE ACTION REQUIRED

Your churn page has records in the wrong categories. Here's how to fix it:

### Step 1: Run the Comprehensive Fix Script

Open PowerShell in your project directory and run:

```powershell
.\FIX_ALL_CHURN_COMPREHENSIVE.ps1
```

This will:
- ✅ Fix ALL 300+ records at once
- ✅ Show you what's being fixed
- ✅ Take about 30-60 seconds
- ✅ Provide detailed results

### Step 2: Hard Refresh Your Browser

After the script completes:
- Press `Ctrl + Shift + R` (Windows)
- Or `Cmd + Shift + R` (Mac)

This clears your browser cache and loads fresh data.

### Step 3: Verify the Fix

Check your churn page:
- Overdue should show only records with no agent response older than 3 days
- Completed should show all records with completed reasons
- Records should NOT appear in multiple categories

## 🔍 What Was Fixed

### 1. Categorization Logic
Records are now categorized correctly:

**Completed** = Any of these:
- Has completed churn reason (7 reasons like "Permanently Closed", "Ownership Transferred", etc.)
- Has 3+ call attempts
- Has follow_up_status = "COMPLETED"

**Follow-Ups** = Agent has taken action:
- Has call attempts
- Has real churn reason (not "I don't know" or "KAM needs to respond")
- Has active follow-up

**Overdue** = No agent action + older than 3 days

**New Count** = No agent action + within last 3 days

### 2. Auto-Fix System
Every time you load the churn page, the system now:
- Automatically detects records with wrong status
- Fixes them in the database
- Updates the display

This means future records will be fixed automatically!

### 3. Visit Creation
Fixed the error when scheduling visits. You can now:
- Schedule visits from health checks page
- No more "convexAPI.createVisit is not a function" error

## 📋 Completed Churn Reasons (7 total)

These reasons automatically mark a record as COMPLETED:
1. "Outlet once out of Sync- now Active"
2. "Renewal Payment Overdue"
3. "Temporarily Closed (Renovation / Relocation/Internet issue)"
4. "Permanently Closed (Outlet/brand)"
5. "Event Account / Demo Account"
6. "Switched to Another POS"
7. "Ownership Transferred"

## 📋 Active Follow-Up Reasons (2 total)

These reasons keep a record in active follow-up:
1. "I don't know"
2. "KAM needs to respond"

## ❓ Troubleshooting

### Script won't run?
```powershell
# Make sure you have tsx installed
npm install -g tsx

# Or use npx
npx tsx scripts/fix-all-churn-records-comprehensive.ts
```

### Still seeing wrong counts?
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache completely
3. Check server logs for "🔧 Auto-fixing" messages
4. Try logging out and back in

### Records still in wrong category?
1. Check the record's churn_reason field
2. Check if it has call_attempts
3. Check the follow_up_status field
4. Contact dev team with the RID

## 📊 Expected Counts

After the fix, your counts should be:
- **Overdue**: Only records with no agent response older than 3 days
- **Completed**: All records with completed reasons + records with 3+ calls
- **Follow-Ups**: Records where agent has taken action but not completed
- **New Count**: Records with no agent response within last 3 days

## 🎯 Next Steps

1. ✅ Run the fix script
2. ✅ Hard refresh browser
3. ✅ Verify counts are correct
4. ✅ Test filling a churn reason (should move to correct category immediately)
5. ✅ Test scheduling a visit (should work without errors)

## 📞 Need Help?

If you still see issues:
1. Check server console for error messages
2. Check browser console for errors
3. Take screenshots of the issue
4. Note the RIDs of affected records
5. Contact the development team

---

**Remember**: The auto-fix runs on every page load, so even if you don't run the script, records will be fixed gradually as you use the system. But running the script fixes everything at once!
