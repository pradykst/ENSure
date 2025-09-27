import { defineChain } from 'viem';

// Fallback RPC URLs
const getRpcUrl = (envVar: string | undefined, fallback: string) => {
  return envVar && envVar !== 'your-api-key' ? envVar : fallback;
};

export const rootstockTestnet = defineChain({
  id: 31,
  name: 'Rootstock Testnet',
  nativeCurrency: { name: 'Test RBTC', symbol: 'tRBTC', decimals: 18 },
  rpcUrls: { 
    default: { 
      http: [getRpcUrl(process.env.NEXT_PUBLIC_ROOTSTOCK_RPC, 'https://public-node.rsk.co')] 
    } 
  },
});

export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { 
    default: { 
      http: [getRpcUrl(process.env.NEXT_PUBLIC_CELO_RPC, 'https://alfajores-forno.celo-testnet.org')] 
    } 
  },
});

export const ethereumMainnet = defineChain({
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { 
    default: { 
      http: [getRpcUrl(process.env.NEXT_PUBLIC_ETHEREUM_RPC, 'https://eth-mainnet.g.alchemy.com/v2/demo')] 
    } 
  },
});
