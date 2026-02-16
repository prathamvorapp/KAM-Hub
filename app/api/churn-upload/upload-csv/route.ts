import { NextRequest, NextResponse } from 'next/server';
import { ChurnCSVRowSchema } from '../../../../lib/models/churn';
import { UserRole } from '../../../../lib/models/user';
import { churnService } from '../../../../lib/services';
import { getAuthenticatedUser } from '../../../../lib/auth-helpers';
import { sanitizeInput, sanitizeFileName } from '../../../../lib/sanitize';
import csv from 'csv-parser';
import { Readable } from 'stream';

// Parse CSV data from buffer with sanitization
const parseCSVFromBuffer = (buffer: Buffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const stream = Readable.from(buffer.toString());
    
    stream
      .pipe(csv())
      .on('data', (data) => {
        // Trim whitespace from all values
        const trimmedData: any = {};
        for (const [key, value] of Object.entries(data)) {
          trimmedData[key.trim()] = typeof value === 'string' ? value.trim() : value;
        }
        results.push(trimmedData);
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Convert DD-MM-YYYY to a standardized format for storage
const convertDateFormat = (dateStr: string): string => {
  // Handle different possible formats and clean the input
  const cleanDate = dateStr.trim();
  
  // Input: DD-MM-YYYY (e.g., "30-01-2026")
  // Also handle: DD/MM/YYYY, DD.MM.YYYY
  const dateRegex = /^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{4})$/;
  const match = cleanDate.match(dateRegex);
  
  if (!match) {
    throw new Error(`Invalid date format: "${dateStr}". Expected DD-MM-YYYY, DD/MM/YYYY, or DD.MM.YYYY`);
  }
  
  const [, day, month, year] = match;
  
  // Pad with zeros if needed
  const paddedDay = day.padStart(2, '0');
  const paddedMonth = month.padStart(2, '0');
  
  // Validate the date components
  const dayNum = parseInt(paddedDay, 10);
  const monthNum = parseInt(paddedMonth, 10);
  const yearNum = parseInt(year, 10);
  
  if (dayNum < 1 || dayNum > 31) {
    throw new Error(`Invalid day: ${day}. Must be between 1-31`);
  }
  
  if (monthNum < 1 || monthNum > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1-12`);
  }
  
  if (yearNum < 2020 || yearNum > 2030) {
    throw new Error(`Invalid year: ${year}. Must be between 2020-2030`);
  }
  
  // Return the standardized date format DD-MM-YYYY (consistent with Convex storage)
  return `${paddedDay}-${paddedMonth}-${year}`;
};

// Transform CSV row to churn record format matching Convex schema
const transformCSVRowToChurnRecord = (row: any, uploadedBy: string) => {
  const now = new Date().toISOString();
  
  return {
    date: convertDateFormat(row.Date), // Convert and validate the date format
    rid: sanitizeInput(String(row.RID), 50), // Sanitize and ensure RID is string
    restaurant_name: sanitizeInput(row['Restaurant Name'], 200),
    brand_name: sanitizeInput(row['Brand Name'] || '', 200), // Optional field
    owner_email: sanitizeInput(row['Owner Email ID'], 100),
    kam: sanitizeInput(row.KAM, 100),
    sync_days: '', // Will be calculated or filled later
    zone: '', // Will be filled from master data or defaults
    controlled_status: 'Churned', // Default status for uploaded records
    churn_reason: '', // Empty initially, to be filled by agents
    remarks: '', // Empty initially
    mail_sent_confirmation: false, // Default false
    date_time_filled: '', // Empty initially
    uploaded_by: uploadedBy,
    uploaded_at: now,
    created_at: now,
    updated_at: now,
  };
};

// Check if user is BO Team
const isBOTeamMember = (userRole: string, userTeam?: string): boolean => {
  return userRole === UserRole.ADMIN || 
         userTeam?.toLowerCase() === 'bo' ||
         userTeam?.toLowerCase() === 'bo team';
};

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        detail: 'User not authenticated'
      }, { status: 401 });
    }

    // Check if user is BO team member (Admin can upload)
    if (!isBOTeamMember(user.role, user.team_name || '')) {
      return NextResponse.json({
        success: false,
        error: 'Access denied',
        detail: 'Only BO Team members and Admins can upload CSV files'
      }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('csvFile') as File;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file uploaded',
        detail: 'Please select a CSV file to upload'
      }, { status: 400 });
    }

    // Validate file type
    const sanitizedFileName = sanitizeFileName(file.name);
    if (!sanitizedFileName.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type',
        detail: 'Only CSV files are allowed'
      }, { status: 400 });
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: 'File too large',
        detail: 'File size must be less than 10MB'
      }, { status: 400 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`📤 CSV upload started by: ${user.email}`);
      console.log(`📁 File: ${sanitizedFileName}, Size: ${file.size} bytes`);
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse CSV data
    const csvData = await parseCSVFromBuffer(buffer);
    console.log(`📊 Parsed ${csvData.length} rows from CSV`);
    console.log(`🔍 Incoming Data Sample:`, csvData[0]);
    console.log(`🔍 All column headers:`, csvData[0] ? Object.keys(csvData[0]) : 'No data');

    if (csvData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Empty CSV file',
        detail: 'The uploaded CSV file contains no data rows'
      }, { status: 400 });
    }

    // Validate CSV structure and data
    const validationResults = {
      valid: [] as any[],
      invalid: [] as any[],
      duplicates: [] as any[],
    };

    const seenRIDs = new Set<string>();

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // +2 because CSV starts from row 1 and we skip header

      console.log(`🔍 Processing row ${rowNumber}:`, row);

      try {
        // Validate row structure
        const validatedRow = ChurnCSVRowSchema.parse(row);
        console.log(`✅ Row ${rowNumber} passed schema validation`);
        
        // Additional date format validation
        try {
          convertDateFormat(validatedRow.Date);
          console.log(`✅ Row ${rowNumber} passed date validation`);
        } catch (dateError: any) {
          console.log(`❌ Row ${rowNumber} failed date validation:`, dateError.message);
          validationResults.invalid.push({
            row: rowNumber,
            data: row,
            error: `Date validation failed: ${dateError.message}`
          });
          continue;
        }
        
        // Check for duplicate RIDs within the file
        if (seenRIDs.has(validatedRow.RID)) {
          console.log(`❌ Row ${rowNumber} has duplicate RID: ${validatedRow.RID}`);
          validationResults.duplicates.push({
            row: rowNumber,
            rid: validatedRow.RID,
            error: 'Duplicate RID in file'
          });
          continue;
        }
        
        seenRIDs.add(validatedRow.RID);
        validationResults.valid.push({
          ...validatedRow,
          rowNumber
        });
        console.log(`✅ Row ${rowNumber} added to valid rows`);

      } catch (error: any) {
        console.log(`❌ Row ${rowNumber} failed schema validation:`, error);
        validationResults.invalid.push({
          row: rowNumber,
          data: row,
          error: error.errors || String(error)
        });
      }
    }

    console.log(`✅ Valid rows: ${validationResults.valid.length}`);
    console.log(`❌ Invalid rows: ${validationResults.invalid.length}`);
    console.log(`🔄 Duplicate rows: ${validationResults.duplicates.length}`);

    // If there are validation errors, return them
    if (validationResults.invalid.length > 0 || validationResults.duplicates.length > 0) {
      console.log(`❌ Validation failed - Invalid: ${validationResults.invalid.length}, Duplicates: ${validationResults.duplicates.length}`);
      console.log(`❌ Invalid rows details:`, validationResults.invalid);
      console.log(`❌ Duplicate rows details:`, validationResults.duplicates);
      
      return NextResponse.json({
        success: false,
        error: 'CSV validation failed',
        detail: 'Some rows in the CSV file have validation errors',
        validation_results: validationResults,
        summary: {
          total_rows: csvData.length,
          valid_rows: validationResults.valid.length,
          invalid_rows: validationResults.invalid.length,
          duplicate_rows: validationResults.duplicates.length
        }
      }, { status: 400 });
    }

    // Transform valid rows to churn record format
    const churnRecords = validationResults.valid.map(row => 
      transformCSVRowToChurnRecord(row, user.email)
    );

    // Check for existing RIDs in database
    console.log('🔍 Checking for existing RIDs in database...');
    const existingRIDs = await churnService.checkExistingChurnRIDs(
      churnRecords.map(record => record.rid)
    );

    const newRecords = churnRecords.filter(record => !existingRIDs.includes(record.rid));
    const existingRecords = churnRecords.filter(record => existingRIDs.includes(record.rid));

    console.log(`🆕 New records to import: ${newRecords.length}`);
    console.log(`🔄 Existing records (will be skipped): ${existingRecords.length}`);

    // Import new records
    let importResult = { successful: 0, failed: 0, errors: [] as any[] };
    
    if (newRecords.length > 0) {
      console.log('📤 Importing records...');
      importResult = await churnService.bulkCreateChurnRecords(newRecords);
    }

    // Prepare response
    const response = {
      success: true,
      message: 'CSV upload completed',
      summary: {
        total_rows_in_file: csvData.length,
        valid_rows: validationResults.valid.length,
        invalid_rows: validationResults.invalid.length,
        duplicate_rows_in_file: validationResults.duplicates.length,
        existing_records_skipped: existingRecords.length,
        new_records_imported: importResult.successful,
        import_failures: importResult.failed,
      },
      details: {
        uploaded_by: user.email,
        uploaded_at: new Date().toISOString(),
        filename: file.name,
        existing_rids: existingRecords.map(r => r.rid),
        import_errors: importResult.errors
      }
    };

    console.log('🎉 CSV upload completed successfully');
    console.log(`📊 Summary: ${importResult.successful} imported, ${existingRecords.length} skipped, ${importResult.failed} failed`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ CSV upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'CSV upload failed',
      detail: String(error)
    }, { status: 500 });
  }
}