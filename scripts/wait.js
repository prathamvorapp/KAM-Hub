#!/usr/bin/env node
// Simple cross-platform wait script
const ms = parseInt(process.argv[2] || '8000', 10);
console.log(`Waiting ${ms}ms for Next.js to initialize...`);
setTimeout(() => {
  console.log('Starting Caddy proxy...');
  process.exit(0);
}, ms);
