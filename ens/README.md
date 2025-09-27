# ENS CLI - Enhanced ENS Registration & Resolution

A comprehensive CLI tool for ENS (Ethereum Name Service) registration and resolution across multiple networks.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Private key for your wallet
- RPC endpoints for the networks you want to use

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Setup

Create a `.env` file with the following variables:

```bash
# Required
PRIVATE_KEY=your_private_key_here

# RPC Endpoints (choose based on your needs)
HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_PROJECT_ID
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID  
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID

# Optional (auto-detected if not provided)
ENS_REGISTRY=0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e
ENS_CONTROLLER=0x253553366da8546fc250f225fe3d25d0c782303b
```

## 📋 Commands

### Test Commands
```bash
# Test ENS contracts connection
pnpm ens test
```

### Registration Commands
```bash
# Get registration price
pnpm ens quote <label> -y 1

# Commit to register (step 1)
pnpm ens commit <label> [--secret 0x...]

# Check commitment status
pnpm ens status <label> --secret 0x...

# Register name (step 2)
pnpm ens register <label> -y 1 --secret 0x...

# Full flow: commit -> wait -> register
pnpm ens all <label> -y 1 [--wait <seconds>]
```

### Resolution Commands
```bash
# Resolve ENS name to address
pnpm ens resolve <name> [--network mainnet|sepolia|holesky]

# Reverse resolve address to name
pnpm ens reverse <address> [--network mainnet|sepolia|holesky]
```

## 🌐 Network Support

### Mainnet (Recommended for Production)
- **Status**: ✅ Fully functional
- **Use Case**: Production ENS registration and resolution
- **RPC**: `ETHEREUM_RPC_URL`
- **Controller**: `0x253553366da8546fc250f225fe3d25d0c782303b`
- **Registry**: `0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e`

### Holesky Testnet (Recommended for Testing)
- **Status**: ⚠️ Limited functionality
- **Use Case**: Testing ENS resolution (registration may be unreliable)
- **RPC**: `HOLESKY_RPC_URL`
- **Controller**: `0xfce6ce4373cb6e7e470eaa55329638acd9dbd202`
- **Registry**: `0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e`
- **Public Resolver**: `0x6925affda98274fe0376250187ccc4ac62866dcd`

### Sepolia Testnet (Limited Support)
- **Status**: ❌ Registration broken
- **Use Case**: Testing ENS resolution only
- **RPC**: `SEPOLIA_RPC_URL`
- **Controller**: `0xfb3ce5d01e0f33f41dbb39035db9745962f1f968`
- **Registry**: `0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e`

## ⚠️ Important Testnet Limitations

### ETHRegistrarController Address (Testnet Status)

**Network Specific**: The ETHRegistrarController address varies by network.

**Sepolia/Holesky (2025 Status)**: Registration via ETHRegistrarController is currently broken or unavailable on Sepolia and Holesky due to missing or unwired contracts. Attempts to call functions like `available(name)` or `commit()` may result in empty reverts and failures. This is documented in ENS DAO governance discussions and there is no guarantee of stable testnet registration at the moment.

**Recommendations**:
- Use **mainnet** for reliable ENS registration
- Use **testnets** only for resolution testing
- If testnet registration fails, this is expected behavior

## 🧪 Usage Examples

### Test Network Connection
```bash
# Test Holesky connection
pnpm ens test

# Test mainnet resolution
pnpm ens resolve vitalik.eth --network mainnet
```

### Registration Flow (Mainnet)
```bash
# 1. Check if name is available and get price
pnpm ens quote myname -y 1

# 2. Commit to register (save the secret!)
pnpm ens commit myname --secret 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# 3. Wait for commitment to mature (usually 60 seconds)
pnpm ens status myname --secret 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# 4. Register the name
pnpm ens register myname -y 1 --secret 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### One-Command Registration
```bash
# Full flow: commit -> wait -> register
pnpm ens all myname -y 1
```

### Resolution Testing
```bash
# Resolve on mainnet
pnpm ens resolve vitalik.eth --network mainnet

# Resolve on Holesky (if you have a testnet name)
pnpm ens resolve myname.eth --network holesky

# Reverse resolve
pnpm ens reverse 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --network mainnet
```

## 🔧 Troubleshooting

### Common Issues

#### "could not decode result data" Error
- **Cause**: Wrong network or flaky RPC endpoint
- **Solution**: 
  - Verify you're using the correct network
  - Try switching to a different RPC provider (Infura/Alchemy)
  - Use `pnpm ens test` to diagnose the issue

#### "No contract code at address" Error
- **Cause**: Wrong controller address for the network
- **Solution**: The CLI auto-detects correct addresses, but verify your network

#### Registration Fails on Testnet
- **Cause**: Testnet registration is unreliable (expected behavior)
- **Solution**: Use mainnet for actual registration

### RPC Endpoint Issues

If you encounter RPC issues, try these reliable endpoints:

**Infura:**
```bash
HOLESKY_RPC_URL=https://holesky.infura.io/v3/YOUR_PROJECT_ID
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
```

**Alchemy:**
```bash
HOLESKY_RPC_URL=https://eth-holesky.g.alchemy.com/v2/YOUR_API_KEY
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

## 🏗️ For Developers

### Integration with Your DApp

If you're building an EventEscrow or similar dApp:

1. **Cross-chain ENS Resolution**: Resolve ENS names on the same chain as your contract
2. **Mainnet Names**: Use `--network mainnet` for resolution
3. **Testnet Names**: Use `--network holesky` for resolution
4. **Contract Deployment**: Deploy your contract on the same network as the ENS names you want to resolve

### Contract Addresses Reference

| Network | Registry | Controller | Public Resolver |
|---------|----------|------------|-----------------|
| Mainnet | `0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e` | `0x253553366da8546fc250f225fe3d25d0c782303b` | Auto-detected |
| Holesky | `0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e` | `0xfce6ce4373cb6e7e470eaa55329638acd9dbd202` | `0x6925affda98274fe0376250187ccc4ac62866dcd` |
| Sepolia | `0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e` | `0xfb3ce5d01e0f33f41dbb39035db9745962f1f968` | Auto-detected |

## 📚 Additional Resources

- [ENS Documentation](https://docs.ens.domains/)
- [ENS Deployments](https://docs.ens.domains/ens-deployments)
- [ENS DAO Governance](https://discuss.ens.domains/)

## ⚠️ Disclaimer

- Testnet registration is unreliable and may fail
- Always test on mainnet before production use
- Keep your private keys secure
- This tool is for development and testing purposes