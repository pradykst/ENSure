/**
 * ENS SDK Usage Examples
 * 
 * This file demonstrates how to use the ENS SDK for both
 * real ENS resolution and internal naming system
 */

import { ensSDK, resolve, reverse, registerInternal, getInternalNames } from './index';

async function examples() {
  console.log('🚀 ENS SDK Examples\n');

  // 1. Test network connections
  console.log('1. Testing network connections...');
  await ensSDK.testNetwork('mainnet');
  await ensSDK.testNetwork('holesky');
  console.log();

  // 2. Real ENS resolution (mainnet)
  console.log('2. Real ENS resolution...');
  const vitalikResult = await resolve('vitalik.eth', 'mainnet');
  if (vitalikResult) {
    console.log(`✅ vitalik.eth → ${vitalikResult.address} (${vitalikResult.isInternal ? 'internal' : 'ENS'})`);
  }

  // 3. Reverse resolution
  console.log('\n3. Reverse resolution...');
  if (vitalikResult) {
    const reverseResult = await reverse(vitalikResult.address, 'mainnet');
    if (reverseResult) {
      console.log(`✅ ${vitalikResult.address} → ${reverseResult.name} (${reverseResult.isInternal ? 'internal' : 'ENS'})`);
    }
  }

  // 4. Internal naming system
  console.log('\n4. Internal naming system...');
  
  // Register a contract
  registerInternal('ethglobal-escrow', '0x1234567890123456789012345678901234567890', 'contract', 'mainnet');
  console.log('✅ Registered contract: ethglobal-escrow');
  
  // Register a transaction
  registerInternal('ethglobal-tx', '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', 'transaction', 'mainnet');
  console.log('✅ Registered transaction: ethglobal-tx');
  
  // Register an event
  registerInternal('ethglobal-event', '0x9876543210987654321098765432109876543210987654321098765432109876', 'event', 'mainnet');
  console.log('✅ Registered event: ethglobal-event');

  // 5. Resolve internal names
  console.log('\n5. Resolving internal names...');
  const contractResult = await resolve('ethglobal-escrow');
  if (contractResult) {
    console.log(`✅ ethglobal-escrow → ${contractResult.address} (${contractResult.type})`);
  }

  const txResult = await resolve('ethglobal-tx');
  if (txResult) {
    console.log(`✅ ethglobal-tx → ${txResult.address} (${txResult.type})`);
  }

  // 6. Get all internal names
  console.log('\n6. All internal names:');
  const allInternal = getInternalNames();
  allInternal.forEach(name => {
    console.log(`  - ${name.name} (${name.type}) → ${name.address}`);
  });

  // 7. Mixed resolution (ENS + Internal)
  console.log('\n7. Mixed resolution...');
  const mixedNames = ['vitalik.eth', 'ethglobal-escrow', 'nonexistent.eth'];
  
  for (const name of mixedNames) {
    const result = await resolve(name);
    if (result) {
      console.log(`✅ ${name} → ${result.address} (${result.isInternal ? 'internal' : 'ENS'})`);
    } else {
      console.log(`❌ ${name} → Not found`);
    }
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  examples().catch(console.error);
}

export { examples };
