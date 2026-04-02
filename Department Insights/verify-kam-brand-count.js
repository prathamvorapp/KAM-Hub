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

// Build KAM lookup by email
const kamByEmail = new Map();
kamResult.data.forEach(row => {
  const email = row.email?.toLowerCase();
  const assignDate1 = parseDate(row['Assign Date 1']);
  if (email && assignDate1) {
    kamByEmail.set(email, assignDate1);
  }
});

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         MONTHLY KAM-ASSIGNED BRAND COUNT (2025)               ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const months = [
  { name: 'April 2025', year: 2025, month: 3, day: 30 },
  { name: 'May 2025', year: 2025, month: 4, day: 31 },
  { name: 'June 2025', year: 2025, month: 5, day: 30 },
  { name: 'July 2025', year: 2025, month: 6, day: 31 },
  { name: 'August 2025', year: 2025, month: 7, day: 31 },
  { name: 'September 2025', year: 2025, month: 8, day: 30 },
  { name: 'October 2025', year: 2025, month: 9, day: 31 },
  { name: 'November 2025', year: 2025, month: 10, day: 30 },
  { name: 'December 2025', year: 2025, month: 11, day: 31 },
];

let previousCount = 0;

months.forEach(({ name, year, month, day }) => {
  const targetDate = new Date(year, month, day, 23, 59, 59, 999);
  
  const uniqueEmails = new Set();
  kamByEmail.forEach((assignDate, email) => {
    if (assignDate <= targetDate) {
      uniqueEmails.add(email);
    }
  });
  
  const count = uniqueEmails.size;
  const change = previousCount > 0 ? count - previousCount : 0;
  const changeStr = change > 0 ? `+${change}` : change < 0 ? `${change}` : '0';
  
  console.log(`${name.padEnd(20)} ${count.toString().padStart(4)} brands   (${changeStr.padStart(4)} from previous)`);
  previousCount = count;
});

console.log('\n─────────────────────────────────────────────────────────────────');
console.log('Note: Counts brands with KAM Assign Date 1 on or before target month');
console.log('      (This is the logic used in the dashboard)');
