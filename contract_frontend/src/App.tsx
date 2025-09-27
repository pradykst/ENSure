import React, { useMemo, useState, useEffect } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { parseEther, formatEther, isAddress, zeroAddress } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Rootstock PrizeEscrow Demo UI (no verification gating)
 * - Register is now independent of attestations
 * - All event lifecycle operations supported
 *
 * Update PRIZE_ESCROW_ADDR with your deployed address.
 */

// === CONFIG ===
const ROOTSTOCK_TESTNET = {
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: { name: "tRBTC", symbol: "tRBTC", decimals: 18 },
  rpcUrls: {
    // Public node is stable for frontend usage
    default: { http: ["https://public-node.testnet.rsk.co"] },
  },
};

// --- Deployed PrizeEscrow address ---
const PRIZE_ESCROW_ADDR = "0xaB376f64F16481E496DdD3336Dd12f7F9a58bAd3" as `0x${string}`;

// --- tRIF (RIF on Rootstock Testnet) ---
const TRIF_ADDRESS = "0x19f64674D8a5b4e652319F5e239EFd3bc969a1FE" as `0x${string}`;

// --- Minimal ERC-20 ABI for approve/allowance ---
const ERC20_ABI = [
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

// --- Minimal PrizeEscrow ABI (only what we use) ---
const PRIZE_ESCROW_ABI = [
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

const config = createConfig({
  chains: [ROOTSTOCK_TESTNET],
  connectors: [injected()],
  transports: { [ROOTSTOCK_TESTNET.id]: http(ROOTSTOCK_TESTNET.rpcUrls.default.http[0]) },
});

const queryClient = new QueryClient();

// ---------- UI Helpers ----------
function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-3">{title}</h2>
      {children}
    </div>
  );
}

function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "success" | "danger"; size?: "sm" | "md" | "lg" }) {
  const base = "font-semibold rounded-lg transition-all duration-200 flex items-center justify-center";
  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300",
    success: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white",
    danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white",
  };
  const sizes: Record<string, string> = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Input({ label, error, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
      <input
        className={`border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
          error ? "border-red-500" : ""
        } ${className}`}
        {...props}
      />
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}

function StatusBadge({ status, children }: { status: "success" | "warning" | "error" | "info"; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>
      {children}
    </span>
  );
}

// Helpers
const isZero = (addr?: string) => !addr || addr.toLowerCase() === zeroAddress.toLowerCase();
const isTrif = (addr?: string) => !!addr && addr.toLowerCase() === TRIF_ADDRESS.toLowerCase();
const tokenLabel = (addr?: string) => (isZero(addr) ? "tRBTC" : isTrif(addr) ? "tRIF" : "tokens");

// ---------- Wallet ----------
function ConnectWallet() {
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, chainId } = useAccount();

  if (address) {
    return (
      <div className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-700">Connected Wallet</span>
          <span className="font-mono text-xs text-gray-500">{`${address.slice(0, 6)}...${address.slice(-4)}`}</span>
          <span className="text-xs text-gray-400">Chain: {chainId}</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <Button
        variant="primary"
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </Button>
    </div>
  );
}

// ---------- Panels ----------
function CreatorPanel() {
  const { address, chainId } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [useERC20, setUseERC20] = useState(false);
  const [token, setToken] = useState<string>(TRIF_ADDRESS);
  const [deposit, setDeposit] = useState("0.1");
  const [regDays, setRegDays] = useState(7);
  const [finDays, setFinDays] = useState(14);
  const [scopeStr, setScopeStr] = useState("SELF_HUMAN_13+");
  const [judges, setJudges] = useState("");
  const [threshold, setThreshold] = useState(0);
  // NEW: manual gas price override (Rootstock likes legacy gas); default 0.1 gwei
  const [gasPriceWei, setGasPriceWei] = useState<string>("100000000");

  const scopeBytes = useMemo(() => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(scopeStr);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    return "0x" + (hex.length > 64 ? hex.slice(0, 64) : hex.padEnd(64, "0"));
  }, [scopeStr]);

  // Read current allowance when ERC-20 is selected
  const { data: allowance } = useReadContract({
    address: useERC20 && isAddress(token) ? (token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address as `0x${string}`, PRIZE_ESCROW_ADDR] : undefined,
    // @ts-ignore wagmi will ignore undefined address/args
    query: { enabled: useERC20 && !!address && isAddress(token) },
  } as any);

  const needsApproval = useERC20 && allowance !== undefined && BigInt(allowance as any) < parseEther(deposit || "0");

  const onApprove = async () => {
    try {
      if (!address) return alert("Connect wallet first");
      if (!isAddress(token)) return alert("Invalid token address");
      await writeContract({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PRIZE_ESCROW_ADDR, parseEther(deposit || "0")],
        // Rootstock: set a small gasPrice if your wallet doesn't
        gasPrice: BigInt(gasPriceWei || "0"),
      });
    } catch (err: any) {
      console.error("approve error:", err);
      alert(`Approve failed: ${err?.shortMessage || err?.message || "Unknown error"}`);
    }
  };

  async function onCreate() {
    try {
      if (!address) return alert("Connect wallet first");
      if (chainId !== 31) return alert("Switch to Rootstock Testnet (chainId 31)");
      if (!deposit || Number(deposit) <= 0) return alert("Enter a positive deposit amount");
      if (useERC20 && !isAddress(token)) return alert("Invalid ERC-20 token address");
      if (useERC20 && needsApproval) return alert("Please approve the token first");

      const judgeArr = judges
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && isAddress(s)) as `0x${string}`[];

      const p = {
        token: useERC20 ? (token as `0x${string}`) : zeroAddress,
        depositAmount: parseEther(deposit || "0"),
        registerDeadline: BigInt(Math.floor(Date.now() / 1000) + regDays * 86400),
        finalizeDeadline: BigInt(Math.floor(Date.now() / 1000) + finDays * 86400),
        judges: judgeArr,
        judgeThreshold: Number(threshold),
        scope: scopeBytes as `0x${string}`,
      } as const;

      // EXTRA: upfront sanity
      if (p.judgeThreshold > judgeArr.length) {
        return alert("Required approvals cannot exceed number of judges");
      }

      // Write (with legacy gas price hint)
      await writeContract({
        address: PRIZE_ESCROW_ADDR,
        abi: PRIZE_ESCROW_ABI,
        functionName: "createEvent",
        args: [p],
        value: useERC20 ? 0n : parseEther(deposit || "0"),
        gasPrice: BigInt(gasPriceWei || "0"),
      });
    } catch (err: any) {
      console.error("createEvent error:", err);
      alert(`Create Event failed: ${err?.shortMessage || err?.message || "Unknown error"}`);
    }
  }

  return (

    <Section title="🎯 Create New Event">
      <div className="space-y-6">
        {/* Token Configuration */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Token Configuration</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="useERC20"
                checked={useERC20}
                onChange={(e) => setUseERC20(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="useERC20" className="text-sm font-medium text-gray-700">
                Use ERC20 Token
              </label>
            </div>
            {useERC20 && (
              <Input
                label="Token Contract Address (e.g., tRIF)"
                placeholder="0x..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="lg:col-span-2"
              />
            )}
            <Input
              label={`Initial Prize Pool (${useERC20 ? "tokens (e.g., tRIF)" : "tRBTC"})`}
              type="number"
              step="0.0001"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
            />
          </div>

          {useERC20 && (
            <div className="mt-3 flex items-center gap-3">
              {needsApproval ? (
                <Button variant="secondary" size="sm" onClick={onApprove} disabled={isPending || isConfirming}>
                  Approve {isTrif(token) ? "tRIF" : "Token"}
                </Button>
              ) : (
                <StatusBadge status="success">Allowance OK</StatusBadge>
              )}
            </div>
          )}
        </div>

        {/* Event Timing */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Event Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Registration Period (days)"
              type="number"
              min="1"
              value={regDays}
              onChange={(e) => setRegDays(Number(e.target.value))}
            />
            <Input
              label="Total Event Duration (days)"
              type="number"
              min="1"
              value={finDays}
              onChange={(e) => setFinDays(Number(e.target.value))}
            />
          </div>
          <div className="mt-3 text-sm text-gray-600">
            <p>
              Registration closes: {new Date(Date.now() + regDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
            <p>Event ends: {new Date(Date.now() + finDays * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Judge Configuration */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Judge Configuration</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Input
              label="Judge Addresses (comma separated)"
              placeholder="0x123..., 0x456..."
              value={judges}
              onChange={(e) => setJudges(e.target.value)}
              className="lg:col-span-2"
            />
            <Input
              label="Required Approvals"
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Scope */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Event Scope</h3>
          <Input
            label="Scope Identifier"
            placeholder="SELF_HUMAN_13+"
            value={scopeStr}
            onChange={(e) => setScopeStr(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-2">Stored in the event; no gating is enforced.</p>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="primary"
            size="lg"
            onClick={onCreate}
            disabled={isPending || isConfirming || !address}
            className="w-full sm:w-auto"
          >
            {isPending ? "Creating..." : isConfirming ? "Confirming..." : "Create Event"}
          </Button>
          <div className="flex items-center gap-3">
            {hash && <span className="text-xs text-gray-500 font-mono">Tx: {String(hash).slice(0, 10)}...</span>}
            {isSuccess && <StatusBadge status="success">Event Created!</StatusBadge>}
          </div>
        </div>
      </div>
    </Section>
  );
}

function ReadEvent({ onEventLoaded }: { onEventLoaded?: (s: any) => void }) {
  const [eventId, setEventId] = useState("1");
  const { data, refetch, isLoading } = useReadContract({
    address: PRIZE_ESCROW_ADDR,
    abi: PRIZE_ESCROW_ABI,
    functionName: "getEvent",
    args: [BigInt(eventId || "0")],
  });

  const eventData = useMemo(() => {
    if (!data || !Array.isArray(data)) return null;
    const [
      organizer,
      token,
      prizeRemaining,
      registerDeadline,
      finalizeDeadline,
      scope,
      finalized,
      canceled,
      judgeCount,
      judgeThreshold,
    ] = data as any[];
    return {
      organizer,
      token,
      prizeRemaining,
      registerDeadline,
      finalizeDeadline,
      scope,
      finalized,
      canceled,
      judgeCount,
      judgeThreshold,
    };
  }, [data]);

  useEffect(() => {
    if (eventData && onEventLoaded) {
      onEventLoaded({
        id: eventId,
        organizer: eventData.organizer,
        scope: eventData.scope,
        finalized: eventData.finalized,
        canceled: eventData.canceled,
        registerDeadline: eventData.registerDeadline,
        prizeRemaining: eventData.prizeRemaining,
        token: eventData.token,
        finalizeDeadline: eventData.finalizeDeadline,
        judgeThreshold: eventData.judgeThreshold,
      });
    }
  }, [eventData, eventId, onEventLoaded]);

  return (
    <Section title="📊 Event Details">
      <div className="space-y-6">
        <div className="flex gap-4">
          <Input
            label="Event ID"
            placeholder="Enter event ID"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="flex-1"
          />
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        {eventData && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Event Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Organizer:</span>
                      <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded">
                        {String(eventData.organizer).slice(0, 10)}...
                        {String(eventData.organizer).slice(-8)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Token:</span>
                      <span className="ml-2">
                        {isZero(eventData.token) ? (
                          <StatusBadge status="info">Native tRBTC</StatusBadge>
                        ) : (
                          <StatusBadge status="info">{isTrif(eventData.token) ? "tRIF (ERC-20)" : "ERC-20"}</StatusBadge>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Prize Pool:</span>
                      <span className="ml-2 font-bold text-green-600">
                        {formatEther(eventData.prizeRemaining as bigint)} {tokenLabel(eventData.token)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Registration Ends:</span>
                      <span className="ml-2">
                        {new Date(Number(eventData.registerDeadline) * 1000).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Event Ends:</span>
                      <span className="ml-2">
                        {new Date(Number(eventData.finalizeDeadline) * 1000).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={eventData.finalized ? "success" : "warning"}>
                      {eventData.finalized ? "Finalized" : "Active"}
                    </StatusBadge>
                    {eventData.canceled && <StatusBadge status="error">Canceled</StatusBadge>}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Judges</h4>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="text-gray-600">Total Judges:</span>
                      <span className="ml-2 font-semibold">{String(eventData.judgeCount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Required Approvals:</span>
                      <span className="ml-2 font-semibold">{String(eventData.judgeThreshold)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Scope</h4>
                  <div className="bg-white p-2 rounded border font-mono text-xs break-all">
                    {String(eventData.scope)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!eventData && data !== undefined && (
          <div className="text-center py-8">
            <p className="text-gray-500">No event found with ID {eventId}</p>
          </div>
        )}
      </div>
    </Section>
  );
}

function TopUpPanel() {
  const { address } = useAccount();
  const [eventId, setEventId] = useState("1");
  const [amount, setAmount] = useState("0.1");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Read the event to learn which token it uses
  const { data: eventData } = useReadContract({
    address: PRIZE_ESCROW_ADDR,
    abi: PRIZE_ESCROW_ABI,
    functionName: "getEvent",
    args: [BigInt(eventId || "0")],
    // @ts-ignore
    query: { enabled: !!eventId },
  } as any);

  const token = (eventData && (eventData as any[])[1]) as string | undefined;
  const isNative = isZero(token);

  // If ERC20, check allowance
  const { data: allowance } = useReadContract({
    address: !isNative && token && isAddress(token) ? (token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address as `0x${string}`, PRIZE_ESCROW_ADDR] : undefined,
    // @ts-ignore
    query: { enabled: !isNative && !!address && !!token },
  } as any);

  const needsApproval = !isNative && allowance !== undefined && BigInt(allowance as any) < parseEther(amount || "0");

  const onApprove = () => {
    if (!address || !token) return;
    writeContract({
      address: token as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PRIZE_ESCROW_ADDR, parseEther(amount || "0")],
    });
  };

  const onTopUp = () => {
    if (!eventId) return;
    if (!isNative && needsApproval) return alert("Please approve the token first");

    writeContract({
      address: PRIZE_ESCROW_ADDR,
      abi: PRIZE_ESCROW_ABI,
      functionName: "topUp",
      args: [BigInt(eventId), parseEther(amount || "0")],
      value: isNative ? parseEther(amount || "0") : 0n,
    });
  };

  return (
    <Section title="💰 Add Funds to Event">
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> This event accepts {isNative ? "native tRBTC" : isTrif(token) ? "tRIF" : "ERC‑20"} payments.
            {!isNative && " Approve before topping up."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Event ID" type="number" value={eventId} onChange={(e) => setEventId(e.target.value)} />
          <Input
            label={`Amount to Add (${tokenLabel(token)})`}
            type="number"
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {!isNative && (
          <div className="flex items-center gap-3">
            {needsApproval ? (
              <Button variant="secondary" size="md" onClick={onApprove} disabled={isPending || isConfirming}>
                Approve {isTrif(token) ? "tRIF" : "Token"}
              </Button>
            ) : (
              <StatusBadge status="success">Allowance OK</StatusBadge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="success" size="lg" onClick={onTopUp} disabled={isPending || isConfirming}>
            {isPending ? "Sending..." : isConfirming ? "Confirming..." : "Add Funds"}
          </Button>

          <div className="flex items-center gap-3">
            {hash && <span className="text-xs text-gray-500 font-mono">Tx: {String(hash).slice(0, 10)}...</span>}
            {isSuccess && <StatusBadge status="success">Funds Added!</StatusBadge>}
          </div>
        </div>
      </div>
    </Section>
  );
}

function RegisterPanel({ eventState }: { eventState: any }) {
  const { address } = useAccount();
  const [eventId, setEventId] = useState("1");

  useEffect(() => {
    if (eventState?.id) setEventId(String(eventState.id));
  }, [eventState?.id]);

  const now = Math.floor(Date.now() / 1000);
  const regClosed = eventState?.registerDeadline ? Number(eventState.registerDeadline) < now : false;
  const finalized = Boolean(eventState?.finalized);
  const canceled = Boolean(eventState?.canceled);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const onRegister = () => {
    if (!address) return alert("Connect wallet first");
    if (!eventId) return;
    if (regClosed) return alert("Registration window is closed");
    if (finalized || canceled) return alert("Event is not open");
    writeContract({
      address: PRIZE_ESCROW_ADDR,
      abi: PRIZE_ESCROW_ABI,
      functionName: "register",
      args: [BigInt(eventId)],
    });
  };

  return (
    <Section title="✋ Register for Event">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Event ID" type="number" value={eventId} onChange={(e) => setEventId(e.target.value)} />
          <div className="flex items-center gap-2">
            {regClosed && <StatusBadge status="error">Registration closed</StatusBadge>}
            {finalized && <StatusBadge status="error">Event finalized</StatusBadge>}
            {canceled && <StatusBadge status="error">Event canceled</StatusBadge>}
            {!regClosed && !finalized && !canceled && <StatusBadge status="success">Open for registration</StatusBadge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-4 border-t">
          <Button
            variant="primary"
            onClick={onRegister}
            disabled={isPending || isConfirming || !address || regClosed || finalized || canceled}
          >
            {isPending ? "Registering..." : isConfirming ? "Confirming..." : "Register"}
          </Button>
        </div>

        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <StatusBadge status="success">Registered!</StatusBadge>
          </div>
        )}
      </div>
    </Section>
  );
}

function FinalizePanel({ eventState }: { eventState: any }) {
  const { address } = useAccount();
  const [eventId, setEventId] = useState("1");
  useEffect(() => {
    if (eventState?.id) setEventId(String(eventState.id));
  }, [eventState?.id]);

  const [rows, setRows] = useState<{ to: string; amount: string }[]>([{ to: "", amount: "" }]);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // pull live details from the parent (ReadEvent)
  const organizer = eventState?.organizer as string | undefined;
  const prizeRemainingBn = eventState?.prizeRemaining ? (BigInt(eventState.prizeRemaining) as bigint) : 0n;
  const finalizeDeadline = eventState?.finalizeDeadline ? Number(eventState.finalizeDeadline) : 0;
  const judgeThreshold = eventState?.judgeThreshold ? Number(eventState.judgeThreshold) : 0;
  const finalized = Boolean(eventState?.finalized);
  const canceled = Boolean(eventState?.canceled);
  const tokenAddr = eventState?.token as string | undefined;

  const now = Math.floor(Date.now() / 1000);
  // Allow finalize if either the deadline has passed OR no approvals are required
  const canFinalizeTimewise = judgeThreshold === 0 || (finalizeDeadline > 0 && now >= finalizeDeadline);

  const total = useMemo(() => {
    try {
      return rows.reduce((acc, r) => {
        if (!r.amount) return acc;
        return acc + BigInt(parseEther(String(r.amount)));
      }, 0n);
    } catch {
      return 0n;
    }
  }, [rows]);

  const winners = useMemo(() => {
    return rows
      .filter((r) => isAddress(r.to) && r.amount && r.amount !== "0")
      .map((r) => ({ to: r.to as `0x${string}`, amount: BigInt(parseEther(String(r.amount))) }));
  }, [rows]);

  const addRow = () => setRows((r) => [...r, { to: "", amount: "" }]);
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));

  const reasonsDisabled: string[] = [];
  if (!address) reasonsDisabled.push("Connect wallet");
  if (!canFinalizeTimewise) reasonsDisabled.push("Not past deadline and approvals required");
  if (finalized) reasonsDisabled.push("Event finalized");
  if (canceled) reasonsDisabled.push("Event canceled");
  if (winners.length === 0) reasonsDisabled.push("Add at least one valid winner");
  if (total === 0n) reasonsDisabled.push("Total must be > 0");
  if (prizeRemainingBn > 0n && total > prizeRemainingBn) reasonsDisabled.push("Total exceeds prize pool");

  // NOTE: we do NOT block by organizer in the UI; contract will enforce if only organizer can finalize.
  const disabled = isPending || isConfirming || reasonsDisabled.length > 0;

  const onFinalize = () => {
    writeContract({
      address: PRIZE_ESCROW_ADDR,
      abi: PRIZE_ESCROW_ABI,
      functionName: "finalize",
      args: [BigInt(eventId), winners],
    });
  };

  return (
    <Section title="🏆 Finalize Event & Distribute Prizes">
      <div className="space-y-6">
        {/* Quick context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Event ID"
            type="number"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="max-w-xs"
          />
          <div className="text-sm bg-gray-50 border rounded-lg p-3">
            <div>
              <span className="text-gray-600">Organizer</span>: <span className="font-mono">{organizer ? `${organizer.slice(0, 8)}…${organizer.slice(-6)}` : "—"}</span>
            </div>
            <div>
              <span className="text-gray-600">Prize Remaining</span>: <strong>{formatEther(prizeRemainingBn)} {tokenLabel(tokenAddr)}</strong>
            </div>
            <div>
              <span className="text-gray-600">Finalize Deadline</span>: {finalizeDeadline ? new Date(finalizeDeadline * 1000).toLocaleString() : "—"}
            </div>
            <div className="mt-1">
              {canFinalizeTimewise ? (
                <StatusBadge status="success">You can finalize now</StatusBadge>
              ) : (
                <StatusBadge status="warning">Waiting for deadline or approvals</StatusBadge>
              )}
            </div>
          </div>
        </div>

        {/* Winners editor */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Prize Distribution</h3>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  <div className="lg:col-span-6">
                    <Input
                      label={`Winner ${i + 1} Address`}
                      placeholder="0x..."
                      value={r.to}
                      onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, to: e.target.value } : x)))}
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <Input
                      label="Prize Amount"
                      type="number"
                      step="0.00001"
                      placeholder="0.0"
                      value={r.amount}
                      onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)))}
                    />
                  </div>
                  <div className="lg:col-span-3 flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeRow(i)}
                      disabled={rows.length === 1}
                      className="flex-1"
                    >
                      Remove
                    </Button>
                    {i === rows.length - 1 && (
                      <Button variant="secondary" size="sm" onClick={addRow} className="flex-1">
                        + Add Winner
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total Prize Distribution:</span>
            <span className="text-xl font-bold text-blue-600">{formatEther(total)} {tokenLabel(tokenAddr)}</span>
          </div>
          {prizeRemainingBn > 0n && total > prizeRemainingBn && (
            <div className="mt-2 text-sm text-red-600">Total exceeds remaining prize pool.</div>
          )}
        </div>

        {/* Action */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="primary" size="lg" onClick={onFinalize} disabled={disabled}>
            {isPending ? "Finalizing..." : isConfirming ? "Confirming..." : "Finalize & Distribute Prizes"}
          </Button>

          <div className="flex items-center gap-3">
            {hash && <span className="text-xs text-gray-500 font-mono">Tx: {String(hash).slice(0, 10)}...</span>}
            {isSuccess && <StatusBadge status="success">Prizes Distributed!</StatusBadge>}
          </div>
        </div>

        {/* Why disabled */}
        {reasonsDisabled.length > 0 && (
          <div className="text-xs text-gray-600">
            {reasonsDisabled.map((r, i) => (
              <div key={i} className="mt-1">• {r}</div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}

export default function App() {
  const [eventState, setEventState] = useState<any>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <header className="mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      PrizeEscrow Demo
                    </h1>
                    <p className="text-gray-600 mt-1">Decentralized Prize Distribution on Rootstock</p>
                  </div>
                  <ConnectWallet />
                </div>
              </div>
            </header>

            {/* Main Content */}
            <div className="space-y-8">
              <CreatorPanel />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <ReadEvent onEventLoaded={setEventState} />
                <TopUpPanel />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <RegisterPanel eventState={eventState} />
                <div />
              </div>

              <FinalizePanel eventState={eventState} />
            </div>

            {/* Footer */}
            <footer className="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-center text-sm text-gray-500">
                <p className="mb-2">
                  ⚠️ <strong>Testnet Demo</strong> — Rootstock uses legacy gas. If a tx stalls, set a manual gas price
                  (e.g., 0.1 gwei) in your wallet.
                </p>
                <p>For ERC20 events (e.g., tRIF), be sure to approve the escrow before top-up/finalize.</p>
              </div>
            </footer>
          </div>
        </div>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
