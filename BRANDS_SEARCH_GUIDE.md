# "Your Brands" Search Functionality Guide

## Location
`http://localhost:3000/dashboard/visits` - Section: "Your Brands (Visit Quota for 2026)"

---

## ✅ What Can You Search For?

The search functionality in the "Your Brands" section searches across **5 fields**:

### 1. **Brand Name** ✅
- Example: `"Starbucks"`, `"McDonald's"`, `"Pizza Hut"`
- Searches in: `brand_name` field
- Case-insensitive partial match

### 2. **Brand Email ID** ✅ (ALREADY SUPPORTED!)
- Example: `"starbucks@example.com"`, `"contact@mcdonalds.com"`
- Searches in: `brand_email_id` field
- Case-insensitive partial match
- **This is what you requested - it's already working!**

### 3. **KAM Name** (Key Account Manager)
- Example: `"John Doe"`, `"Sarah Kumar"`
- Searches in: `kam_name` field
- Case-insensitive partial match

### 4. **KAM Email ID**
- Example: `"john.doe@company.com"`, `"sarah@company.com"`
- Searches in: `kam_email_id` field
- Case-insensitive partial match

### 5. **Zone**
- Example: `"North"`, `"South"`, `"East"`, `"West"`
- Searches in: `zone` field
- Case-insensitive partial match

---

## 🔍 How It Works

### Search Implementation
```typescript
// From lib/services/masterDataService.ts (lines 86-93)
if (search) {
  const searchTerm = search.toLowerCase();
  records = records.filter(record => 
    record.brand_name.toLowerCase().includes(searchTerm) ||
    record.kam_name.toLowerCase().includes(searchTerm) ||
    record.kam_email_id.toLowerCase().includes(searchTerm) ||
    record.zone.toLowerCase().includes(searchTerm) ||
    (record.brand_email_id && record.brand_email_id.toLowerCase().includes(searchTerm))
  );
}
```

### Key Features
- **Case-Insensitive**: Works with any case (EMAIL@EXAMPLE.COM = email@example.com)
- **Partial Match**: Finds results containing your search term anywhere
- **Multi-Field**: Searches across all 5 fields simultaneously
- **OR Logic**: Returns results if ANY field matches
- **Null-Safe**: Handles brands without email addresses gracefully

---

## 💡 Search Examples

### Example 1: Search by Brand Name
```
Search: "star"
Results: Brands with "star" in name (e.g., "Starbucks", "Star Pizza")
```

### Example 2: Search by Brand Email ID ⭐ NEW
```
Search: "starbucks@"
Results: Brands with "starbucks@" in email (e.g., "starbucks@example.com")

Search: "@gmail.com"
Results: All brands with Gmail addresses

Search: "contact@"
Results: All brands with "contact@" in their email
```

### Example 3: Search by KAM Name
```
Search: "john"
Results: Brands managed by KAMs with "john" in name (e.g., "John Doe", "Johnny Smith")
```

### Example 4: Search by KAM Email
```
Search: "john.doe@"
Results: Brands managed by john.doe@company.com
```

### Example 5: Search by Zone
```
Search: "north"
Results: All brands in North zone
```

### Example 6: Combined Search
```
Search: "example.com"
Results: Could match:
- Brands with "example.com" in brand_email_id
- Brands with "example.com" in kam_email_id
```

---

## 📋 Complete Searchable Fields List

| Field | Example | Description |
|-------|---------|-------------|
| **Brand Name** | `"Starbucks"` | Restaurant/brand name |
| **Brand Email ID** ⭐ | `"starbucks@example.com"` | Brand's email address |
| **KAM Name** | `"John Doe"` | Account manager's name |
| **KAM Email ID** | `"john@company.com"` | Account manager's email |
| **Zone** | `"North"` | Geographic zone |

---

## 🎯 Specific Use Cases

### Find Brand by Email
```
Search: "brand@example.com"
Result: Shows the specific brand with that email
```

### Find All Brands with Gmail
```
Search: "@gmail.com"
Result: Shows all brands using Gmail addresses
```

### Find All Brands with Specific Domain
```
Search: "@starbucks.com"
Result: Shows all Starbucks-related brands
```

### Find Brands by Email Prefix
```
Search: "contact@"
Result: Shows all brands with emails starting with "contact@"
```

### Find Brands by Email Username
```
Search: "info@"
Result: Shows all brands with "info@" in their email
```

---

## ❌ What You CANNOT Search By

The following fields are NOT included in the search:

- ❌ Brand ID
- ❌ Outlet counts
- ❌ Brand state
- ❌ Created/Updated dates
- ❌ Secondary KAM name

---

## 📝 How to Use the Search

### Step 1: Locate the Search Box
- Find the search box in the "Your Brands (Visit Quota for 2026)" section
- It's above the horizontal scrolling brand cards

### Step 2: Type Your Search Term
- Enter brand name, brand email, KAM name, KAM email, or zone
- Can be partial text (e.g., "star" or "@gmail")

### Step 3: Click Search Button
- Click the "Search" button OR
- Press Enter key

### Step 4: View Results
- Brand cards are filtered immediately
- Only matching brands are displayed

### Step 5: Clear Search
- Delete the search term
- Click Search button or press Enter
- All brands will be displayed again

---

## 🔄 Search Behavior

### Auto-Clear
- If you clear the search box (empty string), it automatically shows all brands
- No need to click search button for clearing

### Manual Search
- For non-empty search terms, you must click the Search button or press Enter
- This prevents unnecessary API calls while typing

### Role-Based Filtering
Search results are filtered by your role FIRST, then by search term:

- **Agent**: Searches only in YOUR assigned brands
- **Team Lead**: Searches only in YOUR TEAM's brands
- **Admin**: Searches in ALL brands

---

## 💻 Technical Details

### API Endpoint
```
GET /api/data/master-data?search={searchTerm}
```

### Search Fields (in order)
1. `brand_name` - Brand/restaurant name
2. `kam_name` - Key Account Manager name
3. `kam_email_id` - KAM's email address
4. `zone` - Geographic zone
5. `brand_email_id` - Brand's email address ⭐

### Search Logic
- **Type**: Substring match (contains)
- **Case**: Insensitive
- **Operator**: OR (matches any field)
- **Trim**: Whitespace removed from search term
- **Null-Safe**: Handles missing brand_email_id

---

## 🎨 Tips for Better Search Results

### 1. Use Email Domains
```
✅ "@gmail.com" - Find all Gmail brands
✅ "@starbucks.com" - Find all Starbucks brands
✅ "@company.com" - Find all brands from specific company
```

### 2. Use Email Prefixes
```
✅ "contact@" - Find brands with contact emails
✅ "info@" - Find brands with info emails
✅ "support@" - Find brands with support emails
```

### 3. Use Partial Emails
```
✅ "starbucks@" - Find Starbucks email addresses
✅ "@example" - Find all example.com domains
```

### 4. Combine with Other Fields
```
✅ "north" - Could match zone OR email with "north"
✅ "john" - Could match KAM name OR email
```

### 5. Use Specific Terms
```
✅ Good: "starbucks@example.com"
❌ Too broad: "@"
```

---

## 🔍 Common Search Queries

### Find Brand by Exact Email
```
Search: "brand@example.com"
```

### Find All Gmail Brands
```
Search: "@gmail.com"
```

### Find All Brands in North Zone
```
Search: "north"
```

### Find Brands Managed by Specific KAM
```
Search: "john.doe@company.com"
```

### Find Brands with Specific Email Pattern
```
Search: "contact@"
```

### Find Brands by Name
```
Search: "Starbucks"
```

---

## 🐛 Troubleshooting

### No Results Found?
1. Check spelling of email address
2. Try partial email (e.g., "@gmail" instead of "@gmail.com")
3. Try different field (e.g., brand name instead of email)
4. Clear search and verify brands exist

### Too Many Results?
1. Use more specific email address
2. Include full domain (e.g., "@starbucks.com")
3. Use exact email address

### Search Not Working?
1. Make sure to click Search button or press Enter
2. Check if you have permission to view brands
3. Verify you're logged in
4. Check console for errors

### Brand Email Not Showing in Results?
1. Verify the brand has an email address in the database
2. Check if email field is populated
3. Try searching by brand name first to verify brand exists

---

## 📊 Search Statistics

After searching, you'll see:
- Total number of brands found
- Filtered brand cards
- Visit quota information for each brand
- Scheduled/Done visit counts

---

## 🎯 Summary

**Searchable Fields:**
1. ✅ Brand Name
2. ✅ Brand Email ID ⭐ (What you requested!)
3. ✅ KAM Name
4. ✅ KAM Email ID
5. ✅ Zone

**Search Type:** Case-insensitive partial match across all fields

**How to Search:** Type term → Click Search button or press Enter

**Clear Search:** Delete term → Click Search or press Enter

---

## ⭐ IMPORTANT NOTE

**Brand Email ID search is ALREADY WORKING!** 

You can search by brand email right now. Just type the email address (or part of it) in the search box and click Search.

Examples that work RIGHT NOW:
- `"starbucks@example.com"` - Find specific brand
- `"@gmail.com"` - Find all Gmail brands
- `"contact@"` - Find all brands with contact emails

---

**Quick Reference:**
- Brand Name: `"Starbucks"`, `"McDonald's"`
- Brand Email: `"brand@example.com"`, `"@gmail.com"` ⭐
- KAM Name: `"John Doe"`, `"Sarah"`
- KAM Email: `"john@company.com"`
- Zone: `"North"`, `"South"`

---

**Date**: February 19, 2026
**Location**: `/dashboard/visits` → "Your Brands" section
**API**: `/api/data/master-data?search={term}`
**Status**: ✅ Brand Email ID search is ALREADY SUPPORTED!
