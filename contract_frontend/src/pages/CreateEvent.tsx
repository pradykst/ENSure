import React, { useState, useMemo } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, isAddress, zeroAddress } from "viem";
import { PRIZE_ESCROW_ADDR,  TRIF_ADDRESS, WRBTC_ADDRESS } from "../lib/constants";
import { PRIZE_ESCROW_ABI, WETH9_ABI, ERC20_ABI } from "../lib/abis";
import { Button } from "../components/ui/Button";
import { db } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function CreateEvent() {
  const navigate = useNavigate();
  const { address, chainId } = useAccount();
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  // --- Original States ---
  const [eventName, setEventName] = useState("");
  const [useERC20, setUseERC20] = useState(false);
  const [token, setToken] = useState<string>(TRIF_ADDRESS);
  const [wrapFirst, setWrapFirst] = useState(false);
  const [deposit, setDeposit] = useState("0.1");
  const [regDays, setRegDays] = useState(7);
  const [finDays, setFinDays] = useState(14);
  const [scopeStr, setScopeStr] = useState("SELF_HUMAN_13+");
  const [judges, setJudges] = useState("");
  const [threshold, setThreshold] = useState(0);
  const [gasPriceWei, setGasPriceWei] = useState<string>("100000000"); // Default 0.1 gwei (Essential for Rootstock)

  // Computed Scope
  const scopeBytes = useMemo(() => {
    const hex = Array.from(new TextEncoder().encode(scopeStr)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return ("0x" + (hex.length > 64 ? hex.slice(0, 64) : hex.padEnd(64, "0"))) as `0x${string}`;
  }, [scopeStr]);

  // Check Allowance
  const { data: allowance } = useReadContract({
    address: useERC20 && isAddress(token) ? (token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address as `0x${string}`, PRIZE_ESCROW_ADDR] : undefined,
    query: { enabled: useERC20 && !!address && isAddress(token) },
  });

  const needsApproval = useERC20 && allowance !== undefined && BigInt(allowance as any) < parseEther(deposit || "0");

  // --- Original Logic Functions ---

  const onApprove = async () => {
    try {
      if (!address) return alert("Connect wallet first");
      if (!isAddress(token)) return alert("Invalid token address");
      await writeContractAsync({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [PRIZE_ESCROW_ADDR, parseEther(deposit || "0")],
        gasPrice: BigInt(gasPriceWei || "0"),
      });
      alert("Approve tx sent. Wait for confirmation before creating event.");
    } catch (err: any) {
      console.error("approve error:", err);
      alert(`Approve failed: ${err?.shortMessage || err?.message}`);
    }
  };

  const persistToFirestore = async (txHash: string, p: any) => {
    const provisionalId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, "events", provisionalId), {
      provisional: true,
      name: eventName.trim(),
      creator: address,
      token: p.token,
      depositAmount: p.depositAmount.toString(), // Convert BigInt to string for Firebase
      registerDeadline: Number(p.registerDeadline),
      finalizeDeadline: Number(p.finalizeDeadline),
      startDate: new Date().toISOString(),
      endDate: new Date(Number(p.finalizeDeadline) * 1000).toISOString(),
      createdAt: serverTimestamp(),
      txHash,
      scope: scopeStr
    });
  };

  const handleCreate = async () => {
    try {
      if (!address) return alert("Connect wallet first");
      if (!eventName.trim()) return alert("Please enter an event name");
      if (!deposit || Number(deposit) <= 0) return alert("Enter a positive deposit amount");

      const judgeArr = judges.split(",").map((s) => s.trim()).filter((s) => s && isAddress(s)) as `0x${string}`[];
      
      const p = {
        token: useERC20 ? (token as `0x${string}`) : zeroAddress,
        depositAmount: parseEther(deposit || "0"),
        registerDeadline: BigInt(Math.floor(Date.now() / 1000) + regDays * 86400),
        finalizeDeadline: BigInt(Math.floor(Date.now() / 1000) + finDays * 86400),
        judges: judgeArr,
        judgeThreshold: Number(threshold),
        scope: scopeBytes,
      } as const;

      // 1. Native tRBTC Path
      if (!useERC20) {
        const txHash = await writeContractAsync({
          address: PRIZE_ESCROW_ADDR,
          abi: PRIZE_ESCROW_ABI,
          functionName: "createEvent",
          args: [p],
          value: parseEther(deposit || "0"),
          gasPrice: BigInt(gasPriceWei || "0"), // Critical for Rootstock
        });
        await persistToFirestore(txHash, p);
        navigate("/");
        return;
      }

      // 2. ERC-20 Path
      if (!isAddress(token)) return alert("Invalid ERC-20 token address");

      // Wrap Path (WETH/WRBTC)
      if (wrapFirst) {
        const amountWei = parseEther(deposit || "0");
        // Deposit
        await writeContractAsync({
          address: (token || WRBTC_ADDRESS) as `0x${string}`,
          abi: WETH9_ABI,
          functionName: "deposit",
          args: [],
          value: amountWei,
          gasPrice: BigInt(gasPriceWei || "0"),
        });
        // Approve
        await writeContractAsync({
          address: token as `0x${string}`,
          abi: WETH9_ABI,
          functionName: "approve",
          args: [PRIZE_ESCROW_ADDR, amountWei],
          gasPrice: BigInt(gasPriceWei || "0"),
        });
        // Create
        const txHash = await writeContractAsync({
          address: PRIZE_ESCROW_ADDR,
          abi: PRIZE_ESCROW_ABI,
          functionName: "createEvent",
          args: [p],
          value: 0n,
          gasPrice: BigInt(gasPriceWei || "0"),
        });
        await persistToFirestore(txHash, p);
        navigate("/");
        return;
      }

      // Standard ERC-20 Path
      if (needsApproval) return alert("Please approve the token first using the button below.");

      const txHash = await writeContractAsync({
        address: PRIZE_ESCROW_ADDR,
        abi: PRIZE_ESCROW_ABI,
        functionName: "createEvent",
        args: [p],
        value: 0n,
        gasPrice: BigInt(gasPriceWei || "0"),
      });
      await persistToFirestore(txHash, p);
      navigate("/");

    } catch (err: any) {
      console.error("createEvent error:", err);
      alert(`Failed to create event: ${err?.shortMessage || err?.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-10 pb-20">
      <div className="container mx-auto px-6 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Create New Event</h1>
        <p className="text-slate-400 mb-8">Deploy a new prize pool contract to the blockchain.</p>

        <div className="space-y-8">
          {/* Section 1: Basic Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
             <h3 className="text-xl font-semibold mb-4 text-indigo-400">Event Details</h3>
             <div className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Event Name</label>
                   <input 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Winter Hackathon 2026"
                      value={eventName}
                      onChange={e => setEventName(e.target.value)}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Scope Identifier</label>
                   <input 
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm"
                      value={scopeStr}
                      onChange={e => setScopeStr(e.target.value)}
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Registration Days</label>
                      <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3" value={regDays} onChange={e => setRegDays(Number(e.target.value))} />
                   </div>
                   <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Total Duration Days</label>
                      <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3" value={finDays} onChange={e => setFinDays(Number(e.target.value))} />
                   </div>
                </div>
             </div>
          </div>

          {/* Section 2: Financials & Gas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
             <h3 className="text-xl font-semibold mb-4 text-emerald-400">Prize Pool & Gas</h3>
             
             {/* Token Selection */}
             <div className="flex flex-col gap-4 mb-6 p-4 bg-slate-950 rounded-lg">
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={useERC20} onChange={e => setUseERC20(e.target.checked)} className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600" />
                  <span className="text-sm text-slate-300">Use ERC-20 Token</span>
                </div>
                
                {useERC20 && (
                  <>
                    <div className="pl-9 space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Token Address</label>
                        <input className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 font-mono text-xs" value={token} onChange={e => setToken(e.target.value.trim())} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={wrapFirst} onChange={e => setWrapFirst(e.target.checked)} className="w-4 h-4 rounded border-slate-600" />
                        <span className="text-xs text-slate-400">Wrap first (WETH/WRBTC flow)</span>
                      </div>
                    </div>
                    {/* Approve Button Logic */}
                    {!wrapFirst && needsApproval && (
                      <div className="pl-9 mt-2">
                         <Button variant="secondary" size="sm" onClick={onApprove} disabled={isConfirming}>
                            Approve Token Access
                         </Button>
                         <p className="text-xs text-amber-500 mt-1">Approval required before creation.</p>
                      </div>
                    )}
                  </>
                )}
             </div>

             {/* Amounts */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Initial Deposit</label>
                   <div className="relative">
                      <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-16 py-3" value={deposit} onChange={e => setDeposit(e.target.value)} />
                      <div className="absolute right-4 top-3 text-slate-500 font-bold">{useERC20 ? 'TOKEN' : 'tRBTC'}</div>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Gas Price (Wei)</label>
                   <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3" value={gasPriceWei} onChange={e => setGasPriceWei(e.target.value)} />
                   <p className="text-xs text-slate-500 mt-1">Legacy gas: Try 100000000 (0.1 gwei) if failing.</p>
                </div>
             </div>
          </div>

          {/* Section 3: Judges */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
             <h3 className="text-xl font-semibold mb-4 text-purple-400">Judges (Optional)</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                   <label className="block text-sm font-medium text-slate-300 mb-2">Judge Addresses</label>
                   <input placeholder="0x..., 0x..." className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 font-mono text-sm" value={judges} onChange={e => setJudges(e.target.value)} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-2">Approvals Needed</label>
                   <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3" value={threshold} onChange={e => setThreshold(Number(e.target.value))} />
                </div>
             </div>
          </div>

          <Button 
            variant="primary" 
            size="lg" 
            className="w-full py-4 text-lg" 
            onClick={handleCreate} 
            disabled={isConfirming || (!wrapFirst && useERC20 && needsApproval)}
          >
             {isConfirming ? "Confirming Transaction..." : "Deploy Event Contract"}
          </Button>

          {hash && (
            <div className="text-center">
               <a href={`https://rootstock-testnet.blockscout.com/tx/${hash}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm underline">
                  View Transaction on Explorer
               </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}