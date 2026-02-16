# Fix Master Data Duplicates

## Quick Fix (One Command)

Your master_data table has 2,129 records but should have ~1,390. There are 743 exact duplicates.

### Run This:

```bash
node scripts/fix-master-data.js
```

This interactive script will:
1. ✅ Show you the current situation
2. ✅ Display duplicate examples
3. ✅ Ask for confirmation
4. ✅ Remove duplicates safely
5. ✅ Verify the results

**Expected Result**: 2,129 → 1,386 records

---

## Alternative: Manual Control

### Preview Only (Safe)
```bash
node scripts/remove-exact-duplicates.js
```

### Remove Duplicates
```bash
node scripts/remove-exact-duplicates.js --delete
```

---

## What Gets Removed?

- **743 duplicate records** where ALL fields are identical
- Keeps the **oldest record** (earliest created_at)
- Deletes newer duplicates

## Why Are There Duplicates?

Likely from data import/migration on February 5, 2026.

## More Details

See `MASTER_DATA_CLEANUP_SUMMARY.md` for complete analysis.
