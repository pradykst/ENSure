// Contract addresses and ABIs for ENSure
// These would typically be deployed contract addresses

export const ADDRS = {
  // Self Protocol Hub addresses
  SELF_HUB_CELO_SEPOLIA: '0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74' as const,
  SELF_HUB_CELO_MAINNET: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF' as const,
  
  // Placeholder addresses - these would be actual deployed contract addresses
  SELF_ADAPTER: '0x0000000000000000000000000000000000000000' as const, // Replace with actual adapter address
  ATTESTATIONS: '0x0000000000000000000000000000000000000000' as const, // Replace with actual attestations address
  SCOPE: '0x0000000000000000000000000000000000000000000000000000000000000000' as const, // Replace with actual scope
};

// Self Adapter ABI (simplified)
export const SelfAdapterABI = [
  {
    "inputs": [
      {"internalType": "bytes", "name": "proof", "type": "bytes"},
      {"internalType": "bytes32", "name": "scope", "type": "bytes32"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "verifyAndBridge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Identity Attestations ABI (simplified)
export const IdentityAttestationsABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"},
      {"internalType": "bytes32", "name": "scope", "type": "bytes32"}
    ],
    "name": "isVerified",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ProofOfHuman ABI (from the existing contract)
export const ProofOfHumanABI = [
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "isVerified",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "scope",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Contract utility functions
export const getContractAddress = (chainId: number) => {
  // This would return the actual deployed contract address for the given chain
  // For now, return placeholder addresses
  switch (chainId) {
    case 11142220: // Celo Sepolia
      return '0x0000000000000000000000000000000000000000' as const; // Replace with actual address
    case 31: // Rootstock Testnet
      return '0x0000000000000000000000000000000000000000' as const; // Replace with actual address
    default:
      return '0x0000000000000000000000000000000000000000' as const;
  }
};
