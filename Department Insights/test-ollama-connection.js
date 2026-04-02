// Quick test script to verify Ollama connection
// Run with: node test-ollama-connection.js

const http = require('http');

console.log('🔍 Testing Ollama connection...\n');

// Test 1: Check if Ollama is running
const options = {
  hostname: 'localhost',
  port: 11434,
  path: '/api/tags',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Ollama is running on http://localhost:11434');
      
      try {
        const models = JSON.parse(data);
        console.log('\n📦 Available models:');
        
        if (models.models && models.models.length > 0) {
          models.models.forEach((model) => {
            console.log(`   - ${model.name}`);
          });
          
          // Check for qwen2.5:3b
          const hasQwen = models.models.some(m => m.name.includes('qwen2.5:3b'));
          if (hasQwen) {
            console.log('\n✅ Qwen2.5:3b model is installed');
            console.log('\n🎉 Setup is complete! You can now run:');
            console.log('   npm run dev');
            console.log('\n   Then visit: http://localhost:3000/dashboard/ai-analytics');
          } else {
            console.log('\n⚠️  Qwen2.5:3b model not found');
            console.log('   Run: ollama pull qwen2.5:3b');
          }
        } else {
          console.log('   No models installed');
          console.log('\n⚠️  Please install Qwen2.5:3b:');
          console.log('   ollama pull qwen2.5:3b');
        }
      } catch (e) {
        console.log('❌ Error parsing response:', e.message);
      }
    } else {
      console.log(`❌ Unexpected status code: ${res.statusCode}`);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Ollama is not running or not accessible');
  console.log(`   Error: ${error.message}`);
  console.log('\n📝 To fix this:');
  console.log('   1. Install Ollama from https://ollama.ai/download');
  console.log('   2. Start Ollama: ollama serve');
  console.log('   3. Pull the model: ollama pull qwen2.5:3b');
  console.log('   4. Run this test again');
});

req.end();
