# ENSure - Web3 Events Platform

ENSure is a Luma-style events platform for Web3 with sybil resistance, trustless payments, and proof of work features.

## Features

- **Sybil Resistance**: Identity verification using Self Protocol
- **Trustless Payments**: Prize pools escrowed in smart contracts
- **Proof of Work**: NFT minting for event participation and achievements
- **ENS Integration**: ENS-based avatars and profile names
- **Multi-chain Support**: Ethereum, Celo, and Rootstock

## Setup

1. Install dependencies:
```bash
npm install
# or
bun install
```

2. Set up environment variables:
```bash
node setup-env.js
```
This creates a `.env.local` file with working default values. The app will work out of the box with public RPC URLs.

3. Run the development server:
```bash
npm run dev
# or
bun dev
```

The app will be available at `http://localhost:3000`

### Environment Variables

The app includes fallback values for all required environment variables:
- **RPC URLs**: Uses public endpoints by default (Ethereum, Sepolia, Celo, Rootstock)
- **ENS Integration**: Configured with Sepolia and Mainnet for ENS lookups
- **Self Protocol**: Configured with default endpoint
- **WalletConnect**: Optional, only needed for WalletConnect integration

For production, replace the RPC URLs with your own endpoints for better reliability.

#### ENS Configuration
The app automatically falls back from Sepolia to Mainnet for ENS records:
- First checks Sepolia (11155111) for test ENS names
- Falls back to Mainnet (1) if no Sepolia record found
- This ensures maximum ENS compatibility

## User Flow

1. **Home Page**: Users see the hero section with "Connect Wallet" button
2. **Wallet Connection**: Users connect their wallet (MetaMask, WalletConnect, etc.)
3. **Verification**: After connecting, users are redirected to `/verify` for Self Protocol verification
4. **Events**: After successful verification, users can access the events page
5. **Profile**: ENS details are fetched and profile is created automatically

## Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Wallet Connection**: Wagmi v2 with ConnectKit
- **Identity Verification**: Self Protocol integration
- **Blockchain**: Multi-chain support (Ethereum, Celo, Rootstock)
- **Styling**: Luma-inspired design with modern UI components

## Pages

- `/` - Home page with hero section and wallet connection
- `/verify` - Self Protocol verification page
- `/events` - Events listing page (requires verification)
- `/profile` - User profile page (ENS-based)

## Smart Contracts

The platform integrates with:
- Self Protocol for identity verification
- Prize escrow contracts for trustless payments
- NFT contracts for proof of work tokens
- ENS for decentralized identity

## Development

The platform is built with modern Web3 technologies and follows best practices for security and user experience.