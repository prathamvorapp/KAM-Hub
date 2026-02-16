const fs = require('fs');
const path = require('path');

const serviceFiles = [
  'lib/services/churnService.ts',
  'lib/services/visitService.ts',
  'lib/services/demoService.ts',
  'lib/services/healthCheckService.ts',
  'lib/services/momService.ts',
  'lib/services/masterDataService.ts',
  'lib/services/userService.ts',
  'lib/services/index.ts',
  'lib/utils/roleUtils.ts',
  'lib/session.ts'
];

console.log('🧪 Verifying critical files...');

let failed = false;
for (const file of serviceFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.error(`❌ ${file} is MISSING!`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('✅ All critical files present!');
