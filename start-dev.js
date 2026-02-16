const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting KAM Dashboard Development Environment...\n');

// Start Convex
console.log('📡 Starting Convex backend...');
const convex = spawn('npx', ['convex', 'dev'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
});

convex.stdout.on('data', (data) => {
    console.log(`[CONVEX] ${data.toString().trim()}`);
});

convex.stderr.on('data', (data) => {
    console.log(`[CONVEX] ${data.toString().trim()}`);
});

// Wait a moment for Convex to start, then start frontend
setTimeout(() => {
    console.log('🌐 Starting Frontend...');
    const frontend = spawn('npm', ['run', 'dev'], {
        cwd: path.join(__dirname, 'New Backup', 'frontend'),
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
    });

    frontend.stdout.on('data', (data) => {
        console.log(`[FRONTEND] ${data.toString().trim()}`);
    });

    frontend.stderr.on('data', (data) => {
        console.log(`[FRONTEND] ${data.toString().trim()}`);
    });

    frontend.on('close', (code) => {
        console.log(`[FRONTEND] Process exited with code ${code}`);
    });
}, 2000);

convex.on('close', (code) => {
    console.log(`[CONVEX] Process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development environment...');
    convex.kill();
    process.exit();
});

console.log('✅ Development environment started!');
console.log('📡 Convex: Backend functions and database');
console.log('🌐 Frontend: Will start on http://localhost:3020');
console.log('\nPress Ctrl+C to stop all services\n');