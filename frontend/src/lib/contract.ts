// src/lib/contract.ts
import {
  createPublicClient,
  defineChain,
  getAddress,
  http,
  type Address,
} from "viem";

// Minimal ABI: only what your UI calls
const ABI = [
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

// Celo Sepolia (11142220) – define once so viem knows the chain
const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_CELO_RPC ||
          "https://forno.celo-sepolia.celo-testnet.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://celo-sepolia.blockscout.com",
    },
  },
});

// Build a public client so reads work even before a wallet is connected
const client = createPublicClient({
  chain: celoSepolia,
  transport: http(
    process.env.NEXT_PUBLIC_CELO_RPC ||
      "https://forno.celo-sepolia.celo-testnet.org"
  ),
});

export async function getProofOfHuman() {
  const addrRaw = (process.env.NEXT_PUBLIC_SELF_ENDPOINT || "").trim();
  // Validate the verifier address from env
  let contractAddress: Address;
  try {
    contractAddress = getAddress(addrRaw);
  } catch {
    throw new Error(
      `Verifier address env is missing/invalid: "${addrRaw}". Set NEXT_PUBLIC_SELF_ENDPOINT to your ProofOfHuman address.`
    );
  }

  // Return a tiny adapter with the method your page calls
  return {
    async isVerified(user: string) {
      const userAddr = getAddress(user);
      const result = await client.readContract({
        address: contractAddress,
        abi: ABI,
        functionName: "isVerified",
        args: [userAddr],
      });
      return Boolean(result);
    },
  };
}
