const fs = require('fs');
const Papa = require('papaparse');

const brandContent = fs.readFileSync('Data/Brand DATA CSV.csv', 'utf-8');
const kamContent = fs.readFileSync('Data/KAM Data CSV.csv', 'utf-8');

const brandResult = Papa.parse(brandContent, { header: true, skipEmptyLines: true });
const kamResult = Papa.parse(kamContent, { header: true, skipEmptyLines: true });

const parseDate = (str) => {
  if (!str) return null;
  const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  }
  return null;
};

const april2025 = new Date(2025, 3, 30, 23, 59, 59, 999);

// Build KAM lookup by email
const kamByEmail = new Map();
const kamDetails = new Map();
kamResult.data.forEach(row => {
  const email = row.email?.toLowerCase();
  const assignDate1 = parseDate(row['Assign Date 1']);
  if (email && assignDate1) {
    kamByEmail.set(email, assignDate1);
    kamDetails.set(email, {
      brandName: row['Brand Name '] || row['Brand Name'] || '',
      kamName: row['KAM Name 1'] || '',
      assignDate: assignDate1
    });
  }
});

// Group brands by email
const brandsByEmail = new Map();
brandResult.data.forEach(row => {
  const email = row.email?.toLowerCase();
  if (!email) return;
  if (!brandsByEmail.has(email)) {
    brandsByEmail.set(email, []);
  }
  brandsByEmail.get(email).push(row);
});

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              FINDING THE MISSING BRAND                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Method 1: Count brands with KAM assignment by April 2025
const brandsWithKAM = new Set();
kamByEmail.forEach((assignDate, email) => {
  if (assignDate <= april2025) {
    brandsWithKAM.add(email);
  }
});

console.log(`Total brands with KAM assigned by April 2025: ${brandsWithKAM.size}`);
console.log('');

// Method 2: Check which brands have outlets in the brand data
const brandsWithOutlets = new Set();
const brandsWithoutOutlets = [];

brandsWithKAM.forEach(email => {
  if (brandsByEmail.has(email)) {
    brandsWithOutlets.add(email);
  } else {
    const details = kamDetails.get(email);
    brandsWithoutOutlets.push({
      email,
      brandName: details.brandName,
      kamName: details.kamName,
      assignDate: details.assignDate.toLocaleDateString()
    });
  }
});

console.log(`Brands with KAM that exist in Brand Data CSV: ${brandsWithOutlets.size}`);
console.log(`Brands with KAM but NOT in Brand Data CSV: ${brandsWithoutOutlets.length}`);
console.log('');

if (brandsWithoutOutlets.length > 0) {
  console.log('🔍 BRANDS WITH KAM BUT NOT IN BRAND DATA:');
  console.log('─────────────────────────────────────────────────────────────────');
  brandsWithoutOutlets.forEach((brand, i) => {
    console.log(`${i + 1}. Email: ${brand.email}`);
    console.log(`   Brand Name: ${brand.brandName}`);
    console.log(`   KAM: ${brand.kamName}`);
    console.log(`   Assign Date: ${brand.assignDate}`);
    console.log('');
  });
}

// Method 3: Check for brands with empty outlets array
const brandsWithEmptyOutlets = [];
brandsWithKAM.forEach(email => {
  if (brandsByEmail.has(email)) {
    const outlets = brandsByEmail.get(email);
    if (outlets.length === 0) {
      const details = kamDetails.get(email);
      brandsWithEmptyOutlets.push({
        email,
        brandName: details.brandName,
        kamName: details.kamName
      });
    }
  }
});

if (brandsWithEmptyOutlets.length > 0) {
  console.log('🔍 BRANDS WITH KAM BUT EMPTY OUTLETS:');
  console.log('─────────────────────────────────────────────────────────────────');
  brandsWithEmptyOutlets.forEach((brand, i) => {
    console.log(`${i + 1}. ${brand.email} - ${brand.brandName} (KAM: ${brand.kamName})`);
  });
  console.log('');
}

// Method 4: Check the cross-reference logic
console.log('🔍 ANALYZING CROSS-REFERENCE LOGIC:');
console.log('─────────────────────────────────────────────────────────────────');
console.log('The CSVParser.crossReference() method groups brands by email.');
console.log('If a brand email exists in KAM data but not in Brand data,');
console.log('it will not appear in the final BrandWithKAM array.');
console.log('');
console.log('Expected count: 753 (from KAM data)');
console.log('Dashboard shows: 752');
console.log('Missing: 1 brand');
console.log('');

if (brandsWithoutOutlets.length === 1) {
  console.log('✅ FOUND THE ISSUE:');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log('The missing brand is in KAM Data CSV but NOT in Brand Data CSV.');
  console.log('This brand has a KAM assignment but no outlet records.');
  console.log('');
  console.log('The crossReference() method only creates BrandWithKAM entries');
  console.log('for brands that exist in the Brand Data CSV.');
}
