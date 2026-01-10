import { useState, useEffect, type KeyboardEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { formatEther, parseEther, isAddress, decodeEventLog } from "viem";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { PRIZE_ESCROW_ADDR, getTokenLabel, isZero } from "../lib/constants";
import { PRIZE_ESCROW_ABI } from "../lib/abis";
import { Button } from "../components/ui/Button";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  // --- UI States ---
  const [resolvedId, setResolvedId] = useState<bigint | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const [showDistribute, setShowDistribute] = useState(false);
  const [smartInput, setSmartInput] = useState("");
  const [winners, setWinners] = useState<{ to: string; amount: string }[]>([]);
  const [fundAmount, setFundAmount] = useState("");

  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

  // --- SMART ID RESOLVER ---
  useEffect(() => {
    const resolveId = async () => {
      setIsResolving(true);
      if (!id) return;

      // 1. If ID is already a simple number, use it.
      if (!isNaN(Number(id))) {
        setResolvedId(BigInt(id));
        setIsResolving(false);
        return;
      }

      // 2. If ID is a string (Firebase ID), lookup the TxHash to find the real ID.
      try {
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          // If we already saved the onChainId, use it
          if (data.onChainId) {
             setResolvedId(BigInt(data.onChainId));
             setIsResolving(false);
             return;
          }
          
          // Fallback: Recover ID from the stored Transaction Hash
          if (data.txHash && publicClient) {
             const receipt = await publicClient.getTransactionReceipt({ hash: data.txHash });
             // Parse logs to find "EventCreated(id)"
             for (const log of receipt.logs) {
                try {
                   const decoded = decodeEventLog({
                      abi: PRIZE_ESCROW_ABI,
                      data: log.data,
                      topics: log.topics
                   });
                   if (decoded.eventName === "createEvent" || decoded.eventName === "EventCreated") {
                      // @ts-ignore
                      setResolvedId(decoded.args.id || decoded.args[0]); 
                      setIsResolving(false);
                      return;
                   }
                } catch (e) { /* ignore unrelated logs */ }
             }
          }
        }
      } catch (e) {
        console.error("Failed to resolve ID:", e);
      }
      
      setIsResolving(false);
    };

    resolveId();
  }, [id, publicClient]);

  // --- Contract Read ---
  const { data, isLoading: isContractLoading, refetch } = useReadContract({
    address: PRIZE_ESCROW_ADDR,
    abi: PRIZE_ESCROW_ABI,
    functionName: "getEvent",
    args: [resolvedId || 0n],
    query: { enabled: !!resolvedId }
  });

  const isLoading = isResolving || (!!resolvedId && isContractLoading);

  // --- Render Loading / Error ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-slate-400">
            {isResolving ? "Resolving Event ID..." : "Loading On-Chain Data..."}
        </p>
      </div>
    );
  }

  // If we resolved but got no data (or ID 0 which is invalid)
  if (!data || resolvedId === 0n || !resolvedId) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
            <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
            <p className="text-slate-400 mb-4">
                We couldn't find event information for <span className="font-mono text-xs bg-slate-800 px-1 rounded">{id}</span>.
                <br/>It may not have confirmed on the blockchain yet.
            </p>
            <Button onClick={() => navigate("/")} variant="secondary">Back to Dashboard</Button>
        </div>
      );
  }

  const [
    organizer,
    token,
    prizeRemaining,
    registerDeadline,
    finalizeDeadline,
    scope,
    finalized,
    canceled,
  ] = data as any[];

  // --- Smart Input Logic ---
  const handleSmartInput = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      const raw = smartInput.trim();
      if (!raw) return;

      if (!isAddress(raw)) {
        alert("Invalid Ethereum address format.");
        return;
      }
      setWinners((prev) => [...prev, { to: raw, amount: "" }]);
      setSmartInput("");
    }
  };

  const removeWinner = (index: number) => {
    setWinners((prev) => prev.filter((_, i) => i !== index));
  };

  const updateWinnerAmount = (index: number, val: string) => {
    const newWinners = [...winners];
    newWinners[index].amount = val;
    setWinners(newWinners);
  };

  // --- Actions ---
  const handleRegister = async () => {
    if(!address) return alert("Connect Wallet");
    if (!resolvedId) return;
    try {
      await writeContractAsync({
        address: PRIZE_ESCROW_ADDR,
        abi: PRIZE_ESCROW_ABI,
        functionName: "register",
        args: [resolvedId],
      });
      alert("Registration Submitted!");
    } catch (e: any) {
      console.error(e);
      alert(e.shortMessage || e.message);
    }
  };

  const handleFund = async () => {
    if(!address) return alert("Connect Wallet");
    if (!resolvedId) return;
    try {
        const val = parseEther(fundAmount || "0");
        await writeContractAsync({
            address: PRIZE_ESCROW_ADDR,
            abi: PRIZE_ESCROW_ABI,
            functionName: "topUp",
            args: [resolvedId, val],
            value: isZero(token) ? val : 0n
        });
        alert("Funds Added!");
        setFundAmount("");
        refetch();
    } catch (e: any) {
        console.error(e);
        alert(e.shortMessage || e.message);
    }
  };

  const onAllotClick = () => {
    if (confirm("⚠️ RESTRICTED AREA: FOR JUDGES ONLY\n\nAre you a designated judge for this event?")) {
        setShowDistribute(true);
    }
  };

  const handleFinalize = async () => {
    if (winners.length === 0) return alert("Add at least one winner.");
    if (!resolvedId) return;

    try {
      const formattedWinners = winners.map((w) => {
        if (!w.amount || Number(w.amount) <= 0) throw new Error(`Invalid amount for ${w.to}`);
        return { to: w.to as `0x${string}`, amount: parseEther(w.amount) };
      });

      await writeContractAsync({
        address: PRIZE_ESCROW_ADDR,
        abi: PRIZE_ESCROW_ABI,
        functionName: "finalize",
        args: [resolvedId, formattedWinners],
      });
      alert("Distribution Transaction Sent! Smart contract will verify judges.");
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Distribution failed");
    }
  };

  // --- Render UI ---
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex items-center justify-center relative overflow-hidden">
        {/* Background Ambient Light */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        </div>

      <div className="relative z-10 w-full max-w-4xl bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Event Info */}
        <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-slate-700">
            <button onClick={() => navigate("/")} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 text-sm font-semibold transition-colors">
                ← Back to Dashboard
            </button>

            <h1 className="text-3xl font-bold mb-2 break-words text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Event #{resolvedId.toString()}
            </h1>
            <div className="bg-slate-800/50 rounded-lg p-3 mb-8 border border-slate-700/50">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-1">Scope / Title</span>
                <p className="font-mono text-sm text-indigo-300 break-all">{String(scope)}</p>
            </div>

            {/* PRIZE POOL DISPLAY */}
            <div className="mb-8 text-center p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 shadow-inner">
                <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-2">Total Prize Pool</h3>
                <div className="text-4xl md:text-5xl font-extrabold text-emerald-400 drop-shadow-sm">
                    {formatEther(prizeRemaining)}
                    <span className="text-lg text-emerald-600 ml-2 font-medium">{getTokenLabel(token)}</span>
                </div>
                {finalized && <div className="mt-2 text-xs font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full inline-block">✅ Prizes Distributed</div>}
            </div>

            <div className="space-y-3">
                 <div className="flex justify-between text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Status</span>
                    <span className={finalized ? "text-red-400" : "text-emerald-400"}>
                        {finalized ? "Closed" : "Active & Funding"}
                    </span>
                 </div>
                 <div className="flex justify-between text-sm border-b border-slate-800 pb-2">
                    <span className="text-slate-400">Organizer</span>
                    <span className="font-mono text-slate-300">{String(organizer).slice(0, 6)}...{String(organizer).slice(-4)}</span>
                 </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
                 <Button onClick={handleRegister} disabled={finalized} variant="primary" className="w-full">
                    ✋ Register
                 </Button>
                 <div className="flex gap-2">
                    <input 
                        type="number" 
                        placeholder="0.1" 
                        className="w-full bg-slate-950 border border-slate-600 rounded-xl px-3 text-sm focus:border-indigo-500 outline-none"
                        value={fundAmount}
                        onChange={(e) => setFundAmount(e.target.value)}
                    />
                    <Button onClick={handleFund} variant="success" className="px-3" title="Fund Event">
                        💰
                    </Button>
                 </div>
            </div>
        </div>

        {/* Right Side: Judge / Distribute */}
        <div className="flex-1 bg-slate-950/30 p-8 md:p-10 flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="text-2xl">⚖️</span> Judge & Distribute
            </h2>

            {!showDistribute ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 opacity-80">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-3xl mb-2">
                        🔒
                    </div>
                    <p className="text-slate-400 text-sm max-w-xs">
                        Prize distribution is restricted to designated judges.
                        Authentication is handled on-chain.
                    </p>
                    <Button onClick={onAllotClick} variant="secondary" size="lg" className="w-full max-w-xs border-slate-600">
                        Allot Prizes
                    </Button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-4">
                        <label className="text-xs font-bold text-indigo-400 uppercase mb-2 block">
                            Add Winner (Smart Input)
                        </label>
                        <input
                            value={smartInput}
                            onChange={(e) => setSmartInput(e.target.value)}
                            onKeyDown={handleSmartInput}
                            placeholder="Paste address & press SPACE..."
                            className="w-full bg-slate-800 border-2 border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm font-mono transition-colors placeholder:text-slate-600"
                        />
                        <p className="text-[10px] text-slate-500 mt-2 text-right">
                            Press <kbd className="bg-slate-800 px-1 rounded">Space</kbd> to add
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[300px] bg-slate-900 rounded-xl border border-slate-800 p-2 space-y-2 mb-4">
                        {winners.length === 0 && (
                            <div className="h-full flex items-center justify-center text-slate-600 text-sm italic">
                                No winners added yet.
                            </div>
                        )}
                        {winners.map((w, i) => (
                            <div key={i} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex items-center gap-3 group hover:border-indigo-500/50 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-mono text-slate-300 truncate">{w.to}</div>
                                    <input 
                                        type="number" 
                                        placeholder="Amount" 
                                        className="mt-1 w-24 bg-slate-950 border border-slate-600 rounded px-2 py-0.5 text-xs text-emerald-400 focus:border-emerald-500 outline-none"
                                        value={w.amount}
                                        onChange={(e) => updateWinnerAmount(i, e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <button onClick={() => removeWinner(i)} className="text-slate-600 hover:text-red-400 p-2 transition-colors">✕</button>
                            </div>
                        ))}
                    </div>

                    <Button onClick={handleFinalize} variant="primary" size="lg" className="w-full shadow-xl shadow-indigo-900/20" disabled={isConfirming || winners.length === 0}>
                        {isConfirming ? "Verifying & Sending..." : "Distribute Prizes 🚀"}
                    </Button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}