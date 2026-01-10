import { zeroAddress } from "viem";

export const PRIZE_ESCROW_ADDR = "0xaB376f64F16481E496DdD3336Dd12f7F9a58bAd3" as `0x${string}`;
export const TRIF_ADDRESS = "0x19f64674D8a5b4e652319F5e239EFd3bc969a1FE" as `0x${string}`;
export const WRBTC_ADDRESS = "" as `0x${string}` | "";
export const ROOTSTOCK_TESTNET = {
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: { name: "tRBTC", symbol: "tRBTC", decimals: 18 },
  rpcUrls: { default: { http: ["https://public-node.testnet.rsk.co"] } },
};

export const isZero = (addr?: string) => !addr || addr.toLowerCase() === zeroAddress.toLowerCase();
export const isTrif = (addr?: string) => !!addr && addr.toLowerCase() === TRIF_ADDRESS.toLowerCase();
export const getTokenLabel = (addr?: string) => 
  isZero(addr) ? "tRBTC" : isTrif(addr) ? "tRIF" : "Tokens";