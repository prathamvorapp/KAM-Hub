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

const april2025 = new Date(2025, 3, 30, 23, 59, 59);

// Build KAM lookup by email
const kamByEmail = new Map();
kamResult.data.forEach(row => {
  const email = row.email?.toLowerCase();
  const assignDate1 = parseDate(row['Assign Date 1']);
  if (email && assignDate1) {
    kamByEmail.set(email, assignDate1);
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

let brandsWithKAM = 0;
let brandsWithPOS = 0;
let brandsWithBoth = 0;

brandsByEmail.forEach((records, email) => {
  const hasKAM = kamByEmail.has(email);
  const kamDate = kamByEmail.get(email);
  const kamAssignedByApril = hasKAM && kamDate <= april2025;
  
  let hasPOS = false;
  for (const row of records) {
    const posCreation = parseDate(row.POS_Subscription_creation);
    const posExpiry = parseDate(row.POS_Subscription_expiry);
    const posStatus = row.POS_Subscription_status;
    
    if (posCreation && posCreation <= april2025 && (!posExpiry || posExpiry >= april2025 || posStatus === 'active')) {
      hasPOS = true;
      break;
    }
  }
  
  if (hasKAM && kamAssignedByApril) brandsWithKAM++;
  if (hasPOS) brandsWithPOS++;
  if (hasKAM && kamAssignedByApril && hasPOS) brandsWithBoth++;
});

console.log('\n=== April 2025 Brand Analysis ===');
console.log('Brands with KAM assigned by April 2025:', brandsWithKAM);
console.log('Brands with POS active in April 2025:', brandsWithPOS);
console.log('Brands with BOTH KAM and POS in April 2025:', brandsWithBoth);
console.log('\nNote: The current logic only counts brands that have BOTH KAM assignment AND POS subscription.');
