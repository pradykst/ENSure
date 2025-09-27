'use client';

import { http, createConfig } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';
import { rootstockTestnet, celoSepolia } from './chains';
import { injected, metaMask } from 'wagmi/connectors';

// Fallback RPC URLs
const getRpcUrl = (envVar: string | undefined, fallback: string) => {
  return envVar && envVar !== 'your-api-key' ? envVar : fallback;
};

export const config = createConfig({
  chains: [
    rootstockTestnet,   // 31
    celoSepolia,        // your celo testnet
    sepolia,            // 11155111 - for ENS hooks
    mainnet,            // 1 - fallback for ENS
  ],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [rootstockTestnet.id]: http(getRpcUrl(
      process.env.NEXT_PUBLIC_ROOTSTOCK_RPC,
      'https://public-node.rsk.co'
    )),
    [celoSepolia.id]: http(getRpcUrl(
      process.env.NEXT_PUBLIC_CELO_RPC,
      'https://alfajores-forno.celo-testnet.org'
    )),
    [sepolia.id]: http(getRpcUrl(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC,
      'https://sepolia.drpc.org'
    )),
    [mainnet.id]: http(getRpcUrl(
      process.env.NEXT_PUBLIC_MAINNET_RPC,
      'https://rpc.ankr.com/eth'
    )),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
