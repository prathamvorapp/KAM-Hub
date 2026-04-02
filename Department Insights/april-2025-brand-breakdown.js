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
    kamByEmail.set(email, { date: assignDate1, kamName: row['KAM Name 1'] });
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

const categories = {
  withBoth: [],
  withKAMOnly: [],
  withPOSOnly: [],
  withNeither: []
};

brandsByEmail.forEach((records, email) => {
  const kamInfo = kamByEmail.get(email);
  const hasKAM = kamInfo && kamInfo.date <= april2025;
  
  let hasPOS = false;
  let outletCount = 0;
  
  for (const row of records) {
    const posCreation = parseDate(row.POS_Subscription_creation);
    const posExpiry = parseDate(row.POS_Subscription_expiry);
    const posStatus = row.POS_Subscription_status;
    
    if (posCreation && posCreation <= april2025 && (!posExpiry || posExpiry >= april2025 || posStatus === 'active')) {
      hasPOS = true;
      outletCount++;
    }
  }
  
  const brandInfo = {
    email,
    kamName: kamInfo?.kamName || 'N/A',
    kamDate: kamInfo?.date?.toLocaleDateString() || 'N/A',
    outletCount
  };
  
  if (hasKAM && hasPOS) {
    categories.withBoth.push(brandInfo);
  } else if (hasKAM && !hasPOS) {
    categories.withKAMOnly.push(brandInfo);
  } else if (!hasKAM && hasPOS) {
    categories.withPOSOnly.push(brandInfo);
  } else {
    categories.withNeither.push(brandInfo);
  }
});

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         APRIL 2025 BRAND ANALYSIS - DETAILED BREAKDOWN        ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log('📊 SUMMARY:');
console.log('─────────────────────────────────────────────────────────────────');
console.log(`✅ Brands with BOTH KAM + POS:     ${categories.withBoth.length.toString().padStart(4)} brands`);
console.log(`👤 Brands with KAM ONLY:           ${categories.withKAMOnly.length.toString().padStart(4)} brands`);
console.log(`🏪 Brands with POS ONLY:           ${categories.withPOSOnly.length.toString().padStart(4)} brands`);
console.log(`❌ Brands with NEITHER:            ${categories.withNeither.length.toString().padStart(4)} brands`);
console.log('─────────────────────────────────────────────────────────────────');
console.log(`📈 TOTAL UNIQUE BRANDS:            ${brandsByEmail.size.toString().padStart(4)} brands\n`);

console.log('🔍 CURRENT LOGIC BEHAVIOR:');
console.log('─────────────────────────────────────────────────────────────────');
console.log('The calculateBrandCount() function in metrics-calculator.ts');
console.log('ONLY counts brands that have a KAM assignment (assign_date_1).');
console.log('');
console.log(`Current count shown in dashboard: ${categories.withBoth.length} brands`);
console.log('(Only brands with BOTH KAM assignment AND active POS)\n');

console.log('💡 INTERPRETATION:');
console.log('─────────────────────────────────────────────────────────────────');
console.log(`• ${categories.withBoth.length} brands are actively managed by KAM team`);
console.log(`• ${categories.withPOSOnly.length} brands have POS but no KAM assigned yet`);
console.log(`• ${categories.withKAMOnly.length} brands have KAM but POS expired/inactive`);
console.log('');

// Calculate total outlets for brands with both
const totalOutlets = categories.withBoth.reduce((sum, b) => sum + b.outletCount, 0);
console.log(`🏢 Total outlets for KAM-managed brands: ${totalOutlets}\n`);

// Show sample brands from each category
console.log('📋 SAMPLE BRANDS FROM EACH CATEGORY:\n');

console.log('✅ Brands with BOTH (first 5):');
categories.withBoth.slice(0, 5).forEach((b, i) => {
  console.log(`   ${i + 1}. ${b.email} - KAM: ${b.kamName} (${b.outletCount} outlets)`);
});

console.log('\n🏪 Brands with POS ONLY (first 5):');
categories.withPOSOnly.slice(0, 5).forEach((b, i) => {
  console.log(`   ${i + 1}. ${b.email} (${b.outletCount} outlets) - No KAM assigned`);
});

console.log('\n👤 Brands with KAM ONLY (first 5):');
categories.withKAMOnly.slice(0, 5).forEach((b, i) => {
  console.log(`   ${i + 1}. ${b.email} - KAM: ${b.kamName} - POS expired/inactive`);
});
