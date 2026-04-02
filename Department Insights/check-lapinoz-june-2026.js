const fs = require('fs');
const Papa = require('papaparse');

// Read Brand DATA CSV
const brandCSV = fs.readFileSync('Data/Brand DATA CSV.csv', 'utf-8');
const brandData = Papa.parse(brandCSV, { header: true }).data;

// Read KAM Data CSV to get La Pinoz email
const kamCSV = fs.readFileSync('Data/KAM Data CSV.csv', 'utf-8');
const kamData = Papa.parse(kamCSV, { header: true }).data;

// Find La Pinoz Pizza in KAM data
const laPinoz = kamData.find(row => 
  row['Brand Name '] && row['Brand Name '].toLowerCase().includes('la pinoz')
);

if (!laPinoz) {
  console.log('La Pinoz Pizza not found in KAM data');
  process.exit(1);
}

console.log('La Pinoz Pizza found:');
console.log('Brand Name:', laPinoz['Brand Name ']);
console.log('Email:', laPinoz.email);
console.log('Brand UID:', laPinoz['Brand UID']);
console.log('');

// Find all outlets (rows) for this email in Brand DATA
const laPinozOutlets = brandData.filter(row => 
  row.email && row.email.toLowerCase() === laPinoz.email.toLowerCase()
);

console.log('Total outlets for La Pinoz:', laPinozOutlets.length);
console.log('');

// Parse date in DD-MM-YYYY format
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // 0-indexed
  const year = parseInt(parts[2]);
  return new Date(year, month, day);
}

// Check outlets expiring in June 2026
const june2026Outlets = laPinozOutlets.filter(outlet => {
  const expiryDate = parseDate(outlet.POS_Subscription_expiry);
  if (!expiryDate) return false;
  return expiryDate.getFullYear() === 2026 && expiryDate.getMonth() === 5; // June is month 5 (0-indexed)
});

console.log('Outlets expiring in June 2026:', june2026Outlets.length);
console.log('');

// Show first 5 outlets expiring in June 2026
console.log('First 5 outlets expiring in June 2026:');
june2026Outlets.slice(0, 5).forEach((outlet, index) => {
  console.log(`${index + 1}. Restaurant ID: ${outlet.restaurant_id}`);
  console.log(`   POS Status: ${outlet.POS_Subscription_status}`);
  console.log(`   POS Creation: ${outlet.POS_Subscription_creation}`);
  console.log(`   POS Expiry: ${outlet.POS_Subscription_expiry}`);
  console.log('');
});

// Calculate expected revenue
const renewalPrice = 7000;
const expectedRevenue = june2026Outlets.length * renewalPrice;
console.log('Expected revenue for June 2026:');
console.log(`${june2026Outlets.length} outlets × ₹${renewalPrice} = ₹${expectedRevenue.toLocaleString()}`);
