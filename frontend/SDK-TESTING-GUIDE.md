# ENS SDK Frontend Testing Guide

## 🚀 Quick Start

1. **Start the development server:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Open the test interface:**
   - Go to `http://localhost:3000/ens-test`
   - This provides a full UI for testing all SDK functionality

## 🧪 Testing Features

### 1. Network Connection Testing
- **Test Network Connection** button tests RPC connectivity
- Supports: Mainnet, Holesky, Sepolia
- Requires RPC URLs in environment variables

### 2. ENS Resolution Testing
- **Resolve ENS Names**: Try these examples:
  - `vitalik.eth`
  - `ethereum.eth` 
  - `ens.eth`
- **Reverse Resolution**: Try these addresses:
  - `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` (Vitalik)
  - `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` (ENS Registry)

### 3. Internal Naming System
- **Register Contracts**: Name your smart contracts
- **Register Transactions**: Name transaction hashes
- **Register Events**: Name event identifiers
- **Persistent Storage**: Uses localStorage for persistence

## 🔧 Environment Setup

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_HOLESKY_RPC_URL=https://eth-holesky.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

## 📋 Test Checklist

- [ ] SDK imports without errors
- [ ] Network connection tests pass
- [ ] ENS resolution works for known names
- [ ] Reverse resolution works for known addresses
- [ ] Internal naming system works
- [ ] Data persists in localStorage
- [ ] All UI components render correctly

## 🐛 Troubleshooting

**Import Errors:**
- Check that `tsconfig.json` has the correct path mapping
- Ensure the ens directory structure is correct

**Network Errors:**
- Verify RPC URLs are set correctly
- Check network connectivity
- Try different RPC providers

**UI Issues:**
- Check browser console for errors
- Ensure all dependencies are installed
- Try hard refresh (Ctrl+F5)

## 🎯 Expected Results

The test interface should show:
1. **Network Status**: Green checkmarks for connected networks
2. **ENS Resolution**: Real addresses for ENS names
3. **Internal Names**: Your custom registered names
4. **Results Log**: All operations with timestamps
5. **No Console Errors**: Clean browser console

## 🚀 Next Steps

Once testing is complete:
1. The SDK is ready for production use
2. You can integrate it into your main application
3. All functions are available via the import: `import { ensSDK, resolve, reverse, registerInternal } from '@/lib/ens-sdk'`
