const fs = require('fs');
const Papa = require('papaparse');

const brandContent = fs.readFileSync('Data/Brand DATA CSV.csv', 'utf-8');
const brandResult = Papa.parse(brandContent, { header: true, skipEmptyLines: true });

const parseDate = (str) => {
  if (!str) return null;
  const match = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  }
  return null;
};

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

// Function to count brands with active POS in a given month
const countBrandsInMonth = (year, month) => {
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  const uniqueEmails = new Set();
  
  brandsByEmail.forEach((records, email) => {
    let hasPOS = false;
    
    for (const row of records) {
      const posCreation = parseDate(row.POS_Subscription_creation);
      const posExpiry = parseDate(row.POS_Subscription_expiry);
      const posStatus = row.POS_Subscription_status;
      
      if (posCreation && posCreation <= endOfMonth && 
          (!posExpiry || posExpiry >= endOfMonth || posStatus === 'active')) {
        hasPOS = true;
        break;
      }
    }
    
    if (hasPOS) {
      uniqueEmails.add(email);
    }
  });
  
  return uniqueEmails.size;
};

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║           MONTHLY BRAND COUNT VERIFICATION (2025)             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const months = [
  { name: 'April 2025', year: 2025, month: 4 },
  { name: 'May 2025', year: 2025, month: 5 },
  { name: 'June 2025', year: 2025, month: 6 },
  { name: 'July 2025', year: 2025, month: 7 },
  { name: 'August 2025', year: 2025, month: 8 },
  { name: 'September 2025', year: 2025, month: 9 },
  { name: 'October 2025', year: 2025, month: 10 },
  { name: 'November 2025', year: 2025, month: 11 },
  { name: 'December 2025', year: 2025, month: 12 },
];

let previousCount = 0;

months.forEach(({ name, year, month }) => {
  const count = countBrandsInMonth(year, month);
  const change = previousCount > 0 ? count - previousCount : 0;
  const changeStr = change > 0 ? `+${change}` : change < 0 ? `${change}` : '0';
  
  console.log(`${name.padEnd(20)} ${count.toString().padStart(4)} brands   (${changeStr.padStart(4)} from previous)`);
  previousCount = count;
});

console.log('\n─────────────────────────────────────────────────────────────────');
console.log('Note: Counts ALL brands with active POS subscriptions');
console.log('      (regardless of KAM assignment status)');
