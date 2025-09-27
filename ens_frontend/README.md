# ENSure Frontend

A Next.js application for ENSure - Prize escrow for verified humans on Rootstock using Self Protocol for identity verification.

## Features

- 🔐 ZK identity verification with Self Protocol
- 🔒 Escrowed payouts for verified humans
- 🏷 ENS winners support
- ⚡ Instant finalize functionality
- Modern UI with Tailwind CSS and brand colors

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom brand colors
- **Web3**: wagmi v2 + viem
- **State Management**: TanStack Query
- **Identity Verification**: @selfxyz/qrcode

## Brand Colors

- **Primary**: #2962FF (Deep Ethereum Blue)
- **Secondary**: #651FFF (Deep Violet)
- **Accent**: #00E5FF (Electric Cyan)
- **Background**: #FFFFFF (Clean White)
- **Dark**: #1A1A2E (Digital Dark Grey)

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.local` and configure:
   ```bash
   NEXT_PUBLIC_APP_NAME=ENSure
   NEXT_PUBLIC_SELF_SCOPE=0x<32-bytes-scope>
   NEXT_PUBLIC_SELF_ENDPOINT=staging_celo
   NEXT_PUBLIC_ROOTSTOCK_RPC=https://public-node.testnet.rsk.co
   NEXT_PUBLIC_CELO_RPC=https://forno.celo-sepolia.celo-testnet.org
   NEXT_PUBLIC_ETHEREUM_RPC=<your-mainnet-rpc>
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open** [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home page with Connect Wallet CTA
│   ├── verify/
│   │   └── page.tsx        # Self QR verification page
│   └── globals.css         # Global styles with brand colors
├── components/
│   └── ConnectButton.tsx   # Wallet connection component
└── lib/
    ├── chains.ts           # Chain configurations
    ├── wagmi.ts           # wagmi configuration
    └── contracts.ts       # Contract ABIs and addresses
```

## Usage Flow

1. **Home Page**: Users see the branded landing page with "Connect Wallet" CTA
2. **Connect Wallet**: Clicking connects to MetaMask and routes to `/verify`
3. **Verify Page**: Shows Self QR code for identity verification
4. **Self App**: Users scan QR with Self mobile app to verify identity
5. **Verification**: Optional bridge to Rootstock and polling for verification status

## Development

- **Build**: `npm run build`
- **Start**: `npm start`
- **Lint**: `npm run lint`

## Notes

- The application uses placeholder contract addresses that need to be replaced with actual deployed contract addresses
- Self Protocol integration requires proper scope configuration
- The optional bridge functionality can be enabled by updating contract addresses in `src/lib/contracts.ts`
