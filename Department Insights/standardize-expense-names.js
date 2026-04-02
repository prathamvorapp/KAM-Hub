const fs = require('fs');
const path = require('path');

// Read the KAM Data CSV to extract standardized names
const kamDataPath = path.join(__dirname, 'Data', 'KAM Data CSV.csv');
const expensePath = path.join(__dirname, 'Data', 'Expense.csv');

const kamData = fs.readFileSync(kamDataPath, 'utf-8');
const expenseData = fs.readFileSync(expensePath, 'utf-8');

// Extract unique KAM names from KAM Data CSV (columns: KAM Name 1-6)
const kamNames = new Set();
const kamLines = kamData.split('\n').slice(1); // Skip header

kamLines.forEach(line => {
  const columns = line.split(',');
  // KAM Name columns are at indices 3, 5, 7, 9, 11, 13
  [3, 5, 7, 9, 11, 13].forEach(idx => {
    if (columns[idx] && columns[idx].trim()) {
      kamNames.add(columns[idx].trim());
    }
  });
});

console.log(`Found ${kamNames.size} unique KAM names in KAM Data CSV`);

// Create a mapping from variations to standardized names
const nameMapping = {};

// Common variations to handle
const variations = [
  // Remove leading/trailing spaces
  // Handle case variations
  // Handle specific name variations
];

kamNames.forEach(standardName => {
  // Map the standard name to itself
  nameMapping[standardName] = standardName;
  
  // Map common variations
  nameMapping[standardName.toUpperCase()] = standardName;
  nameMapping[standardName.toLowerCase()] = standardName;
  nameMapping[` ${standardName}`] = standardName; // Leading space
  nameMapping[`${standardName} `] = standardName; // Trailing space
  nameMapping[` ${standardName} `] = standardName; // Both
});

// Add specific mappings found in Expense.csv
nameMapping['RAHUL TAAK'] = 'Rahul Taak';
nameMapping['BHANVI GUPTA'] = 'Bhanvi Gupta';
nameMapping['ANTOLINA ANIL FRANCIS'] = 'Antolina Anil Francis';
nameMapping['KRIPAL PATEL'] = 'Kripal Patel';
nameMapping['SNEHAL DWIVEDI'] = 'Snehal Dwivedi';
nameMapping['ARPIT ACHARYA'] = 'Acharya Arpit';
nameMapping['SAGAR PRAKASHKUMAR KOTHARI'] = 'Sagar Kothari';
nameMapping['Nikhil Kumar'] = 'Nikhil Kumar';
nameMapping['Mahima S Sali'] = 'Mahima Sali';
nameMapping['Mahima Sunilbhai Sal'] = 'Mahima Sali';
nameMapping['HARSH J GOHEL'] = 'Harsh Gohel';
nameMapping['LAKSHITA THAKOR'] = 'Lakshita Juvansinh Thakor';
nameMapping['SHALVI NEHALBHAI JHAVERI'] = 'Jhaveri Shalvi Nehalbhai';
nameMapping['AKASH YEDUR'] = 'Akash Yedur';
nameMapping['SHAH SHITANSHU'] = 'Shah Shitanshu';
nameMapping[' IMON GHOSH'] = 'Imon Ghosh';
nameMapping['Rishit S Talati'] = 'Rishit Talati';
nameMapping['AMANKUMAR KOTA'] = 'Kota Amankumar';
nameMapping['JINALKUMARI CHAVADA'] = 'Jinalben Chavda';
nameMapping['ANCHAL NAIR'] = 'Nair Anchal';
nameMapping['KINAB BINDITBHAI SHAH'] = 'Kinab Binditbhai Shah';
nameMapping['KHANDLA KAUSHIK'] = 'Kaushik Khandla';
nameMapping['Yogita M'] = 'Yogita Maheshwary';
nameMapping['Manisha Balotiya'] = 'Manisha Balotiya';
nameMapping['MOHAMMAD FARHAN SHAIKH'] = 'Farhan A. Shaikh';
nameMapping['Sudhin Raveendran'] = 'Sudhin Raveendran';
nameMapping['NAVEEN M'] = 'Naveen M';
nameMapping['Tapankumar Patel'] = 'Tapankumar Patel';
nameMapping['Aman Mutneja'] = 'Aman Mutneja';
nameMapping['DILNA P'] = 'Dilna P';
nameMapping['Abijith K S'] = 'Abijith K S';
nameMapping['PRADIPTA SEN'] = 'Pradipta Sen';
nameMapping['Thakkar Bhoomika Akashkumar'] = 'Thakkar Bhoomika';
nameMapping['Krutika Veshalskumar Christian'] = 'Christian Krutika Veshalskumar';
nameMapping['Abhishek Jain'] = 'Abhishek Jain';
nameMapping['Chauhan Khushbu Girishkumar'] = 'Chauhan Khushbu Girishkumar';
nameMapping['Shah Anokhi Rajeshkumar'] = 'Shah Anokhi Rajeshkumar';
nameMapping['AAKASH BISWAS'] = 'Aakash Biswas';
nameMapping['ABHISHEK JAIN'] = 'Abhishek Jain';
nameMapping['Rahul Taak'] = 'Rahul Taak';
nameMapping['Helly Gandhi'] = 'Helly Gandhi';
nameMapping['Kushawha Pooja'] = 'Kushawha Pooja';
nameMapping['Jitwin Purohit'] = 'Jitwin Purohit';
nameMapping['PRATHAM JATILBHAI VORA'] = 'Pratham Jatilbhai Vora';
nameMapping['Aman Kota'] = 'Aman Kota';
nameMapping['Lakshita Thakor'] = 'Lakshita Juvansinh Thakor';
nameMapping['Apurv'] = 'Apurv';
nameMapping['Saloni Vaghela'] = 'Saloni Vaghela';
nameMapping['Parmar Rajeshbhai Kalubhai'] = 'Parmar Rajeshbhai Kalubhai';
nameMapping['Krutika Christian'] = 'Krutika Christian';
nameMapping['Vaghela Saloni Kiritbhai'] = 'Vaghela Saloni Kiritbhai';
nameMapping['Sudhin Ravindran'] = 'Sudhin Ravindran';
nameMapping['Shalvi Jhaveri'] = 'Shalvi Jhaveri';
nameMapping['Niar Anchal'] = 'Nair Anchal';
nameMapping['Jinal Chavda'] = 'Jinalben Chavda';
nameMapping['Khushbu Chauhan'] = 'Chauhan Khushbu Girishkumar';
nameMapping['Purohit Jitwin'] = 'Jitwin Purohit';
nameMapping['Megha Chourasia'] = 'Megha Chourasia';
nameMapping['Gohel Harsh Jayantibhai'] = 'Harsh Gohel';
nameMapping['Maheshwary Yogita Jivraj'] = 'Yogita Maheshwary';
nameMapping['Kamalakar Kasim'] = 'Kamalakar Kasim';
nameMapping['Soumya Pal'] = 'Soumya Pal';
nameMapping['Kinab Shah'] = 'Kinab Binditbhai Shah';
nameMapping['Sen Vishnu Rajmal'] = 'Sen Vishnu Rajmal';
nameMapping['Abhishek Kumar Jain'] = 'Abhishek Jain';
nameMapping['Pratham Jatilbhai Vora'] = 'Pratham Jatilbhai Vora';

// Process Expense.csv
const expenseLines = expenseData.split('\n');
const header = expenseLines[0];
const dataLines = expenseLines.slice(1);

const standardizedLines = [header];
let changesCount = 0;
const unmappedNames = new Set();

dataLines.forEach(line => {
  if (!line.trim()) return;
  
  const parts = line.split(',');
  if (parts.length >= 2) {
    const originalName = parts[1];
    const standardizedName = nameMapping[originalName] || originalName;
    
    if (standardizedName !== originalName) {
      changesCount++;
    }
    
    if (!nameMapping[originalName] && originalName.trim()) {
      unmappedNames.add(originalName);
    }
    
    parts[1] = standardizedName;
    standardizedLines.push(parts.join(','));
  }
});

// Write the standardized file
const outputPath = path.join(__dirname, 'Data', 'Expense_Standardized.csv');
fs.writeFileSync(outputPath, standardizedLines.join('\n'), 'utf-8');

console.log(`\nStandardization complete!`);
console.log(`Total changes made: ${changesCount}`);
console.log(`Output file: ${outputPath}`);

if (unmappedNames.size > 0) {
  console.log(`\nUnmapped names found (${unmappedNames.size}):`);
  unmappedNames.forEach(name => console.log(`  - "${name}"`));
}
