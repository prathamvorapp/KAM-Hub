const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting KAM Dashboard Development Environment...\n');

// Start Next.js development server
console.log('🌐 Starting Next.js development server...');
const frontend = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
});

frontend.on('close', (code) => {
    console.log(`[NEXT.JS] Process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development environment...');
    frontend.kill();
    process.exit();
});

console.log('✅ Development environment started!');
console.log('🌐 Frontend: http://localhost:3020');
console.log('📊 Using Supabase for backend');
console.log('\nPress Ctrl+C to stop the server\n');