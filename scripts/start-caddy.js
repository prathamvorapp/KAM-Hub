#!/usr/bin/env node
// Cross-platform Caddy starter with delay
const { spawn } = require('child_process');
const path = require('path');

// Wait for Next.js to start
const delay = parseInt(process.argv[2] || '8000', 10);
console.log(`[CADDY] Waiting ${delay}ms for Next.js to initialize...`);

setTimeout(() => {
  console.log('[CADDY] Starting Caddy proxy on port 3020...');
  
  const caddyPath = path.join(__dirname, '..', 'caddy', 'caddy.exe');
  const caddyfilePath = path.join(__dirname, '..', 'Caddyfile');
  
  const caddy = spawn(caddyPath, ['run', '--config', caddyfilePath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  caddy.on('error', (err) => {
    console.error('[CADDY] Failed to start:', err.message);
    process.exit(1);
  });
  
  caddy.on('exit', (code) => {
    console.log(`[CADDY] Exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle termination
  process.on('SIGINT', () => {
    console.log('[CADDY] Stopping...');
    caddy.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    caddy.kill('SIGTERM');
  });
}, delay);
