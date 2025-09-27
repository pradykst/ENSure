'use client';

import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { celoSepolia, rootstockTestnet, ethereumMainnet } from './chains';

export const config = createConfig({
  chains: [rootstockTestnet, celoSepolia, ethereumMainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [rootstockTestnet.id]: http(rootstockTestnet.rpcUrls.default.http[0]),
    [celoSepolia.id]: http(celoSepolia.rpcUrls.default.http[0]),
    [ethereumMainnet.id]: http(ethereumMainnet.rpcUrls.default.http[0]),
  },
  ssr: true,
});
