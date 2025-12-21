// Contract addresses and ABIs for ENSure
// Deployed contract addresses

export const ADDRS = {
  // Self Protocol Hub addresses
  SELF_HUB_CELO_SEPOLIA: '0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74' as const,
  SELF_HUB_CELO_MAINNET: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF' as const,

  // Deployed contract addresses
  PROOF_OF_HUMAN_CELO: '0x51e6aa6f6527b254e8f8b6677cdfa3861c0bcc5e' as const, // Self Protocol on Celo Sepolia
  PRIZE_ESCROW_ROOTSTOCK: '0xaB376f64F16481E496DdD3336Dd12f7F9a58bAd3' as const, // PrizeEscrow on Rootstock Testnet
  TRIF_TOKEN: '0x19f64674D8a5b4e652319F5e239EFd3bc969a1FE' as const, // tRIF on Rootstock Testnet
};

// Self Adapter ABI (simplified)
export const SelfAdapterABI = [
  {
    "inputs": [
      { "internalType": "bytes", "name": "proof", "type": "bytes" },
      { "internalType": "bytes32", "name": "scope", "type": "bytes32" },
      { "internalType": "address", "name": "user", "type": "address" }
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
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "bytes32", "name": "scope", "type": "bytes32" }
    ],
    "name": "isVerified",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ProofOfHuman ABI (from the existing contract)
export const ProofOfHumanABI = [
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "isVerified",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "scope",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Contract utility functions
export const getContractAddress = (chainId: number) => {
  switch (chainId) {
    case 11142220: // Celo Sepolia - ProofOfHuman (Self Protocol)
      return ADDRS.PROOF_OF_HUMAN_CELO;
    case 31: // Rootstock Testnet - PrizeEscrow
      return ADDRS.PRIZE_ESCROW_ROOTSTOCK;
    default:
      return null;
  }
};
