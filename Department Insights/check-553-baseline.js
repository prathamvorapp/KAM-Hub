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

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║              UNDERSTANDING THE 553 BASELINE                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Possibility 1: Brands with POS but NO KAM
let brandsWithPOSNoKAM = 0;
brandsByEmail.forEach((records, email) => {
  const hasKAM = kamByEmail.has(email);
  const kamDate = kamByEmail.get(email);
  const kamAssignedByApril = hasKAM && kamDate <= april2025;
  
  let hasPOS = false;
  for (const row of records) {
    const posCreation = parseDate(row.POS_Subscription_creation);
    const posExpiry = parseDate(row.POS_Subscription_expiry);
    const posStatus = row.POS_Subscription_status;
    
    if (posCreation && posCreation <= april2025 && 
        (!posExpiry || posExpiry >= april2025 || posStatus === 'active')) {
      hasPOS = true;
      break;
    }
  }
  
  if (hasPOS && !kamAssignedByApril) {
    brandsWithPOSNoKAM++;
  }
});

console.log('Possibility 1: Brands with POS but NO KAM in April 2025');
console.log(`Count: ${brandsWithPOSNoKAM} brands`);
console.log('');

// Possibility 2: Maybe counting from a specific start date?
const startDates = [
  { name: 'January 2025', date: new Date(2025, 0, 31, 23, 59, 59) },
  { name: 'February 2025', date: new Date(2025, 1, 28, 23, 59, 59) },
  { name: 'March 2025', date: new Date(2025, 2, 31, 23, 59, 59) },
];

console.log('Possibility 2: Brand count at different start dates');
startDates.forEach(({ name, date }) => {
  const uniqueEmails = new Set();
  
  brandsByEmail.forEach((records, email) => {
    let hasPOS = false;
    
    for (const row of records) {
      const posCreation = parseDate(row.POS_Subscription_creation);
      const posExpiry = parseDate(row.POS_Subscription_expiry);
      const posStatus = row.POS_Subscription_status;
      
      if (posCreation && posCreation <= date && 
          (!posExpiry || posExpiry >= date || posStatus === 'active')) {
        hasPOS = true;
        break;
      }
    }
    
    if (hasPOS) {
      uniqueEmails.add(email);
    }
  });
  
  console.log(`${name}: ${uniqueEmails.size} brands`);
});

console.log('\n─────────────────────────────────────────────────────────────────');
console.log('CLARIFICATION NEEDED:');
console.log('');
console.log('If 553 is the baseline for April 2025, it matches:');
console.log('• Brands with POS but NO KAM assignment (553 brands)');
console.log('');
console.log('However, the total brands with active POS in April 2025 is 1287.');
console.log('');
console.log('Please clarify:');
console.log('1. Should we count ALL brands with POS (1287)?');
console.log('2. Or only brands WITHOUT KAM (553)?');
console.log('3. Or is there a different baseline?');
