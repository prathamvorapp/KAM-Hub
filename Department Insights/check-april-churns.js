const fs = require('fs');
const Papa = require('papaparse');

const churnData = fs.readFileSync('Data/Churn.csv', 'utf-8');
const churns = Papa.parse(churnData, { header: true, skipEmptyLines: true }).data;

const aprilChurns = churns.filter(c => c.Date && c.Date.includes('Apr-25'));

console.log('Total April 2025 churns:', aprilChurns.length);
console.log('\nFirst 5 April churn records:');
aprilChurns.slice(0, 5).forEach((c, i) => {
  console.log(`\n${i+1}. Restaurant ID: ${c.restaurant_id}`);
  console.log(`   Date: ${c.Date}`);
  console.log(`   Reason: ${c['Churn Reasons']}`);
});

// Check if any of these match Mahima's brands
const kamData = fs.readFileSync('Data/KAM Data CSV.csv', 'utf-8');
const kams = Papa.parse(kamData, { header: true }).data;

const mahimaBrands = kams.filter(kam => {
  const names = [
    kam['KAM Name 1'],
    kam['KAM Name 2 '],
    kam['KAM Name 3'],
    kam['KAM Name 4'],
    kam['KAM Name 5'],
    kam['KAM Name 6']
  ];
  return names.some(name => name && name.trim() === 'Mahima Sali');
});

const mahimaBrandUIDs = new Set(mahimaBrands.map(b => b['Brand UID']));

console.log('\n\nMahima Sali Brand UIDs:', Array.from(mahimaBrandUIDs).slice(0, 10).join(', '), '...');

const mahimaAprilChurns = aprilChurns.filter(c => mahimaBrandUIDs.has(c.restaurant_id));

console.log('\n\nMahima Sali April churns:', mahimaAprilChurns.length);

if (mahimaAprilChurns.length > 0) {
  console.log('\nDetails:');
  mahimaAprilChurns.forEach((c, i) => {
    console.log(`\n${i+1}. Restaurant ID: ${c.restaurant_id}`);
    console.log(`   Date: ${c.Date}`);
    console.log(`   Reason: ${c['Churn Reasons']}`);
  });
}
