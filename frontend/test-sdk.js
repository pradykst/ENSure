/**
 * Quick SDK Test Script
 * Run with: node test-sdk.js
 */

// Test the SDK import
try {
  const { ensSDK, resolve, reverse, registerInternal, getInternalNames, testNetwork } = require('./src/lib/ens-sdk.ts');
  console.log('✅ SDK import successful!');
  console.log('Available functions:', Object.keys(ensSDK));
  
  // Test basic functionality
  console.log('\n🧪 Testing SDK functionality...');
  
  // Test internal naming
  console.log('1. Testing internal naming...');
  registerInternal('test-contract', '0x1234567890123456789012345678901234567890', 'contract', 'mainnet');
  const internalNames = getInternalNames();
  console.log('Internal names:', internalNames);
  
  console.log('\n✅ SDK test completed successfully!');
  console.log('You can now use the frontend at http://localhost:3000/ens-test');
  
} catch (error) {
  console.error('❌ SDK test failed:', error.message);
  console.log('Make sure to run: npm run dev');
}
