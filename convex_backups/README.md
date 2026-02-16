# Convex Table Backups

## Overview
This directory contains backups of the Master_Data and user_profiles tables from the Convex database.

**Backup Date:** February 5, 2026  
**Convex Deployment:** opulent-rabbit-360.convex.cloud  
**Total Records Backed Up:** 1,450

## Tables Backed Up

### 1. Master_Data Table
- **Records:** 1,389
- **Description:** Restaurant/Business data including brand information, KAM assignments, zones, and outlet counts
- **Key Fields:** brandName, kamName, kamEmailId, zone, brandState, outlet_counts

### 2. user_profiles Table  
- **Records:** 61
- **Description:** User authentication and profile data including roles, teams, and contact information
- **Key Fields:** email, full_name, role, team_name, is_active

## File Structure

```
convex_backups/
├── master_data_backup_2026-02-05_07-54-39-688Z.json     # Master_Data in JSON format
├── master_data_backup_2026-02-05_07-54-39-688Z.csv      # Master_Data in CSV format
├── user_profiles_backup_2026-02-05_07-54-39-688Z.json   # user_profiles in JSON format
├── user_profiles_backup_2026-02-05_07-54-39-688Z.csv    # user_profiles in CSV format
├── complete_backup_2026-02-05_07-54-39-688Z.json        # Combined backup with metadata
├── backup_summary_2026-02-05_07-54-39-688Z.txt          # Human-readable summary
└── README.md                                             # This documentation file
```

## File Formats

### JSON Files
- Complete data export with all fields
- Preserves data types and structure
- Suitable for programmatic restoration
- Includes Convex internal fields (_id, _creationTime)

### CSV Files
- Tabular format for easy viewing in spreadsheet applications
- Excludes Convex internal fields
- Suitable for data analysis and reporting
- Compatible with Excel, Google Sheets, etc.

### Combined Backup
- Single file containing both tables
- Includes backup metadata and schema information
- Recommended for complete system restoration

## Data Security Notes

⚠️ **Important Security Information:**
- user_profiles backup contains password hashes
- Backup files should be stored securely
- Access should be restricted to authorized personnel only
- Consider encrypting backup files for additional security

## Restoration Instructions

### Using JSON Backups
```javascript
// Example restoration code
const masterData = require('./master_data_backup_2026-02-05_07-54-39-688Z.json');
const userProfiles = require('./user_profiles_backup_2026-02-05_07-54-39-688Z.json');

// Restore to Convex using bulk import functions
await client.mutation("Master_Data:bulkImportMasterData", { records: masterData });
// Note: user_profiles restoration would need a similar bulk import function
```

### Using CSV Backups
- Import into spreadsheet applications for analysis
- Use for data migration to other systems
- Convert back to JSON if needed for restoration

## Verification

Run the verification script to check backup integrity:
```bash
node verify_backups.js
```

## Backup Scripts

The following scripts were used to create these backups:
- `create_table_backups.js` - Main backup creation script
- `verify_backups.js` - Backup verification and integrity check

## Contact

For questions about these backups or restoration procedures, contact the development team.

---
*Backup created automatically by Convex backup script*