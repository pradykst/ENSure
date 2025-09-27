# ENS SDK Frontend Testing

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Set up Environment Variables
Create a `.env.local` file in the frontend directory:

```bash
# RPC Endpoints for ENS resolution
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
NEXT_PUBLIC_HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_PROJECT_ID
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
```

### 3. Run the Development Server
```bash
npm run dev
```

### 4. Test the ENS SDK
1. Go to `http://localhost:3000`
2. Click "🧪 Test ENS SDK"
3. Test all the SDK functions!

## 🧪 Testing Features

### Real ENS Resolution
- **vitalik.eth** → `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`
- **ethereum.eth** → `0x0000000000000000000000000000000000000000`
- **ens.eth** → `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`

### Reverse Resolution
- **0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045** → `vitalik.eth`
- **0x0000000000000000000000000000000000000000** → `ethereum.eth`
- **0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e** → `ens.eth`

### Internal Naming System
- Register contracts, transactions, and events
- Resolve custom names to addresses
- Manage internal names with persistence

## 🔧 SDK Functions Tested

### Core Functions
- `resolve(name, network)` - Resolve ENS names to addresses
- `reverse(address, network)` - Reverse resolve addresses to names
- `registerInternal(name, address, type, network)` - Register internal names
- `getInternalNames()` - Get all internal names
- `removeInternal(name)` - Remove internal names
- `clearInternal()` - Clear all internal names
- `testNetwork(network)` - Test network connectivity

### Network Support
- **Mainnet** - Full ENS resolution
- **Holesky** - Limited functionality
- **Sepolia** - Limited functionality

## 📱 Frontend Interface

The testing interface includes:

1. **Network Configuration** - Select and test networks
2. **ENS Resolution** - Resolve names to addresses
3. **Reverse Resolution** - Resolve addresses to names
4. **Internal Naming** - Register and manage custom names
5. **Results Display** - View all operation results
6. **Internal Names Management** - View and manage registered names

## 🎯 Use Cases Demonstrated

### 1. Real ENS Names
```typescript
// Resolve Vitalik's address
const result = await resolve('vitalik.eth', 'mainnet');
console.log(result.address); // 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### 2. Contract Naming
```typescript
// Register your event contract
registerInternal('ethglobal-escrow', '0x1234...', 'contract', 'mainnet');
const address = await resolve('ethglobal-escrow');
```

### 3. Transaction Tracking
```typescript
// Register deployment transaction
registerInternal('ethglobal-deploy', '0xabcd...', 'transaction', 'mainnet');
const txHash = await resolve('ethglobal-deploy');
```

### 4. Event Management
```typescript
// Register event instance
registerInternal('ethglobal-2024', 'event-001', 'event', 'mainnet');
const eventId = await resolve('ethglobal-2024');
```

## 🔍 Testing Scenarios

### Scenario 1: ENS Resolution
1. Enter `vitalik.eth` in the resolve field
2. Click "Resolve Name"
3. See the result: `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045`

### Scenario 2: Reverse Resolution
1. Enter `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` in the reverse field
2. Click "Reverse Resolve"
3. See the result: `vitalik.eth`

### Scenario 3: Internal Naming
1. Enter `my-escrow` as name
2. Enter `0x1234567890123456789012345678901234567890` as address
3. Select "Contract" as type
4. Click "Register Internal Name"
5. Resolve `my-escrow` to see your address

### Scenario 4: Mixed Resolution
1. Register internal names
2. Try resolving both ENS names and internal names
3. See how the SDK handles both types

## 🚨 Troubleshooting

### Common Issues

1. **"Missing RPC URL"** - Set the appropriate RPC endpoint in `.env.local`
2. **"Network not supported"** - Use 'mainnet', 'holesky', or 'sepolia'
3. **"Resolution failed"** - Check your RPC endpoint and network connectivity

### Debug Mode

The interface shows all operation results in real-time, making it easy to debug issues.

## 📚 Next Steps

After testing the SDK:

1. **Integrate with your EventEscrow** - Use the SDK in your dApp
2. **Deploy contracts** - Register your deployed contracts
3. **Track transactions** - Name important transactions
4. **Manage events** - Organize event instances

The SDK provides a complete naming system that works alongside real ENS names!
