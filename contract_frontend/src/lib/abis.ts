export const ERC20_ABI = [
    {
      type: "function",
      name: "approve",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ type: "bool" }],
    },
    {
      type: "function",
      name: "allowance",
      stateMutability: "view",
      inputs: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
      ],
      outputs: [{ type: "uint256" }],
    },
    {
      type: "function",
      name: "decimals",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "uint8" }],
    },
  ] as const;
  
  export const WETH9_ABI = [
    { type: "function", name: "deposit", stateMutability: "payable", inputs: [], outputs: [] },
    {
      type: "function",
      name: "approve",
      stateMutability: "nonpayable",
      inputs: [
        { name: "spender", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ type: "bool" }],
    },
    { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  ] as const;
  
  export const PRIZE_ESCROW_ABI = [
    {
      type: "function",
      name: "createEvent",
      stateMutability: "payable",
      inputs: [
        {
          name: "p",
          type: "tuple",
          components: [
            { name: "token", type: "address" },
            { name: "depositAmount", type: "uint96" },
            { name: "registerDeadline", type: "uint64" },
            { name: "finalizeDeadline", type: "uint64" },
            { name: "judges", type: "address[]" },
            { name: "judgeThreshold", type: "uint8" },
            { name: "scope", type: "bytes32" },
          ],
        },
      ],
      outputs: [{ name: "id", type: "uint256" }],
    },
    {
      type: "function",
      name: "topUp",
      stateMutability: "payable",
      inputs: [
        { name: "id", type: "uint256" },
        { name: "amount", type: "uint96" },
      ],
      outputs: [],
    },
    {
      type: "function",
      name: "register",
      stateMutability: "nonpayable",
      inputs: [{ name: "id", type: "uint256" }],
      outputs: [],
    },
    {
      type: "function",
      name: "finalize",
      stateMutability: "nonpayable",
      inputs: [
        { name: "id", type: "uint256" },
        {
          name: "winners",
          type: "tuple[]",
          components: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint96" },
          ],
        },
      ],
      outputs: [],
    },
    {
      type: "function",
      name: "getEvent",
      stateMutability: "view",
      inputs: [{ name: "id", type: "uint256" }],
      outputs: [
        { name: "organizer", type: "address" },
        { name: "token", type: "address" },
        { name: "prizeRemaining", type: "uint96" },
        { name: "registerDeadline", type: "uint64" },
        { name: "finalizeDeadline", type: "uint64" },
        { name: "scope", type: "bytes32" },
        { name: "finalized", type: "bool" },
        { name: "canceled", type: "bool" },
        { name: "judgeCount", type: "uint16" },
        { name: "judgeThreshold", type: "uint8" },
      ],
    },
  ] as const;