const fs = require('fs');

// Read CSV files
function parseCSV(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ? values[index].trim() : '';
    });
    records.push(record);
  }
  
  return records;
}

// Parse date function
function parseChurnDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    const year = parseInt('20' + parts[2]);
    
    const monthMap = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    const month = monthMap[monthStr];
    if (month === undefined) return null;
    
    return new Date(year, month, day);
  } catch {
    return null;
  }
}

// Load data
const churnRecords = parseCSV('Data/Churn.csv');
const brandData = parseCSV('Data/Brand DATA CSV.csv');
const kamData = parseCSV('Data/KAM Data CSV.csv');

console.log('Loaded data:');
console.log('- Churn records:', churnRecords.length);
console.log('- Brand records:', brandData.length);
console.log('- KAM records:', kamData.length);

// Filter December churns
const decemberChurns = churnRecords.filter(r => {
  const date = parseChurnDate(r.Date);
  return date && date.getMonth() === 11 && date.getFullYear() === 2025;
});

console.log('\nDecember 2025 churns:', decemberChurns.length);

// Check which churns have matching brands
const brandRestaurantIds = new Set(brandData.map(b => b.restaurant_id));
const churnsWithBrands = decemberChurns.filter(c => brandRestaurantIds.has(c.restaurant_id));
const churnsWithoutBrands = decemberChurns.filter(c => !brandRestaurantIds.has(c.restaurant_id));

console.log('\nChurns with matching brands:', churnsWithBrands.length);
console.log('Churns without matching brands:', churnsWithoutBrands.length);

if (churnsWithoutBrands.length > 0) {
  console.log('\nChurns without matching brands:');
  churnsWithoutBrands.forEach(c => {
    console.log(`  - Restaurant ID: ${c.restaurant_id}, Reason: ${c['Churn Reasons']}`);
  });
}

// Check for brands with outlets
const brandsWithOutlets = new Map();
brandData.forEach(b => {
  const email = b.email?.toLowerCase();
  if (!email) return;
  
  if (!brandsWithOutlets.has(email)) {
    brandsWithOutlets.set(email, []);
  }
  brandsWithOutlets.get(email).push(b.restaurant_id);
});

console.log('\nBrands with outlets:', brandsWithOutlets.size);

// Check which December churns belong to brands with outlets
let churnsInBrandsWithOutlets = 0;
let churnsNotInBrandsWithOutlets = 0;

decemberChurns.forEach(churn => {
  const brand = brandData.find(b => b.restaurant_id === churn.restaurant_id);
  if (!brand) {
    churnsNotInBrandsWithOutlets++;
    return;
  }
  
  const email = brand.email?.toLowerCase();
  if (!email) {
    churnsNotInBrandsWithOutlets++;
    return;
  }
  
  const outlets = brandsWithOutlets.get(email) || [];
  if (outlets.length > 0) {
    churnsInBrandsWithOutlets++;
  } else {
    churnsNotInBrandsWithOutlets++;
  }
});

console.log('\nChurns in brands with outlets:', churnsInBrandsWithOutlets);
console.log('Churns not in brands with outlets:', churnsNotInBrandsWithOutlets);

console.log('\n=== SUMMARY ===');
console.log('Total December churns:', decemberChurns.length);
console.log('Expected dashboard count (with filters):', churnsInBrandsWithOutlets);
console.log('Difference:', decemberChurns.length - churnsInBrandsWithOutlets);
