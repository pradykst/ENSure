# ENS SDK - Enhanced ENS Resolution & Internal Naming System

A comprehensive SDK that provides both real ENS resolution and an internal naming system for contracts, transactions, and events.

## 🚀 Features

- **Real ENS Resolution**: Resolve ENS names on mainnet, Holesky, and Sepolia
- **Internal Naming System**: Register and resolve custom names for contracts, transactions, and events
- **Cross-chain Support**: Works across multiple networks
- **Persistence**: Internal names are saved to localStorage
- **TypeScript Support**: Full TypeScript definitions included

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your RPC endpoints
```

## 🔧 Environment Setup

Create a `.env` file with your RPC endpoints:

```bash
# Required RPC endpoints
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_PROJECT_ID
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Optional: Override contract addresses
ENS_REGISTRY=0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e
ENS_CONTROLLER=0x253553366da8546fc250f225fe3d25d0c782303b
```

## 📚 Usage

### Basic Import

```typescript
import { ensSDK, resolve, reverse, registerInternal } from './src/index';

// Or import specific functions
import { resolve, reverse, registerInternal, getInternalNames } from './src/index';
```

### Real ENS Resolution

```typescript
// Resolve ENS name to address
const result = await resolve('vitalik.eth', 'mainnet');
if (result) {
  console.log(`${result.name} → ${result.address}`);
  console.log(`Network: ${result.network}`);
  console.log(`Is Internal: ${result.isInternal}`);
}

// Reverse resolve address to name
const reverseResult = await reverse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', 'mainnet');
if (reverseResult) {
  console.log(`${reverseResult.address} → ${reverseResult.name}`);
}
```

### Internal Naming System

```typescript
// Register a contract
registerInternal('ethglobal-escrow', '0x1234567890123456789012345678901234567890', 'contract', 'mainnet');

// Register a transaction
registerInternal('ethglobal-tx', '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', 'transaction', 'mainnet');

// Register an event
registerInternal('ethglobal-event', '0x9876543210987654321098765432109876543210987654321098765432109876', 'event', 'mainnet');

// Resolve internal names
const contractResult = await resolve('ethglobal-escrow');
if (contractResult) {
  console.log(`Contract: ${contractResult.name} → ${contractResult.address}`);
  console.log(`Type: ${contractResult.type}`);
}
```

### Advanced Usage

```typescript
// Get all internal names
const allInternal = getInternalNames();
console.log('All internal names:', allInternal);

// Get internal names by type
const contracts = getInternalNamesByType('contract');
const transactions = getInternalNamesByType('transaction');
const events = getInternalNamesByType('event');

// Remove an internal name
removeInternal('ethglobal-escrow');

// Clear all internal names
clearInternal();

// Test network connection
const isConnected = await testNetwork('mainnet');
console.log('Mainnet connected:', isConnected);
```

### EventEscrow Integration Example

```typescript
import { ensSDK, registerInternal, resolve } from './src/index';

class EventEscrowManager {
  private ensSDK = ensSDK;

  async createEvent(eventName: string, contractAddress: string, network: string = 'mainnet') {
    // Register the event contract
    registerInternal(eventName, contractAddress, 'contract', network);
    
    // Also register with a transaction hash if available
    const txHash = await this.getTransactionHash(contractAddress);
    if (txHash) {
      registerInternal(`${eventName}-deploy`, txHash, 'transaction', network);
    }
    
    console.log(`✅ Event "${eventName}" registered at ${contractAddress}`);
  }

  async resolveEventName(nameOrAddress: string): Promise<string | null> {
    // Try to resolve as name first
    const result = await this.ensSDK.resolve(nameOrAddress);
    if (result) {
      return result.address;
    }

    // Try reverse resolution
    const reverseResult = await this.ensSDK.reverse(nameOrAddress);
    if (reverseResult) {
      return reverseResult.name;
    }

    return null;
  }

  private async getTransactionHash(contractAddress: string): Promise<string | null> {
    // Implementation to get transaction hash from contract address
    // This would depend on your specific use case
    return null;
  }
}

// Usage
const eventManager = new EventEscrowManager();
await eventManager.createEvent('ethglobal-hackathon', '0x1234567890123456789012345678901234567890');
```

## 🌐 Network Support

| Network | Status | Use Case |
|---------|--------|----------|
| Mainnet | ✅ Full support | Production ENS resolution |
| Holesky | ⚠️ Limited | Testing (resolution only) |
| Sepolia | ❌ Broken | Not recommended |

## 🔍 API Reference

### Core Functions

#### `resolve(name: string, network?: string): Promise<ENSResult | null>`
Resolves a name to an address (ENS or internal).

#### `reverse(address: string, network?: string): Promise<ENSResult | null>`
Reverse resolves an address to a name (ENS or internal).

#### `registerInternal(name: string, address: string, type: 'contract' | 'transaction' | 'event', network?: string): void`
Registers an internal name for a contract, transaction, or event.

#### `getInternalNames(): InternalName[]`
Returns all registered internal names.

#### `getInternalNamesByType(type: 'contract' | 'transaction' | 'event'): InternalName[]`
Returns internal names filtered by type.

#### `removeInternal(name: string): boolean`
Removes an internal name.

#### `clearInternal(): void`
Clears all internal names.

#### `testNetwork(network?: string): Promise<boolean>`
Tests network connectivity.

### Types

```typescript
interface ENSResult {
  name: string;
  address: string;
  network: string;
  isInternal: boolean;
  type?: 'contract' | 'transaction' | 'event';
}

interface InternalName {
  type: 'contract' | 'transaction' | 'event';
  address: string;
  name: string;
  network: string;
  timestamp: number;
}
```

## 🧪 Testing

```bash
# Run examples
pnpm dev

# Test network connections
pnpm test
```

## 📝 Examples

See `example.ts` for comprehensive usage examples.

## ⚠️ Important Notes

- **Testnet Limitations**: ENS registration is unreliable on testnets
- **Persistence**: Internal names are saved to localStorage (browser) or memory (Node.js)
- **Network Requirements**: RPC endpoints are required for ENS resolution
- **Case Sensitivity**: Names are normalized to lowercase

## 🔧 Troubleshooting

### Common Issues

1. **"Missing RPC URL"**: Set the appropriate RPC endpoint in your `.env` file
2. **"Network not supported"**: Use 'mainnet', 'holesky', or 'sepolia'
3. **"Resolution failed"**: Check your RPC endpoint and network connectivity

### Debug Mode

```typescript
// Test network connections
await ensSDK.testNetwork('mainnet');
await ensSDK.testNetwork('holesky');
```
