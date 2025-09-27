#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 ENSure Quick Start Setup\n');

// Step 1: Run environment setup
console.log('📝 Setting up environment variables...');
try {
  execSync('node setup-env.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to setup environment:', error.message);
  process.exit(1);
}

// Step 2: Check if dependencies are installed
console.log('\n📦 Checking dependencies...');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed');
}

// Step 3: Start development server
console.log('\n🎉 Setup complete! Starting development server...');
console.log('🌐 The app will be available at: http://localhost:3000');
console.log('📱 Connect your wallet and test the verification flow!');
console.log('\nPress Ctrl+C to stop the server\n');

try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start development server:', error.message);
  process.exit(1);
}
