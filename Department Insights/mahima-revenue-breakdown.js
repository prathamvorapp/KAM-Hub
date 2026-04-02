const fs = require('fs');
const Papa = require('papaparse');

console.log('Loading data...\n');

const churnData = fs.readFileSync('Data/Churn.csv', 'utf-8');
const brandData = fs.readFileSync('Data/Brand DATA CSV.csv', 'utf-8');
const kamData = fs.readFileSync('Data/KAM Data CSV.csv', 'utf-8');
const priceData = fs.readFileSync('Data/Price Data CSV.csv', 'utf-8');
const revenueData = fs.readFileSync('Data/Revenue.csv', 'utf-8');

const churns = Papa.parse(churnData, { header: true, skipEmptyLines: true }).data;
const brands = Papa.parse(brandData, { header: true, skipEmptyLines: true }).data;
const kams = Papa.parse(kamData, { header: true, skipEmptyLines: true }).data;
const prices = Papa.parse(priceData, { header: true, skipEmptyLines: true }).data;
const revenues = Papa.parse(revenueData, { header: true, skipEmptyLines: true }).data;

console.log('='.repeat(80));
console.log('MAHIMA SALI - APRIL 2025 REVENUE BREAKDOWN');
console.log('='.repeat(80));

// Find Mahima's brands
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

console.log(`\nMahima Sali manages ${mahimaBrands.length} brands`);

// Get all outlets for Mahima's brands (by matching email)
const mahimaEmails = new Set(mahimaBrands.map(b => b.email.toLowerCase().trim()));
const mahimaOutlets = brands.filter(b => mahimaEmails.has(b.email.toLowerCase().trim()));

console.log(`Total outlets across all her brands: ${mahimaOutlets.length}`);

// Get all outlet IDs
const mahimaOutletIds = new Set(mahimaOutlets.map(o => o.restaurant_id));

// Find April churns for these outlets
const aprilChurns = churns.filter(c => {
  const isApril = c.Date && c.Date.includes('Apr-25');
  const isMahima = mahimaOutletIds.has(c.restaurant_id);
  return isApril && isMahima;
});

console.log(`\nApril 2025 churns: ${aprilChurns.length} outlets`);

if (aprilChurns.length === 0) {
  console.log('\nNo churns found for Mahima Sali in April 2025');
  console.log('\nThis means the ₹7,000 shown in the dashboard might be:');
  console.log('1. From a different month');
  console.log('2. A calculation error');
  console.log('3. Using different filter criteria');
  process.exit(0);
}

console.log('\n' + '='.repeat(80));
console.log('DETAILED BREAKDOWN');
console.log('='.repeat(80));

let totalRevenue = 0;

aprilChurns.forEach((churn, index) => {
  console.log(`\n--- Churn #${index + 1} ---`);
  console.log(`Restaurant ID: ${churn.restaurant_id}`);
  console.log(`Date: ${churn.Date}`);
  console.log(`Reason: ${churn['Churn Reasons']}`);
  
  // Find the outlet details
  const outlet = mahimaOutlets.find(o => o.restaurant_id === churn.restaurant_id);
  if (outlet) {
    console.log(`Email: ${outlet.email}`);
    
    // Find brand name
    const brandInfo = mahimaBrands.find(b => b.email.toLowerCase().trim() === outlet.email.toLowerCase().trim());
    if (brandInfo) {
      console.log(`Brand: ${brandInfo['Brand Name ']}`);
    }
    
    // Calculate revenue Method 1: Inactive services (would have been renewed)
    let serviceRevenue = 0;
    console.log('\nInactive Services (would have been renewed):');
    
    Object.keys(outlet).forEach(key => {
      if (key.endsWith('_status') && outlet[key] === 'inactive') {
        const serviceName = key.replace('_status', '');
        const priceEntry = prices.find(p => {
          const pName = p['Service / Product Name'];
          return pName.replace(/\s+/g, '_') === serviceName || 
                 pName === serviceName.replace(/_/g, ' ');
        });
        
        if (priceEntry) {
          const price = parseFloat(priceEntry.Price) || 0;
          serviceRevenue += price;
          console.log(`  - ${serviceName}: ₹${price}`);
        }
      }
    });
    
    if (serviceRevenue === 0) {
      console.log('  (No inactive services found)');
    }
    
    console.log(`\nMethod 1 (Inactive Services - Renewal Revenue): ₹${serviceRevenue}`);
    
    // Calculate revenue Method 2: Actual revenue
    const actualRevenue = revenues
      .filter(r => r.restaurant_id === churn.restaurant_id)
      .reduce((sum, r) => {
        const amt = parseFloat(r[' Amount  '] || r['Amount'] || 0);
        return sum + amt;
      }, 0);
    
    console.log(`Method 2 (Actual Revenue from Revenue.csv): ₹${actualRevenue}`);
    
    // Use higher value
    const finalRevenue = Math.max(serviceRevenue, actualRevenue);
    console.log(`\n>>> REVENUE LOST: ₹${finalRevenue} (using ${finalRevenue === serviceRevenue ? 'Method 1' : 'Method 2'})`);
    
    totalRevenue += finalRevenue;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`TOTAL APRIL 2025 REVENUE LOST: ₹${totalRevenue.toLocaleString()}`);
console.log('='.repeat(80));
