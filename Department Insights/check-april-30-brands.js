const Papa = require('papaparse');
const fs = require('fs');

// Parse KAM and Brand data
const kamCsv = fs.readFileSync('Data/KAM Data CSV.csv', 'utf-8');
const brandCsv = fs.readFileSync('Data/Brand DATA CSV.csv', 'utf-8');

const kamResult = Papa.parse(kamCsv, { header: true, skipEmptyLines: true });
const brandResult = Papa.parse(brandCsv, { header: true, skipEmptyLines: true });

// Build brand emails set
const brandEmails = new Set();
brandResult.data.forEach(row => {
  const email = row.email?.toLowerCase() || '';
  if (email) brandEmails.add(email);
});

// Parse date function
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyMatch) {
    const day = parseInt(ddmmyyyyMatch[1], 10);
    const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
    const year = parseInt(ddmmyyyyMatch[3], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) return date;
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

// Find brands assigned on April 30, 2025
const april30 = new Date(2025, 3, 30); // April 30, 2025 at 00:00:00
const april30Brands = [];

kamResult.data.forEach(row => {
  const email = row.email?.toLowerCase() || '';
  const assignDateStr = row['Assign Date 1'] || '';
  
  if (email && assignDateStr && brandEmails.has(email)) {
    const assignDate = parseDate(assignDateStr);
    if (assignDate && assignDate.getTime() === april30.getTime()) {
      april30Brands.push({
        email,
        brandName: row['Brand Name '] || row['Brand Name'],
        assignDate: assignDateStr
      });
    }
  }
});

console.log('=== Brands Assigned on April 30, 2025 ===\n');
console.log(`Count: ${april30Brands.length}\n`);

april30Brands.forEach(b => {
  console.log(`${b.brandName} (${b.email})`);
});

// Now check counts with different cutoff times
const aprilEndMidnight = new Date(2025, 3, 30, 23, 59, 59, 999);
const aprilEndNextDay = new Date(2025, 4, 1, 0, 0, 0, 0);

let countWithMidnight = 0;
let countWithNextDay = 0;

kamResult.data.forEach(row => {
  const email = row.email?.toLowerCase() || '';
  const assignDateStr = row['Assign Date 1'] || '';
  
  if (email && assignDateStr && brandEmails.has(email)) {
    const assignDate = parseDate(assignDateStr);
    if (assignDate) {
      if (assignDate <= aprilEndMidnight) countWithMidnight++;
      if (assignDate < aprilEndNextDay) countWithNextDay++;
    }
  }
});

console.log(`\n=== Count Comparison ===`);
console.log(`With April 30 23:59:59.999: ${countWithMidnight}`);
console.log(`With May 1 00:00:00: ${countWithNextDay}`);
