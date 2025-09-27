import { defineChain } from 'viem';

export const rootstockTestnet = defineChain({
  id: 31,
  name: 'Rootstock Testnet',
  nativeCurrency: { name: 'Test RBTC', symbol: 'tRBTC', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ROOTSTOCK_RPC!] } },
});

export const celoSepolia = defineChain({
  id: 11142220,
  name: 'Celo Sepolia',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_CELO_RPC!] } },
});

export const ethereumMainnet = defineChain({
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ETHEREUM_RPC!]} },
});
