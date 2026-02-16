const fs = require('fs');
const path = require('path');

const files = [
  'lib/services/churnService.ts',
  'lib/services/visitService.ts',
  'lib/services/momService.ts',
  'lib/services/masterDataService.ts',
  'lib/services/healthCheckService.ts',
  'lib/services/demoService.ts',
  'app/api/churn/send-notifications/route.ts'
];

files.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all occurrences of supabaseAdmin. with getSupabaseAdmin().
  content = content.replace(/supabaseAdmin\./g, 'getSupabaseAdmin().');
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${file}`);
});

console.log('\n✅ All files updated!');
