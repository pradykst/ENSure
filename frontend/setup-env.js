const fs = require('fs');
const path = require('path');

const envContent = `# ENSure Environment Variables
# Copy this file to .env.local and update with your actual values

# App Configuration
NEXT_PUBLIC_APP_NAME=ENSure
NEXT_PUBLIC_SELF_SCOPE=mydapp-scope
NEXT_PUBLIC_SELF_ENDPOINT=your-self-endpoint

# RPC URLs (using public fallbacks for development)
NEXT_PUBLIC_ROOTSTOCK_RPC=https://public-node.rsk.co
NEXT_PUBLIC_CELO_RPC=https://alfajores-forno.celo-testnet.org
NEXT_PUBLIC_SEPOLIA_RPC=https://sepolia.drpc.org
NEXT_PUBLIC_ETHEREUM_RPC=https://eth-mainnet.g.alchemy.com/v2/demo

# WalletConnect (optional - only needed for WalletConnect integration)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

# Note: The app will work with the default public RPC URLs above.
# For production, replace with your own RPC endpoints for better reliability.`;

const envPath = path.join(__dirname, '.env.local');
const envExamplePath = path.join(__dirname, '.env.example');

// Create .env.example for reference
fs.writeFileSync(envExamplePath, envContent);
console.log('✅ Created .env.example file');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local file with default values');
  console.log('📝 The app will work with public RPC URLs - no additional setup needed!');
  console.log('💡 For production, update the RPC URLs with your own endpoints');
} else {
  console.log('⚠️  .env.local already exists - skipping creation');
}
