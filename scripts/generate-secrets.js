#!/usr/bin/env node

/**
 * Generate secure secrets for environment variables
 * Run: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('🔐 Generating Secure Secrets for Environment Variables\n');
console.log('Copy these values to your .env.local (development) or Vercel environment variables (production):\n');
console.log('─'.repeat(80));
console.log('\n# JWT Configuration');
console.log(`JWT_SECRET=${generateSecret()}`);
console.log(`SUPABASE_JWT_SECRET=${generateSecret()}`);
console.log(`CSRF_SECRET=${generateSecret()}`);
console.log('\n' + '─'.repeat(80));
console.log('\n⚠️  IMPORTANT:');
console.log('1. Use different secrets for development and production');
console.log('2. Never commit these secrets to git');
console.log('3. Store production secrets securely in Vercel dashboard');
console.log('4. Rotate secrets every 90 days');
console.log('\n✅ Secrets generated successfully!\n');
