# 🔧 Mainnet ENS Resolution Setup

## The Issue
Your internal naming system works perfectly, but mainnet ENS resolution isn't working because the frontend needs RPC URLs to connect to Ethereum mainnet.

## ✅ Quick Fix (Already Applied)
I've updated the browser SDK to use public RPC URLs as fallbacks:
- **Mainnet**: `https://cloudflare-eth.com` (free, reliable)
- **Holesky**: `https://ethereum-holesky.publicnode.com`
- **Sepolia**: `https://ethereum-sepolia.publicnode.com`

## 🧪 How to Test Mainnet Resolution

### 1. **Start the dev server:**
```bash
cd frontend
npm run dev
```

### 2. **Use the Debug Page:**
- Go to `http://localhost:3000/debug-ens`
- Click "Run All Tests" to test:
  - ✅ Mainnet connection
  - ✅ ENS resolution (`vitalik.eth`)
  - ✅ Reverse resolution (Vitalik's address)

### 3. **Test in the Main Interface:**
- Go to `http://localhost:3000/ens-test`
- Select "Mainnet" from the dropdown
- Click "Test Network Connection"
- Try resolving `vitalik.eth` or `ethereum.eth`

## 🚀 Better RPC URLs (Optional)

For better performance, create a `.env.local` file in the frontend directory:

```env
# Better RPC URLs (get free keys from these providers)
NEXT_PUBLIC_ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_HOLESKY_RPC_URL=https://eth-holesky.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Alternative free RPCs
# NEXT_PUBLIC_ETHEREUM_RPC_URL=https://rpc.ankr.com/eth
# NEXT_PUBLIC_ETHEREUM_RPC_URL=https://ethereum.publicnode.com
```

## 🎯 Expected Results

After the fix, you should see:
- ✅ **Network Connection**: Green checkmark for mainnet
- ✅ **ENS Resolution**: Real addresses for ENS names like `vitalik.eth`
- ✅ **Reverse Resolution**: ENS names for addresses like Vitalik's
- ✅ **Internal Names**: Still work perfectly (as they do now)

## 🔍 Troubleshooting

If mainnet still doesn't work:
1. **Check browser console** for error messages
2. **Try the debug page** (`/debug-ens`) for detailed error info
3. **Test with different ENS names**: `ethereum.eth`, `ens.eth`
4. **Try different RPC providers** in `.env.local`

The internal naming system will continue to work regardless of mainnet connectivity!
