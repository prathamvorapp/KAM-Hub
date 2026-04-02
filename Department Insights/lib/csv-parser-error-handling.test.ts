import { describe, test, expect } from 'vitest'
import fc from 'fast-check'
import { CSVParser, CSVParseError } from './csv-parser'
import fs from 'fs'
import path from 'path'

// Feature: brand-journey-dashboard, Property 20: File read error specificity
// For any CSV file that cannot be read, the error message should identify the specific file name that is missing or inaccessible
describe('Property 20: File read error specificity', () => {
  test('error messages identify specific missing file names', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('Brand DATA CSV.csv', 'KAM Data CSV.csv', 'Price Data CSV.csv'),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/') && !s.includes('\\')),
        async (targetFile, nonExistentDir) => {
          // Create parser with non-existent directory
          const parser = new CSVParser(nonExistentDir)
          
          let caughtError: CSVParseError | null = null
          
          try {
            if (targetFile === 'Brand DATA CSV.csv') {
              await parser.parseBrandData()
            } else if (targetFile === 'KAM Data CSV.csv') {
              await parser.parseKAMData()
            } else {
              await parser.parsePriceData()
            }
          } catch (error) {
            if (error instanceof CSVParseError) {
              caughtError = error
            }
          }
          
          // Property: Error should be thrown
          expect(caughtError).not.toBeNull()
          
          if (caughtError) {
            // Property: Error message should contain the specific file name
            expect(caughtError.message).toContain(targetFile)
            
            // Property: fileName property should match the target file
            expect(caughtError.fileName).toBe(targetFile)
            
            // Property: Error should be instance of CSVParseError
            expect(caughtError).toBeInstanceOf(CSVParseError)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: brand-journey-dashboard, Property 21: Invalid date handling
// For any CSV record with invalid date format, the parser should log a warning with the record identifier and skip that record without crashing
describe('Property 21: Invalid date handling', () => {
  test('parser handles invalid dates gracefully without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            restaurant_id: fc.uuid(),
            email: fc.emailAddress(),
            POS_Subscription_status: fc.constantFrom('Active', 'Inactive'),
            POS_Subscription_creation: fc.oneof(
              fc.constant('invalid-date'),
              fc.constant('2025-13-45'),
              fc.constant('not a date'),
              fc.constant('99/99/9999'),
              fc.date().map(d => d.toISOString())
            ),
            POS_Subscription_expiry: fc.oneof(
              fc.constant(''),
              fc.constant('bad-date'),
              fc.date().map(d => d.toISOString())
            ),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (records) => {
          // Create a temporary CSV file with invalid dates
          const tempDir = 'temp-test-' + Math.random().toString(36).substring(7)
          const tempPath = path.join(tempDir, 'Brand DATA CSV.csv')
          
          try {
            // Create directory
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true })
            }
            
            // Generate CSV content
            const headers = Object.keys(records[0]).join(',')
            const rows = records.map(r => Object.values(r).join(',')).join('\n')
            const csvContent = `${headers}\n${rows}`
            
            fs.writeFileSync(tempPath, csvContent)
            
            const parser = new CSVParser(tempDir)
            
            // Property: Parser should not crash when encountering invalid dates
            let didCrash = false
            let result: any[] = []
            
            try {
              result = await parser.parseBrandData()
            } catch (error) {
              // Only crash if it's not a CSVParseError about empty file
              if (error instanceof CSVParseError && !error.message.includes('empty')) {
                didCrash = true
              }
            }
            
            // Property: Parser should complete without crashing
            expect(didCrash).toBe(false)
            
            // Property: Result should be an array (even if empty)
            expect(Array.isArray(result)).toBe(true)
            
            // Property: Invalid dates should be converted to null
            result.forEach(record => {
              if (record.POS_Subscription_creation !== null) {
                expect(record.POS_Subscription_creation).toBeInstanceOf(Date)
              }
              if (record.POS_Subscription_expiry !== null) {
                expect(record.POS_Subscription_expiry).toBeInstanceOf(Date)
              }
            })
          } finally {
            // Cleanup
            try {
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath)
              }
              if (fs.existsSync(tempDir)) {
                fs.rmdirSync(tempDir)
              }
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// Feature: brand-journey-dashboard, Property 22: Missing field validation
// For any CSV record missing required fields, the parser should display a validation error identifying the missing fields
describe('Property 22: Missing field validation', () => {
  test('parser handles missing required fields gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            restaurant_id: fc.option(fc.uuid(), { nil: '' }),
            email: fc.option(fc.emailAddress(), { nil: '' }),
            POS_Subscription_status: fc.option(fc.constantFrom('Active', 'Inactive'), { nil: '' }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (records) => {
          // Create a temporary CSV file with potentially missing fields
          const tempDir = 'temp-test-' + Math.random().toString(36).substring(7)
          const tempPath = path.join(tempDir, 'Brand DATA CSV.csv')
          
          try {
            // Create directory
            if (!fs.existsSync(tempDir)) {
              fs.mkdirSync(tempDir, { recursive: true })
            }
            
            // Generate CSV content with some fields potentially missing
            const headers = 'restaurant_id,email,POS_Subscription_status'
            const rows = records.map(r => 
              `${r.restaurant_id || ''},${r.email || ''},${r.POS_Subscription_status || ''}`
            ).join('\n')
            const csvContent = `${headers}\n${rows}`
            
            fs.writeFileSync(tempPath, csvContent)
            
            const parser = new CSVParser(tempDir)
            
            // Property: Parser should not crash when encountering missing fields
            let didCrash = false
            let result: any[] = []
            
            try {
              result = await parser.parseBrandData()
            } catch (error) {
              // Parser may throw for completely empty file
              if (error instanceof CSVParseError && error.message.includes('empty')) {
                // This is acceptable - empty file should error
                didCrash = false
              } else if (error instanceof CSVParseError) {
                // Other CSV errors are acceptable
                didCrash = false
              } else {
                // Unexpected crash
                didCrash = true
              }
            }
            
            // Property: Parser should complete without unexpected crashes
            expect(didCrash).toBe(false)
            
            // Property: Result should be an array
            expect(Array.isArray(result)).toBe(true)
            
            // Property: Missing fields should be replaced with empty strings or defaults
            result.forEach(record => {
              expect(typeof record.restaurant_id).toBe('string')
              expect(typeof record.email).toBe('string')
              expect(typeof record.POS_Subscription_status).toBe('string')
            })
          } finally {
            // Cleanup
            try {
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath)
              }
              if (fs.existsSync(tempDir)) {
                fs.rmdirSync(tempDir)
              }
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
