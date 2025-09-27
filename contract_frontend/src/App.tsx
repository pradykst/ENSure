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
 * Rootstock PrizeEscrow Demo UI
 * This version keeps the full flow and wires Register/Finalize to the actual
 * attestor + scope taken from the PrizeEscrow contract.
 *
 * Replace PRIZE_ESCROW_ADDR and RPC as needed.
 */

// === CONFIG ===
const ROOTSTOCK_TESTNET = {
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: { name: "tRBTC", symbol: "tRBTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.rootstock.io/LVpybdYTh1PZ5lBeFfvCjN8vWyqgOH-T"] },
  },
};

// --- Deployed contract addresses ---
const PRIZE_ESCROW_ADDR = "0x308CeCCA10968F16eAE87ce2a2770071a4a9BA5B"; // your deployed PrizeEscrow on RSK testnet

// --- ABIs (subset needed by the UI) ---
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
  {
    type: "function",
    name: "attestations",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
];

const ATTEST_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "setVerified",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "scope", type: "bytes32" },
      { name: "ok", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isVerified",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "scope", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

const config = createConfig({
  chains: [ROOTSTOCK_TESTNET],
  connectors: [injected()],
  transports: { [ROOTSTOCK_TESTNET.id]: http(ROOTSTOCK_TESTNET.rpcUrls.default.http[0]) },
});

const queryClient = new QueryClient();

// ---------- UI Helpers ----------
function Section({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8 ${className}`}>
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-3">{title}</h2>
      {children}
    </div>
  );
}

function Button({ variant = "primary", size = "md", children, className = "", ...props }) {
  const base = "font-semibold rounded-lg transition-all duration-200 flex items-center justify-center";
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300",
    success: "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white",
    danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white",
  };
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Input({ label, error, className = "", ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
      <input
        className={`border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${error ? "border-red-500" : ""} ${className}`}
        {...props}
      />
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}

function StatusBadge({ status, children }) {
  const colors = {
    success: "bg-green-100 text-green-800 border-green-200",
    warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
    error: "bg-red-100 text-red-800 border-red-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors[status]}`}>{children}</span>;
}

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
        <Button variant="secondary" size="sm" onClick={() => disconnect()}>Disconnect</Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <Button variant="primary" onClick={() => connect({ connector: connectors[0] })} disabled={isPending} className="w-full">
        {isPending ? "Connecting..." : "Connect Wallet"}
      </Button>
    </div>
  );
}

// ---------- Panels ----------
function CreatorPanel() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [useERC20, setUseERC20] = useState(false);
  const [token, setToken] = useState(zeroAddress);
  const [deposit, setDeposit] = useState("0.1");
  const [regDays, setRegDays] = useState(7);
  const [finDays, setFinDays] = useState(14);
  const [scopeStr, setScopeStr] = useState("SELF_HUMAN_13+");
  const [judges, setJudges] = useState("");
  const [threshold, setThreshold] = useState(0);

  const scopeBytes = useMemo(() => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(scopeStr);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    return "0x" + (hex.length > 64 ? hex.slice(0, 64) : hex.padEnd(64, "0"));
  }, [scopeStr]);

  function onCreate() {
    if (!address) return alert("Connect wallet first");

    const judgeArr = judges
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && isAddress(s));

    const p = {
      token: useERC20 ? token : zeroAddress,
      depositAmount: BigInt(parseEther(deposit)),
      registerDeadline: BigInt(Math.floor(Date.now() / 1000) + regDays * 86400),
      finalizeDeadline: BigInt(Math.floor(Date.now() / 1000) + finDays * 86400),
      judges: judgeArr,
      judgeThreshold: Number(threshold),
      scope: scopeBytes,
    };

    writeContract({ address: PRIZE_ESCROW_ADDR, abi: PRIZE_ESCROW_ABI, functionName: "createEvent", args: [p], value: useERC20 ? 0n : BigInt(parseEther(deposit)) });
  }

  return (
    <Section title="🎯 Create New Event">
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Token Configuration</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="useERC20" checked={useERC20} onChange={(e) => setUseERC20(e.target.checked)} className="rounded border-gray-300" />
              <label htmlFor="useERC20" className="text-sm font-medium text-gray-700">Use ERC20 Token</label>
            </div>
            {useERC20 && (
              <Input label="Token Contract Address" placeholder="0x..." value={token} onChange={(e) => setToken(e.target.value)} className="lg:col-span-2" />
            )}
            <Input label={`Initial Prize Pool (${useERC20 ? "tokens" : "tRBTC"})`} type="number" step="0.0001" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Event Timeline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Registration Period (days)" type="number" min="1" value={regDays} onChange={(e) => setRegDays(Number(e.target.value))} />
            <Input label="Total Event Duration (days)" type="number" min="1" value={finDays} onChange={(e) => setFinDays(Number(e.target.value))} />
          </div>
          <div className="mt-3 text-sm text-gray-600">
            <p>Registration closes: {new Date(Date.now() + regDays * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            <p>Event ends: {new Date(Date.now() + finDays * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Judge Configuration</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Input label="Judge Addresses (comma separated)" placeholder="0x123..., 0x456..." value={judges} onChange={(e) => setJudges(e.target.value)} className="lg:col-span-2" />
            <Input label="Required Approvals" type="number" min="0" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Event Scope</h3>
          <Input label="Scope Identifier" placeholder="SELF_HUMAN_13+" value={scopeStr} onChange={(e) => setScopeStr(e.target.value)} />
          <p className="text-xs text-gray-500 mt-2">This defines verification requirements for participants.</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="primary" size="lg" onClick={onCreate} disabled={isPending || isConfirming || !address} className="w-full sm:w-auto">
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

function ReadEvent({ onEventLoaded }) {
  const [eventId, setEventId] = useState("1");
  const { data, refetch, isLoading } = useReadContract({ address: PRIZE_ESCROW_ADDR, abi: PRIZE_ESCROW_ABI, functionName: "getEvent", args: [BigInt(eventId || "0")] });
  const { data: attestAddr } = useReadContract({ address: PRIZE_ESCROW_ADDR, abi: PRIZE_ESCROW_ABI, functionName: "attestations", args: [] });

  const eventData = useMemo(() => {
    if (!data || !Array.isArray(data)) return null;
    const [organizer, token, prizeRemaining, registerDeadline, finalizeDeadline, scope, finalized, canceled, judgeCount, judgeThreshold] = data;
    return { organizer, token, prizeRemaining, registerDeadline, finalizeDeadline, scope, finalized, canceled, judgeCount, judgeThreshold };
  }, [data]);

  useEffect(() => {
    if (eventData && attestAddr && onEventLoaded) {
      onEventLoaded({
        id: eventId,
        organizer: eventData.organizer,
        scope: eventData.scope,
        attest: attestAddr,
        finalized: eventData.finalized,
        canceled: eventData.canceled,
        registerDeadline: eventData.registerDeadline,
        prizeRemaining: eventData.prizeRemaining,
        token: eventData.token,
      });
    }
  }, [eventData, attestAddr, eventId, onEventLoaded]);

  return (
    <Section title="📊 Event Details">
      <div className="space-y-6">
        <div className="flex gap-4">
          <Input label="Event ID" placeholder="Enter event ID" value={eventId} onChange={(e) => setEventId(e.target.value)} className="flex-1" />
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>{isLoading ? "Loading..." : "Refresh"}</Button>
          </div>
        </div>

        {eventData && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Event Information</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Organizer:</span>
                      <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded">{String(eventData.organizer).slice(0, 10)}...{String(eventData.organizer).slice(-8)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Token:</span>
                      <span className="ml-2">{eventData.token === zeroAddress ? <StatusBadge status="info">Native tRBTC</StatusBadge> : <span className="font-mono text-xs">{String(eventData.token).slice(0, 10)}...</span>}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Prize Pool:</span>
                      <span className="ml-2 font-bold text-green-600">{formatEther(eventData.prizeRemaining)} {eventData.token === zeroAddress ? "tRBTC" : "tokens"}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Registration Ends:</span>
                      <span className="ml-2">{new Date(Number(eventData.registerDeadline) * 1000).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Event Ends:</span>
                      <span className="ml-2">{new Date(Number(eventData.finalizeDeadline) * 1000).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">Status</h4>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={eventData.finalized ? "success" : "warning"}>{eventData.finalized ? "Finalized" : "Active"}</StatusBadge>
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
                  <div className="bg-white p-2 rounded border font-mono text-xs break-all">{String(eventData.scope)}</div>
                </div>
                <div className="text-xs text-gray-700">Attestor: <span className="font-mono">{String(attestAddr)}</span></div>
              </div>
            </div>
          </div>
        )}

        {!eventData && data !== undefined && (
          <div className="text-center py-8"><p className="text-gray-500">No event found with ID {eventId}</p></div>
        )}
      </div>
    </Section>
  );
}

function TopUpPanel() {
  const [eventId, setEventId] = useState("1");
  const [amount, setAmount] = useState("0.1");
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const onTopUp = () => {
    writeContract({ address: PRIZE_ESCROW_ADDR, abi: PRIZE_ESCROW_ABI, functionName: "topUp", args: [BigInt(eventId), BigInt(parseEther(amount))], value: BigInt(parseEther(amount)) });
  };

  return (
    <Section title="💰 Add Funds to Event">
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800"><strong>Note:</strong> Demo assumes native tRBTC. For ERC20, approve escrow first.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Event ID" type="number" value={eventId} onChange={(e) => setEventId(e.target.value)} />
          <Input label="Amount to Add (tRBTC)" type="number" step="0.0001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="success" size="lg" onClick={onTopUp} disabled={isPending || isConfirming}>{isPending ? "Sending..." : isConfirming ? "Confirming..." : "Add Funds"}</Button>
          <div className="flex items-center gap-3">{hash && <span className="text-xs text-gray-500 font-mono">Tx: {String(hash).slice(0, 10)}...</span>}{isSuccess && <StatusBadge status="success">Funds Added!</StatusBadge>}</div>
        </div>
      </div>
    </Section>
  );
}

function RegisterPanel({ eventState }) {
  const { address } = useAccount();
  const [eventId, setEventId] = useState("1");
  useEffect(() => { if (eventState?.id) setEventId(String(eventState.id)); }, [eventState?.id]);

  const attestAddr = eventState?.attest;
  const scopeBytes = eventState?.scope;

  const { data: isV } = useReadContract({ address: attestAddr, abi: ATTEST_ABI, functionName: "isVerified", args: address && scopeBytes ? [address, scopeBytes] : undefined, query: { enabled: Boolean(address && scopeBytes && attestAddr) } });
  const { data: attOwner } = useReadContract({ address: attestAddr, abi: ATTEST_ABI, functionName: "owner" });
  const verified = Boolean(isV);
  const canMock = address && attOwner && String(address).toLowerCase() === String(attOwner).toLowerCase();

  const now = Math.floor(Date.now() / 1000);
  const regClosed = eventState?.registerDeadline ? Number(eventState.registerDeadline) < now : false;
  const finalized = Boolean(eventState?.finalized);
  const canceled = Boolean(eventState?.canceled);

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { writeContract: writeAtt, data: h2, isPending: p2 } = useWriteContract();
  const { isLoading: c2, isSuccess: s2 } = useWaitForTransactionReceipt({ hash: h2 });

  const onMockVerify = () => {
    if (!address || !attestAddr || !scopeBytes) return alert("Load event first in Event Details");
    if (!canMock) return alert("Mock Verify requires attestor owner wallet");
    writeAtt({ address: attestAddr, abi: ATTEST_ABI, functionName: "setVerified", args: [address, scopeBytes, true] });
  };

  const onRegister = () => {
    if (!eventId) return;
    if (!verified) return alert("Not verified for this scope");
    if (regClosed) return alert("Registration closed");
    if (finalized || canceled) return alert("Event is not open");
    writeContract({ address: PRIZE_ESCROW_ADDR, abi: PRIZE_ESCROW_ABI, functionName: "register", args: [BigInt(eventId)] });
  };

  return (
    <Section title="✋ Register for Event">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Input label="Event ID" type="number" value={eventId} onChange={(e) => setEventId(e.target.value)} />
          <div className="flex items-center gap-2">
            {scopeBytes ? (
              verified ? <StatusBadge status="success">You are verified for this scope</StatusBadge> : <StatusBadge status="error">Not verified for this scope</StatusBadge>
            ) : (
              <StatusBadge status="warning">Load event to check verification</StatusBadge>
            )}
          </div>
          <div className="text-xs text-gray-500">Attestor: <span className="font-mono">{String(attestAddr)}</span></div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {regClosed && <StatusBadge status="error">Registration window closed</StatusBadge>}
          {finalized && <StatusBadge status="error">Event finalized</StatusBadge>}
          {canceled && <StatusBadge status="error">Event canceled</StatusBadge>}
        </div>
        <div className="flex flex-wrap gap-4 pt-4 border-t">
          <Button variant="secondary" onClick={onMockVerify} disabled={p2 || c2 || !canMock}>{p2 ? "Verifying..." : c2 ? "Confirming..." : canMock ? "Mock Verify (owner only)" : "Switch to attestor owner"}</Button>
          <Button variant="primary" onClick={onRegister} disabled={isPending || isConfirming || !address || !verified || regClosed || finalized || canceled}>{isPending ? "Registering..." : isConfirming ? "Confirming..." : "Register"}</Button>
        </div>
        {(s2 || isSuccess) && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <StatusBadge status="success">{s2 && isSuccess ? "Verified & Registered!" : s2 ? "Verified!" : "Registered!"}</StatusBadge>
          </div>
        )}
      </div>
    </Section>
  );
}

function FinalizePanel({ eventState }) {
  const [eventId, setEventId] = useState("1");
  useEffect(() => { if (eventState?.id) setEventId(String(eventState.id)); }, [eventState?.id]);

  const [rows, setRows] = useState([{ to: "", amount: "" }]);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const total = useMemo(() => rows.reduce((acc, r) => { try { return acc + BigInt(parseEther(r.amount || "0")); } catch { return acc; } }, 0n), [rows]);

  const addRow = () => setRows((r) => [...r, { to: "", amount: "" }]);
  const removeRow = (i) => setRows((r) => r.filter((_, idx) => idx !== i));

  const onFinalize = () => {
    const winners = rows
      .filter((r) => isAddress(r.to) && r.amount && r.amount !== "0")
      .map((r) => ({ to: r.to, amount: BigInt(parseEther(r.amount)) }));
    if (!winners.length) return alert("Add at least one winner");
    writeContract({ address: PRIZE_ESCROW_ADDR, abi: PRIZE_ESCROW_ABI, functionName: "finalize", args: [BigInt(eventId), winners] });
  };

  return (
    <Section title="🏆 Finalize Event & Distribute Prizes">
      <div className="space-y-6">
        <Input label="Event ID" type="number" value={eventId} onChange={(e) => setEventId(e.target.value)} className="max-w-xs" />

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Prize Distribution</h3>
          <div className="space-y-3">
            {rows.map((r, i) => (
              <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                  <div className="lg:col-span-6">
                    <Input label={`Winner ${i + 1} Address`} placeholder="0x..." value={r.to} onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, to: e.target.value } : x)))} />
                  </div>
                  <div className="lg:col-span-3">
                    <Input label="Prize Amount" type="number" step="0.0001" placeholder="0.0" value={r.amount} onChange={(e) => setRows((prev) => prev.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)))} />
                  </div>
                  <div className="lg:col-span-3 flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => removeRow(i)} disabled={rows.length === 1} className="flex-1">Remove</Button>
                    {i === rows.length - 1 && (
                      <Button variant="secondary" size="sm" onClick={addRow} className="flex-1">+ Add Winner</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">Total Prize Distribution:</span>
            <span className="text-xl font-bold text-blue-600">{formatEther(total)} tokens</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="primary" size="lg" onClick={onFinalize} disabled={isPending || isConfirming || rows.every((r) => !r.to || !r.amount)}>
            {isPending ? "Finalizing..." : isConfirming ? "Confirming..." : "Finalize & Distribute Prizes"}
          </Button>
          <div className="flex items-center gap-3">{hash && <span className="text-xs text-gray-500 font-mono">Tx: {String(hash).slice(0, 10)}...</span>}{isSuccess && <StatusBadge status="success">Prizes Distributed!</StatusBadge>}</div>
        </div>
      </div>
    </Section>
  );
}

export default function App() {
  const [eventState, setEventState] = useState(null);
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <header className="mb-8">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">PrizeEscrow Demo</h1>
                    <p className="text-gray-600 mt-1">Decentralized Prize Distribution on Rootstock</p>
                  </div>
                  <ConnectWallet />
                </div>
              </div>
            </header>

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

            <footer className="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="text-center text-sm text-gray-500">
                <p className="mb-2">⚠️ <strong>Development Version</strong> - For testing purposes only</p>
                <p>For ERC20 token events, ensure you approve the escrow contract before topping up or finalizing payments.</p>
              </div>
            </footer>
          </div>
        </div>
      </WagmiProvider>
    </QueryClientProvider>
  );
}