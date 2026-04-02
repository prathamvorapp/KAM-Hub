const fs = require('fs');
const Papa = require('papaparse');

// Read CSV files
const churnData = fs.readFileSync('Data/Churn.csv', 'utf-8');
const brandData = fs.readFileSync('Data/Brand DATA CSV.csv', 'utf-8');
const kamData = fs.readFileSync('Data/KAM Data CSV.csv', 'utf-8');
const priceData = fs.readFileSync('Data/Price Data CSV.csv', 'utf-8');
const revenueData = fs.readFileSync('Data/Revenue.csv', 'utf-8');

// Parse CSVs
const churnRecords = Papa.parse(churnData, { header: true, skipEmptyLines: true }).data;
const brandRecords = Papa.parse(brandData, { header: true, skipEmptyLines: true }).data;
const kamRecords = Papa.parse(kamData, { header: true, skipEmptyLines: true }).data;
const priceRecords = Papa.parse(priceData, { header: true, skipEmptyLines: true }).data;
const revenueRecords = Papa.parse(revenueData, { header: true, skipEmptyLines: true }).data;

console.log('='.repeat(80));
console.log('MAHIMA SALI - APRIL 2025 CHURN REVENUE BREAKDOWN');
console.log('='.repeat(80));

// Find Mahima Sali's brands
const mahimaBrands = kamRecords.filter(kam => {
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
console.log('Brands:');
mahimaBrands.forEach(b => {
  console.log(`  - ${b['Brand Name ']} (UID: ${b['Brand UID']})`);
});

// Get all restaurant IDs for Mahima's brands
const mahimaRestaurantIds = new Set();
mahimaBrands.forEach(kam => {
  const brandUid = kam['Brand UID'];
  mahimaRestaurantIds.add(brandUid);
  
  // Find all outlets for this brand
  const brandOutlets = brandRecords.filter(b => b.restaurant_id === brandUid);
  brandOutlets.forEach(outlet => {
    mahimaRestaurantIds.add(outlet.restaurant_id);
  });
});

console.log(`\nTotal restaurant/outlet IDs: ${mahimaRestaurantIds.size}`);

// Filter April 2025 churns for Mahima's brands
const aprilChurns = churnRecords.filter(churn => {
  const date = churn.Date || '';
  const isApril = date.includes('Apr-25');
  const isMahima = mahimaRestaurantIds.has(churn.restaurant_id);
  return isApril && isMahima;
});

console.log(`\n${'='.repeat(80)}`);
console.log(`APRIL 2025 CHURNS: ${aprilChurns.length} outlets`);
console.log('='.repeat(80));

let totalRevenueLost = 0;

aprilChurns.forEach((churn, index) => {
  console.log(`\n--- Churn #${index + 1} ---`);
  console.log(`Restaurant ID: ${churn.restaurant_id}`);
  console.log(`Date: ${churn.Date}`);
  console.log(`Reason: ${churn['Churn Reasons']}`);
  
  // Find the brand this outlet belongs to
  const brand = brandRecords.find(b => b.restaurant_id === churn.restaurant_id);
  const kamInfo = mahimaBrands.find(k => k['Brand UID'] === churn.restaurant_id);
  
  if (kamInfo) {
    console.log(`Brand: ${kamInfo['Brand Name ']}`);
  }
  
  // METHOD 1: Calculate from active services
  let calculatedRevenue = 0;
  if (brand) {
    console.log('\nActive Services:');
    const serviceFields = Object.keys(brand).filter(key => key.endsWith('_status'));
    
    serviceFields.forEach(statusField => {
      if (brand[statusField] === 'active') {
        const serviceName = statusField.replace('_status', '');
        const priceEntry = priceRecords.find(p => 
          p['Service / Product Name'].replace(/\s+/g, '_') === serviceName ||
          p['Service / Product Name'] === serviceName.replace(/_/g, ' ')
        );
        
        if (priceEntry) {
          const price = parseFloat(priceEntry.Price) || 0;
          calculatedRevenue += price;
          console.log(`  - ${serviceName}: ₹${price}`);
        }
      }
    });
  }
  
  console.log(`\nMethod 1 (Active Services): ₹${calculatedRevenue}`);
  
  // METHOD 2: Check actual revenue from Revenue.csv
  const outletRevenue = revenueRecords
    .filter(r => r.restaurant_id === churn.restaurant_id)
    .reduce((sum, r) => {
      const amount = parseFloat(r[' Amount  '] || r['Amount'] || 0);
      return sum + amount;
    }, 0);
  
  console.log(`Method 2 (Actual Revenue): ₹${outletRevenue}`);
  
  // Take the higher value
  const finalRevenue = Math.max(calculatedRevenue, outletRevenue);
  console.log(`\n>>> FINAL REVENUE LOST: ₹${finalRevenue} (using ${finalRevenue === calculatedRevenue ? 'Method 1' : 'Method 2'})`);
  
  totalRevenueLost += finalRevenue;
});

console.log(`\n${'='.repeat(80)}`);
console.log(`TOTAL APRIL 2025 REVENUE LOST FOR MAHIMA SALI: ₹${totalRevenueLost.toLocaleString()}`);
console.log('='.repeat(80));

// Show breakdown by brand
console.log('\n\nBREAKDOWN BY BRAND:');
const brandBreakdown = {};
aprilChurns.forEach(churn => {
  const kamInfo = mahimaBrands.find(k => k['Brand UID'] === churn.restaurant_id);
  const brandName = kamInfo ? kamInfo['Brand Name '] : 'Unknown';
  
  if (!brandBreakdown[brandName]) {
    brandBreakdown[brandName] = { count: 0, revenue: 0 };
  }
  
  const brand = brandRecords.find(b => b.restaurant_id === churn.restaurant_id);
  let calculatedRevenue = 0;
  
  if (brand) {
    const serviceFields = Object.keys(brand).filter(key => key.endsWith('_status'));
    serviceFields.forEach(statusField => {
      if (brand[statusField] === 'active') {
        const serviceName = statusField.replace('_status', '');
        const priceEntry = priceRecords.find(p => 
          p['Service / Product Name'].replace(/\s+/g, '_') === serviceName ||
          p['Service / Product Name'] === serviceName.replace(/_/g, ' ')
        );
        if (priceEntry) {
          calculatedRevenue += parseFloat(priceEntry.Price) || 0;
        }
      }
    });
  }
  
  const outletRevenue = revenueRecords
    .filter(r => r.restaurant_id === churn.restaurant_id)
    .reduce((sum, r) => sum + (parseFloat(r[' Amount  '] || r['Amount'] || 0)), 0);
  
  const finalRevenue = Math.max(calculatedRevenue, outletRevenue);
  
  brandBreakdown[brandName].count++;
  brandBreakdown[brandName].revenue += finalRevenue;
});

Object.entries(brandBreakdown).forEach(([brand, data]) => {
  console.log(`\n${brand}:`);
  console.log(`  Churned Outlets: ${data.count}`);
  console.log(`  Revenue Lost: ₹${data.revenue.toLocaleString()}`);
});
