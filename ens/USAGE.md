# ENS SDK Usage Guide

## 🚀 Quick Start for EventEscrow Integration

### 1. Import the SDK

```typescript
// In your frontend or backend files
import { ensSDK, resolve, reverse, registerInternal } from './ens/src/index';

// Or for EventEscrow integration
import { EventEscrowNaming } from './ens/src/event-escrow-integration';
```

### 2. Basic Usage

```typescript
// Resolve Vitalik's address
const vitalikAddress = await resolve('vitalik.eth', 'mainnet');
console.log('Vitalik address:', vitalikAddress?.address);

// Reverse resolve an address
const vitalikName = await reverse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'mainnet');
console.log('Vitalik name:', vitalikName?.name);
```

### 3. EventEscrow Integration

```typescript
import { EventEscrowNaming } from './ens/src/event-escrow-integration';

const naming = new EventEscrowNaming();

// Register your event contract
await naming.setupEvent(
  'ethglobal-hackathon',
  '0x1234567890123456789012345678901234567890', // Your contract address
  '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', // Deploy tx hash
  'mainnet'
);

// Later, resolve the event name
const contractAddress = await naming.resolveName('ethglobal-hackathon');
console.log('Event contract:', contractAddress);
```

### 4. Internal Naming System

```typescript
// Register a contract
registerInternal('my-escrow', '0x1234567890123456789012345678901234567890', 'contract', 'mainnet');

// Register a transaction
registerInternal('my-deploy-tx', '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', 'transaction', 'mainnet');

// Register an event
registerInternal('my-event', '0x9876543210987654321098765432109876543210987654321098765432109876', 'event', 'mainnet');

// Resolve any of these names
const result = await resolve('my-escrow');
console.log('Resolved:', result?.address);
```

## 🧪 Testing

```bash
# Test the SDK
cd ens
pnpm sdk:test

# Run examples
pnpm sdk:example
```

## 📁 File Structure

```
ens/
├── src/
│   ├── index.ts                    # Main SDK exports
│   ├── ens-sdk.ts                  # Core SDK implementation
│   ├── example.ts                  # Usage examples
│   ├── event-escrow-integration.ts # EventEscrow integration
│   └── README.md                   # SDK documentation
├── scripts/
│   └── ens-cli.ts                  # CLI tool
└── README.md                       # Main documentation
```

## 🔧 Environment Setup

Create a `.env` file in the `ens` directory:

```bash
# Required for ENS resolution
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_PROJECT_ID
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Your wallet private key (for CLI only)
PRIVATE_KEY=your_private_key_here
```

## 💡 Use Cases

### 1. Real ENS Resolution
```typescript
// Resolve ENS names to addresses
const address = await resolve('vitalik.eth', 'mainnet');
const name = await reverse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'mainnet');
```

### 2. Contract Naming
```typescript
// Name your deployed contracts
registerInternal('ethglobal-escrow', contractAddress, 'contract', 'mainnet');
const resolved = await resolve('ethglobal-escrow');
```

### 3. Transaction Tracking
```typescript
// Track important transactions
registerInternal('ethglobal-deploy', txHash, 'transaction', 'mainnet');
const tx = await resolve('ethglobal-deploy');
```

### 4. Event Management
```typescript
// Manage event instances
registerInternal('ethglobal-2024', eventId, 'event', 'mainnet');
const event = await resolve('ethglobal-2024');
```

## 🎯 For Your EventEscrow DApp

1. **Deploy your contract** and get the address
2. **Register it** with the SDK: `registerInternal('my-event', contractAddress, 'contract')`
3. **Use the name** throughout your app: `resolve('my-event')`
4. **Track transactions** and events the same way

This gives you a clean, consistent naming system that works alongside real ENS names!
