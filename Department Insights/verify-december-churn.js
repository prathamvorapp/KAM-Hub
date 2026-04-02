const fs = require('fs');

// Read and parse Churn.csv
const churnCsv = fs.readFileSync('Data/Churn.csv', 'utf-8');
const lines = churnCsv.split('\n');
const headers = lines[0].split(',');

console.log('Headers:', headers.slice(0, 5));
console.log('Total lines:', lines.length);

// Parse churn records
const churnRecords = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  const parts = line.split(',');
  if (parts.length >= 2 && parts[0] && parts[1]) {
    churnRecords.push({
      date: parts[0],
      restaurant_id: parts[1],
      reason: parts[2] || '',
      remarks: parts[3] || ''
    });
  }
}

console.log('\nTotal churn records:', churnRecords.length);

// Parse date function (DD-MMM-YY format)
function parseChurnDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    const year = parseInt('20' + parts[2]); // Convert YY to YYYY
    
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

// Group by month
const monthlyChurns = new Map();

churnRecords.forEach(churn => {
  const date = parseChurnDate(churn.date);
  if (!date) {
    console.log('Failed to parse date:', churn.date);
    return;
  }
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  const monthKey = `${month}-${year}`;
  
  if (!monthlyChurns.has(monthKey)) {
    monthlyChurns.set(monthKey, []);
  }
  monthlyChurns.get(monthKey).push(churn);
});

console.log('\nMonthly breakdown:');
const sortedMonths = Array.from(monthlyChurns.keys()).sort((a, b) => {
  const dateA = new Date('01-' + a);
  const dateB = new Date('01-' + b);
  return dateA.getTime() - dateB.getTime();
});

sortedMonths.forEach(month => {
  const churns = monthlyChurns.get(month);
  console.log(`${month}: ${churns.length} churns`);
});

// Check December specifically
const decemberChurns = monthlyChurns.get('Dec-24') || monthlyChurns.get('Dec-25') || [];
console.log('\n=== DECEMBER ANALYSIS ===');
console.log('December 2024 churns:', (monthlyChurns.get('Dec-24') || []).length);
console.log('December 2025 churns:', (monthlyChurns.get('Dec-25') || []).length);
console.log('Total December churns:', decemberChurns.length);

// Sample December records
if (decemberChurns.length > 0) {
  console.log('\nSample December records:');
  decemberChurns.slice(0, 5).forEach(r => {
    console.log(`  - ${r.date}, ${r.restaurant_id}, ${r.reason}`);
  });
}
