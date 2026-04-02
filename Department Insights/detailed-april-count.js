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

// Count all brands assigned by April 2025
const aprilEnd = new Date(2025, 3, 30, 23, 59, 59, 999);
const uniqueEmails = new Set();
const allBrands = [];

kamResult.data.forEach(row => {
  const email = row.email?.toLowerCase() || '';
  const assignDateStr = row['Assign Date 1'] || '';
  const brandName = row['Brand Name '] || row['Brand Name'] || '';
  
  if (email && assignDateStr) {
    const assignDate = parseDate(assignDateStr);
    if (assignDate && assignDate <= aprilEnd) {
      allBrands.push({
        email,
        brandName,
        assignDate: assignDateStr,
        inBrandData: brandEmails.has(email)
      });
      
      if (brandEmails.has(email)) {
        uniqueEmails.add(email);
      }
    }
  }
});

console.log('=== April 2025 Brand Count Analysis ===\n');
console.log(`Total KAM records assigned by April 2025: ${allBrands.length}`);
console.log(`Records that exist in Brand data: ${allBrands.filter(b => b.inBrandData).length}`);
console.log(`Unique emails in Brand data: ${uniqueEmails.size}`);

// Check for the missing brand
const notInBrandData = allBrands.filter(b => !b.inBrandData);
console.log(`\n=== Brands NOT in Brand Data ===`);
console.log(`Count: ${notInBrandData.length}\n`);
notInBrandData.forEach(b => {
  console.log(`${b.brandName} (${b.email}) - Assigned: ${b.assignDate}`);
});

// Check if there's a duplicate email issue
const emailCounts = new Map();
allBrands.filter(b => b.inBrandData).forEach(b => {
  emailCounts.set(b.email, (emailCounts.get(b.email) || 0) + 1);
});

const duplicates = Array.from(emailCounts.entries()).filter(([email, count]) => count > 1);
if (duplicates.length > 0) {
  console.log(`\n=== Duplicate Emails ===`);
  duplicates.forEach(([email, count]) => {
    console.log(`${email}: ${count} times`);
    const brands = allBrands.filter(b => b.email === email);
    brands.forEach(b => console.log(`  - ${b.brandName}`));
  });
}

console.log(`\n=== Final Count ===`);
console.log(`Expected by you: 753`);
console.log(`Currently showing: 752`);
console.log(`Actual unique emails: ${uniqueEmails.size}`);
