# Quick Fix Reference Card

## 🔧 What Was Fixed

**Issue**: Demos not created when submitting MOM  
**Cause**: Missing brand_id in visits table  
**Fix**: Auto-lookup brand_id from master_data  

## ✅ Test Steps (2 minutes)

1. **Submit MOM with Demo**
   - Visits → Find visit → Submit MOM
   - Tab 3: Check "Applicable" for Task product
   - Submit

2. **Check Console (F12)**
   - Look for: `✅ Successfully processed 1 demos`

3. **Verify Database**
   ```sql
   SELECT * FROM demos 
   WHERE brand_name = 'Demo' 
   ORDER BY created_at DESC LIMIT 1;
   ```

4. **Check Demos Page**
   - Dashboard → Demos → Search brand → Should see demo

## 📊 Expected Console Output

```
📝 Submitting MOM with demos for visit: visit_xxx
📦 Demos included: 1
🔍 Looking up brand_id for brand: Demo
✅ Found brand_id: xxx for brand: Demo
✨ Creating new demo for: Task
✅ Successfully processed 1 demos
```

## 🚨 Troubleshooting

| Issue | Console Shows | Solution |
|-------|--------------|----------|
| Brand not found | `❌ Brand not found in master_data` | Check brand exists in master_data |
| No demos sent | `📦 Demos included: 0` | Check "Applicable" checkbox |
| Already exists | `🔄 Updating existing demo` | Normal - updating existing demo |

## 📁 Files Changed

- `lib/services/visitServiceEnhanced.ts` - Brand lookup logic
- `app/api/data/visits/[visitId]/mom-with-demos/route.ts` - Logging
- `app/dashboard/visits/page.tsx` - Interface update

## 🎯 Success Criteria

✅ Console shows "Successfully processed X demos"  
✅ SQL query returns demo record  
✅ Demos page shows the demo  
✅ No errors in console  

## 📞 Need Help?

Share:
1. Console logs (full output)
2. SQL query results
3. Brand name used
4. Any error messages

---
**Status**: ✅ Ready to Test  
**Time to Test**: 2 minutes  
**Expected Result**: Demo created successfully
