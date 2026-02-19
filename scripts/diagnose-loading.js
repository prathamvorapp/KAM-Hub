/**
 * Diagnostic script to identify loading/compilation issues
 * Run with: node scripts/diagnose-loading.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 KAM Dashboard - Loading Issue Diagnostics\n');

// Check 1: Environment variables
console.log('1️⃣ Checking environment variables...');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=');
  const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
  
  console.log(`   ✅ .env.local exists`);
  console.log(`   ${hasSupabaseUrl ? '✅' : '❌'} NEXT_PUBLIC_SUPABASE_URL`);
  console.log(`   ${hasSupabaseKey ? '✅' : '❌'} NEXT_PUBLIC_SUPABASE_ANON_KEY`);
} else {
  console.log('   ❌ .env.local not found');
}

// Check 2: Build artifacts
console.log('\n2️⃣ Checking build artifacts...');
const nextPath = path.join(__dirname, '..', '.next');
if (fs.existsSync(nextPath)) {
  console.log('   ⚠️  .next directory exists (should be cleared)');
  console.log('   Run: rmdir /s /q .next');
} else {
  console.log('   ✅ .next directory cleared');
}

// Check 3: Critical files
console.log('\n3️⃣ Checking critical files...');
const criticalFiles = [
  'contexts/AuthContext.tsx',
  'hooks/useChurnData.ts',
  'app/layout.tsx',
  'app/page.tsx',
  'components/ErrorBoundary.tsx',
  'next.config.js'
];

criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING!`);
  }
});

// Check 4: Package.json scripts
console.log('\n4️⃣ Checking package.json scripts...');
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`   ✅ dev script: ${pkg.scripts.dev}`);
  console.log(`   ✅ Next.js version: ${pkg.dependencies.next}`);
  console.log(`   ✅ React version: ${pkg.dependencies.react}`);
} else {
  console.log('   ❌ package.json not found');
}

// Check 5: Common issues
console.log('\n5️⃣ Common issues to check:');
console.log('   • Browser cache - Clear with Ctrl+Shift+Delete');
console.log('   • Browser cookies - Check Application tab in DevTools');
console.log('   • Console errors - Open DevTools (F12) and check Console tab');
console.log('   • Network errors - Check Network tab for failed requests');
console.log('   • Port conflicts - Ensure port 3022 is available');

console.log('\n📋 Next Steps:');
console.log('   1. Run: npm run dev');
console.log('   2. Open: http://localhost:3022');
console.log('   3. Open DevTools (F12) and check Console tab');
console.log('   4. If stuck, check LOADING_FIX_INSTRUCTIONS.md');

console.log('\n✅ Diagnostic complete!\n');
