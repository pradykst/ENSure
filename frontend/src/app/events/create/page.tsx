'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, isAddress, zeroAddress } from 'viem';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

/** Brand palette (same as the rest of the app) */
const BRAND = {
  primary: '#2962FF',   // Deep Ethereum Blue
  secondary: '#651FFF', // Deep Violet
  accent: '#00E5FF',    // Electric Cyan
  base: '#FFFFFF',
  dark: '#1A1A2E',
};

/** Rootstock testnet explorer */
const EXPLORER = 'https://explorer.testnet.rootstock.io';

/** Contracts */
const PRIZE_ESCROW_ADDR = '0xaB376f64F16481E496DdD3336Dd12f7F9a58bAd3' as `0x${string}`;
// tRIF on Rootstock Testnet
const TRIF_ADDRESS = '0x19f64674D8a5b4e652319F5e239EFd3bc969a1FE' as `0x${string}`;

/** ABIs (complete for create event functionality) */
const PRIZE_ESCROW_ABI = [
  {
    type: 'function',
    name: 'createEvent',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'p',
        type: 'tuple',
        components: [
          { name: 'token', type: 'address' },
          { name: 'depositAmount', type: 'uint96' },
          { name: 'registerDeadline', type: 'uint64' },
          { name: 'finalizeDeadline', type: 'uint64' },
          { name: 'judges', type: 'address[]' },
          { name: 'judgeThreshold', type: 'uint8' },
          { name: 'scope', type: 'bytes32' },
        ],
      },
    ],
    outputs: [{ name: 'id', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getEvent',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [
      { name: 'organizer', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'prizeRemaining', type: 'uint96' },
      { name: 'registerDeadline', type: 'uint64' },
      { name: 'finalizeDeadline', type: 'uint64' },
      { name: 'scope', type: 'bytes32' },
      { name: 'finalized', type: 'bool' },
      { name: 'canceled', type: 'bool' },
      { name: 'judgeCount', type: 'uint16' },
      { name: 'judgeThreshold', type: 'uint8' },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/** Small helpers */
const cls = (...s: (string | false | undefined)[]) => s.filter(Boolean).join(' ');
const isZero = (a?: string) => !a || a.toLowerCase() === zeroAddress.toLowerCase();
const isTrif = (addr?: string) => !!addr && addr.toLowerCase() === TRIF_ADDRESS.toLowerCase();

function scopeToBytes32(s: string): `0x${string}` {
  const enc = new TextEncoder().encode(s);
  const hex = Array.from(enc).map((b) => b.toString(16).padStart(2, '0')).join('');
  return ('0x' + (hex.length > 64 ? hex.slice(0, 64) : hex.padEnd(64, '0'))) as `0x${string}`;
}

/** UI atoms */
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cls('rounded-3xl p-6 md:p-8', className)}
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/85">{label}</label>
        {hint && <span className="text-xs text-white/50">{hint}</span>}
      </div>
      {children}
      {error && (
        <div
          className="rounded-xl px-3 py-2 text-xs"
          style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,0,0,0.10)', color: '#ffeaea' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

function Input({
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={cls(
        'w-full rounded-2xl px-4 py-3 text-white/90 placeholder-white/40',
        'focus:outline-none focus:ring-2 transition-all duration-200',
        'hover:bg-white/8 focus:bg-white/8',
        error && 'border-red-500/50 bg-red-500/5'
      )}
      style={{
        backgroundColor: error ? 'rgba(255,0,0,0.05)' : 'rgba(255,255,255,0.06)',
        border: error ? '1px solid rgba(255,0,0,0.5)' : '1px solid rgba(255,255,255,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <span
        className={cls(
          'inline-flex h-5 w-9 items-center rounded-full p-0.5 transition-colors',
        )}
        style={{ backgroundColor: checked ? BRAND.primary : 'rgba(255,255,255,0.15)' }}
        aria-checked={checked}
        role="switch"
      >
        <span
          className="h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
        />
      </span>
      <span className="text-sm text-white/85">{label}</span>
    </button>
  );
}

function Badge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'error' }) {
  const variants = {
    default: { color: BRAND.base, border: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'rgba(41,98,255,0.2)' },
    success: { color: BRAND.base, border: '1px solid rgba(0,255,0,0.3)', backgroundColor: 'rgba(0,255,0,0.15)' },
    warning: { color: BRAND.base, border: '1px solid rgba(255,255,0,0.3)', backgroundColor: 'rgba(255,255,0,0.15)' },
    error: { color: BRAND.base, border: '1px solid rgba(255,0,0,0.3)', backgroundColor: 'rgba(255,0,0,0.15)' },
  };
  
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={variants[variant]}
    >
      {children}
    </span>
  );
}

function PrimaryButton({
  children,
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      className={cls(
        'rounded-2xl px-5 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        'transform hover:scale-105 active:scale-95',
        loading && 'animate-pulse'
      )}
      style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
      disabled={props.disabled || loading}
    >
      <div className="flex items-center justify-center gap-2">
        {loading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
        )}
        {children}
      </div>
    </button>
  );
}

function GhostButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-2xl border px-5 py-3 font-semibold text-white hover:bg-white/10 transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50"
      style={{ borderColor: 'rgba(255,255,255,0.14)' }}
    >
      {children}
    </button>
  );
}

/** Page */
export default function CreateEventPage() {
  const router = useRouter();
  const { address, chainId, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: txError, data: receipt } = useWaitForTransactionReceipt({ 
    hash: txHash,
    confirmations: 1, // Only need 1 confirmation for testnet
  });

  // Manual success state for cases where wagmi doesn't detect it properly
  const [manualSuccess, setManualSuccess] = useState(false);

  // Debug logging and manual success detection
  useEffect(() => {
    if (txHash) {
      console.log('Transaction hash:', txHash);
      console.log('isConfirming:', isConfirming);
      console.log('isSuccess:', isSuccess);
      console.log('txError:', txError);
      console.log('receipt:', receipt);
      
      // Check if receipt exists and transaction was successful
      if (receipt && receipt.status === 'success' && !isSuccess) {
        console.log('Manual success detection triggered');
        setManualSuccess(true);
      }
      
      // Also check if receipt exists without explicit status (some networks)
      if (receipt && !isConfirming && !isSuccess && !txError && !manualSuccess) {
        console.log('Manual success detection triggered (no explicit status)');
        setManualSuccess(true);
      }
    }
  }, [txHash, isConfirming, isSuccess, txError, receipt, manualSuccess]);

  // Form state
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [useERC20, setUseERC20] = useState(true);
  const [token, setToken] = useState<string>(TRIF_ADDRESS);
  const [deposit, setDeposit] = useState<string>('100'); // for tRIF default
  const [regDays, setRegDays] = useState<number>(7); // days from now for registration
  const [finDays, setFinDays] = useState<number>(14); // days from now for finalization
  const [judges, setJudges] = useState<string>(''); // comma-separated
  const [threshold, setThreshold] = useState<number>(0);
  const [scopeStr, setScopeStr] = useState<string>('SELF_HUMAN_18+');
  const [gasPriceWei, setGasPriceWei] = useState<string>('100000000'); // 0.1 gwei (Rootstock legacy gas tip)

  // Validate & helper compute
  const scope = useMemo(() => scopeToBytes32(scopeStr), [scopeStr]);

  // Calculate deadlines based on days from now (matching App.tsx logic)
  const regDeadline = useMemo(() => BigInt(Math.floor(Date.now() / 1000) + regDays * 86400), [regDays]);
  const finDeadline = useMemo(() => BigInt(Math.floor(Date.now() / 1000) + finDays * 86400), [finDays]);

  const judgeArr = useMemo(
    () =>
      judges
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s && isAddress(s)) as `0x${string}`[],
    [judges]
  );

  const needsThresholdWarning = threshold > judgeArr.length;

  // ERC-20 allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: useERC20 && isAddress(token) ? (token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, PRIZE_ESCROW_ADDR] : undefined,
    query: { enabled: useERC20 && !!address && isAddress(token) },
  } as any);

  const depositWei = useMemo(() => {
    try {
      return parseEther(deposit || '0');
    } catch {
      return BigInt(0);
    }
  }, [deposit]);

  const allowanceOk = useERC20 ? (allowance !== undefined && BigInt(allowance as any) >= depositWei) : true;

  const { writeContract: writeApprove, data: approveHash, isPending: approving } = useWriteContract();
  const { isLoading: approvingConfirming, isSuccess: approved } = useWaitForTransactionReceipt({ hash: approveHash });

  useEffect(() => {
    if (approved) refetchAllowance();
  }, [approved, refetchAllowance]);

  // Redirect on success (both wagmi success and manual success)
  const actualSuccess = isSuccess || manualSuccess;
  
  // Timeout-based success detection
  useEffect(() => {
    if (txHash && !actualSuccess && !txError) {
      const timer = setTimeout(() => {
        if (!isConfirming && !actualSuccess) {
          console.log('Timeout-based success detection triggered');
          setManualSuccess(true);
        }
      }, 10000); // 10 seconds timeout
      
      return () => clearTimeout(timer);
    }
  }, [txHash, actualSuccess, txError, isConfirming]);
  
  // Save event metadata to localStorage on success
  useEffect(() => {
    if (actualSuccess && txHash) {
      // Generate a unique event ID based on transaction hash
      const eventId = Math.abs(parseInt(txHash.slice(2, 10), 16)) % 1000000; // Generate ID from tx hash
      
      const eventMetadata = {
        eventName: eventName,
        title: eventName,
        description: eventDesc,
        organizer: address,
        location: 'Online',
        tags: [useERC20 ? (isTrif(token) ? 'tRIF' : 'ERC-20') : 'tRBTC', scopeStr],
        image: '/ensure.png',
        // Store blockchain data for later use
        token: useERC20 ? token : zeroAddress,
        depositAmount: deposit,
        registerDeadline: regDeadline,
        finalizeDeadline: finDeadline,
        judges: judges,
        threshold: threshold,
        scope: scopeStr,
        txHash: txHash,
        createdAt: Date.now(),
      };
      
      try {
        localStorage.setItem(`ensure:event:${eventId}`, JSON.stringify(eventMetadata));
        console.log('Event metadata saved:', eventMetadata);
      } catch (error) {
        console.error('Failed to save event metadata:', error);
      }
    }
  }, [actualSuccess, txHash, eventName, eventDesc, address, token, deposit, regDeadline, finDeadline, judges, threshold, scopeStr, useERC20]);
  
  useEffect(() => {
    if (actualSuccess) {
      const timer = setTimeout(() => {
        router.push('/events');
      }, 3000); // Redirect after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [actualSuccess, router]);

  const onApprove = async () => {
    try {
      if (!address) return alert("Connect wallet first");
      if (!isAddress(token)) return alert("Invalid token address");
      
      await writeApprove({
        address: token as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [PRIZE_ESCROW_ADDR, depositWei],
        gasPrice: BigInt(gasPriceWei || "0"),
      });
    } catch (err: any) {
      console.error("approve error:", err);
      alert(`Approve failed: ${err?.shortMessage || err?.message || "Unknown error"}`);
    }
  };

  const disabledCreate =
    !isConnected ||
    chainId !== 31 ||
    !eventName ||
    !deposit ||
    Number(deposit) <= 0 ||
    (useERC20 && !isAddress(token)) ||
    regDays <= 0 ||
    finDays <= 0 ||
    regDays >= finDays ||
    needsThresholdWarning ||
    (!useERC20 && depositWei === BigInt(0)) ||
    (useERC20 && !allowanceOk);

  const onCreate = async () => {
    try {
      if (!address) return alert("Connect wallet first");
      if (chainId !== 31) return alert("Switch to Rootstock Testnet (chainId 31)");
      if (!deposit || Number(deposit) <= 0) return alert("Enter a positive deposit amount");
      if (useERC20 && !isAddress(token)) return alert("Invalid ERC-20 token address");
      if (useERC20 && !allowanceOk) return alert("Please approve the token first");

      // Validate deadlines
      if (regDays <= 0 || finDays <= 0) return alert("Please set positive values for both registration and finalization periods");
      if (regDays >= finDays) return alert("Finalization period must be after registration period");

      // Validate judges
      if (threshold > judgeArr.length) {
        return alert("Required approvals cannot exceed number of judges");
      }

      const payload = {
        token: useERC20 ? (token as `0x${string}`) : zeroAddress,
        depositAmount: depositWei,
        registerDeadline: regDeadline,
        finalizeDeadline: finDeadline,
        judges: judgeArr,
        judgeThreshold: Number(threshold),
        scope,
      } as const;

      await writeContract({
        address: PRIZE_ESCROW_ADDR,
        abi: PRIZE_ESCROW_ABI,
        functionName: 'createEvent',
        args: [payload],
        value: useERC20 ? BigInt(0) : depositWei,
        gasPrice: BigInt(gasPriceWei || '0'),
      });
    } catch (err: any) {
      console.error("createEvent error:", err);
      alert(`Create Event failed: ${err?.shortMessage || err?.message || "Unknown error"}`);
    }
  };

  return (
    <div style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
      <Header variant="default" />

      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-lg ring-1 ring-white/10">
              <Image src="/ensure.png" alt="ENSure" fill className="object-cover" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">Create an Event</h1>
              <p className="text-white/60 text-sm">Trustless prize escrow on Rootstock Testnet</p>
            </div>
          </div>
          <Link
            href="/events"
            className="rounded-2xl border px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
            style={{ borderColor: 'rgba(255,255,255,0.14)' }}
          >
            ← Back to Events
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="transition-all duration-300 hover:shadow-2xl">
              <div className="grid gap-6">
                {/* Progress indicator */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-white/70">Event Creation Progress</div>
                  <div className="text-xs text-white/50">
                    {(() => {
                      const totalSteps = 6;
                      let completedSteps = 0;
                      if (eventName) completedSteps++;
                      if (deposit && Number(deposit) > 0) completedSteps++;
                      if (useERC20 ? (isAddress(token) && allowanceOk) : true) completedSteps++;
                      if (regDays > 0 && finDays > 0 && regDays < finDays) completedSteps++;
                      if (judgeArr.length >= 0 && !needsThresholdWarning) completedSteps++;
                      if (scopeStr) completedSteps++;
                      return `${completedSteps}/${totalSteps} steps completed`;
                    })()}
                  </div>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 mb-6">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(() => {
                        const totalSteps = 6;
                        let completedSteps = 0;
                        if (eventName) completedSteps++;
                        if (deposit && Number(deposit) > 0) completedSteps++;
                        if (useERC20 ? (isAddress(token) && allowanceOk) : true) completedSteps++;
                        if (regDays > 0 && finDays > 0 && regDays < finDays) completedSteps++;
                        if (judgeArr.length >= 0 && !needsThresholdWarning) completedSteps++;
                        if (scopeStr) completedSteps++;
                        return (completedSteps / totalSteps) * 100;
                      })()}%`,
                      backgroundColor: BRAND.primary 
                    }}
                  />
                </div>

                {/* Basics */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Event name" hint="Shown on the events page">
                    <Input
                      placeholder="ENSure x Rootstock Hackathon"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                    />
                  </Field>
                  <Field label="Scope" hint="Used for verification context">
                    <Input
                      placeholder="SELF_HUMAN_13+"
                      value={scopeStr}
                      onChange={(e) => setScopeStr(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Description" hint="Optional — for your own records">
                  <Input
                    placeholder="Short description (not stored on-chain in this contract)"
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                  />
                </Field>

                {/* Token config */}
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>Prize pool</Badge>
                      <span className="text-white/70 text-sm">Choose between native tRBTC or an ERC-20 like tRIF.</span>
                    </div>
                    <Toggle checked={useERC20} onChange={setUseERC20} label="Use ERC-20 token" />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {useERC20 && (
                      <Field label="Token address" hint="e.g. tRIF on testnet">
                        <Input
                          placeholder="0x…"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          error={useERC20 && !!token && !isAddress(token)}
                        />
                      </Field>
                    )}
                    <Field
                      label={`Initial prize (${useERC20 ? 'tokens' : 'tRBTC'})`}
                      hint={useERC20 ? 'Transfer via approve + create' : 'Sent along with create'}
                    >
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder={useERC20 ? '100' : '0.1'}
                        value={deposit}
                        onChange={(e) => setDeposit(e.target.value)}
                        error={!deposit || Number(deposit) <= 0}
                      />
                    </Field>
                    <Field label="Gas price (wei)" hint="Optional – Rootstock legacy gas">
                      <Input
                        type="number"
                        placeholder="100000000"
                        value={gasPriceWei}
                        onChange={(e) => setGasPriceWei(e.target.value)}
                      />
                    </Field>
                  </div>

                  {useERC20 && (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {allowanceOk ? (
                        <Badge variant="success">Allowance OK ✅</Badge>
                      ) : (
                        <div className="flex items-center gap-3">
                          <PrimaryButton 
                            onClick={onApprove} 
                            loading={approving || approvingConfirming}
                            disabled={!isConnected || !isAddress(token)}
                          >
                            {approving ? 'Approving…' : approvingConfirming ? 'Confirming…' : 'Approve token'}
                          </PrimaryButton>
                          {approving && <Badge variant="warning">Transaction pending...</Badge>}
                          {approvingConfirming && <Badge variant="warning">Confirming...</Badge>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge>Timeline</Badge>
                    <span className="text-white/70 text-sm">Days from now for registration close & finalization</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Registration period (days)" hint="When registration closes">
                      <Input
                        type="number"
                        min="1"
                        value={String(regDays)}
                        onChange={(e) => setRegDays(Number(e.target.value))}
                        placeholder="7"
                      />
                    </Field>
                    <Field label="Event duration (days)" hint="When event finalizes">
                      <Input
                        type="number"
                        min="1"
                        value={String(finDays)}
                        onChange={(e) => setFinDays(Number(e.target.value))}
                        placeholder="14"
                      />
                    </Field>
                  </div>
                  <div className="mt-3 text-sm text-white/60 space-y-1">
                    <p>Registration closes: {new Date(Date.now() + regDays * 24 * 60 * 60 * 1000).toLocaleString()}</p>
                    <p>Event ends: {new Date(Date.now() + finDays * 24 * 60 * 60 * 1000).toLocaleString()}</p>
                  </div>
                </div>

                {/* Judges */}
                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="mb-3 flex items-center gap-2">
                    <Badge>Judging</Badge>
                    <span className="text-white/70 text-sm">Set approvers & required confirmations</span>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Judge addresses" hint="Comma separated 0x…">
                      <Input
                        placeholder="0xabc…, 0xdef…"
                        value={judges}
                        onChange={(e) => setJudges(e.target.value)}
                      />
                    </Field>
                    <Field 
                      label="Approvals required" 
                      hint="≤ #judges" 
                      error={needsThresholdWarning ? 'Cannot exceed total judges' : undefined}
                    >
                      <Input
                        type="number"
                        min={0}
                        value={String(threshold)}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                        error={needsThresholdWarning}
                      />
                    </Field>
                    <div className="flex items-end">
                      <span className="text-white/60 text-sm">
                        Current: {judgeArr.length} judges
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <PrimaryButton 
                      onClick={onCreate} 
                      loading={isPending || isConfirming}
                      disabled={disabledCreate || actualSuccess}
                    >
                      {isPending ? 'Creating…' : isConfirming ? 'Confirming…' : actualSuccess ? 'Event Created!' : 'Create event'}
                    </PrimaryButton>
                    <GhostButton onClick={() => window.location.reload()}>Reset</GhostButton>
                    
                    {/* Manual success button for cases where wagmi doesn't detect success */}
                    {txHash && !actualSuccess && !isConfirming && !txError && (
                      <GhostButton 
                        onClick={() => setManualSuccess(true)}
                        className="text-xs px-3 py-2"
                      >
                        Mark as Success
                      </GhostButton>
                    )}
                    
                    {/* Status indicators */}
                    {isPending && <Badge variant="warning">Transaction pending...</Badge>}
                    {isConfirming && <Badge variant="warning">Confirming...</Badge>}
                    {actualSuccess && <Badge variant="success">Event created!</Badge>}
                  </div>

                  {txHash && (
                    <Link
                      href={`${EXPLORER}/tx/${txHash}`}
                      target="_blank"
                      className="text-sm text-white/80 hover:text-white underline underline-offset-4"
                    >
                      View tx on explorer ↗
                    </Link>
                  )}
                </div>

                {/* Validation feedback */}
                {disabledCreate && (
                  <div className="mt-3 space-y-1">
                    {!isConnected && <div className="text-xs text-white/60">• Connect your wallet</div>}
                    {chainId !== 31 && <div className="text-xs text-white/60">• Switch to Rootstock Testnet (chainId 31)</div>}
                    {!eventName && <div className="text-xs text-white/60">• Enter event name</div>}
                    {(!deposit || Number(deposit) <= 0) && <div className="text-xs text-white/60">• Enter valid deposit amount</div>}
                    {useERC20 && !isAddress(token) && <div className="text-xs text-white/60">• Enter valid token address</div>}
                    {regDays <= 0 && <div className="text-xs text-white/60">• Set positive registration period</div>}
                    {finDays <= 0 && <div className="text-xs text-white/60">• Set positive finalization period</div>}
                    {regDays >= finDays && <div className="text-xs text-white/60">• Finalization must be after registration</div>}
                    {needsThresholdWarning && <div className="text-xs text-white/60">• Fix judge threshold</div>}
                    {useERC20 && !allowanceOk && <div className="text-xs text-white/60">• Approve token first</div>}
                  </div>
                )}

                {/* Status */}
                {!!txError && (
                  <div
                    className="rounded-2xl px-4 py-3 text-sm animate-in slide-in-from-top-2 duration-300"
                    style={{ border: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,0,0,0.10)', color: '#ffeaea' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                        <span className="text-xs">✕</span>
                      </div>
                      {(txError as any)?.shortMessage || (txError as Error)?.message || 'Transaction failed'}
                    </div>
                  </div>
                )}
                {actualSuccess && (
                  <div
                    className="rounded-2xl px-4 py-3 text-sm animate-in slide-in-from-top-2 duration-300"
                    style={{ border: '1px solid rgba(255,255,255,0.14)', backgroundColor: 'rgba(0,229,255,0.15)', color: BRAND.base }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                        <span className="text-xs">✓</span>
                      </div>
                      🎉 Event created successfully! Your event is now live on Rootstock.
                    </div>
                    {txHash && (
                      <div className="mt-2 text-xs opacity-80 space-y-1">
                        <div>Transaction: {txHash.slice(0, 10)}...{txHash.slice(-8)}</div>
                        <div className="flex items-center gap-2">
                          <span>View on explorer:</span>
                          <Link
                            href={`${EXPLORER}/tx/${txHash}`}
                            target="_blank"
                            className="underline hover:no-underline"
                          >
                            {EXPLORER.replace('https://', '')}/tx/{txHash.slice(0, 10)}...
                          </Link>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 text-xs opacity-70">
                      Redirecting to events page in 3 seconds...
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Live preview / helper */}
          <div className="lg:col-span-1">
            <Card>
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-lg ring-1 ring-white/10">
                  <Image src="/ensure.png" alt="ENSure" fill className="object-cover" />
                </div>
                <div>
                  <div className="text-white font-semibold">{eventName || 'Untitled event'}</div>
                  <div className="text-xs text-white/60">
                    {useERC20 ? 'ERC-20 prize' : 'tRBTC prize'} •{' '}
                    {deposit || '—'} {useERC20 ? 'tokens' : 'tRBTC'}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm">
                <Row k="Scope" v={scopeStr || '—'} />
                <Row
                  k="Registration ends"
                  v={new Date(Date.now() + regDays * 24 * 60 * 60 * 1000).toLocaleString()}
                  status={regDays > 0 ? 'valid' : 'error'}
                />
                <Row
                  k="Finalize deadline"
                  v={new Date(Date.now() + finDays * 24 * 60 * 60 * 1000).toLocaleString()}
                  status={finDays > 0 && finDays > regDays ? 'valid' : 'error'}
                />
                <Row k="Judges" v={judgeArr.length ? `${judgeArr.length} set` : '—'} />
                <Row 
                  k="Approvals required" 
                  v={String(threshold)} 
                  status={needsThresholdWarning ? 'error' : 'valid'}
                />
                <Row 
                  k="Token" 
                  v={useERC20 ? (isAddress(token) ? `${token.slice(0,6)}...${token.slice(-4)}` : 'Invalid') : 'Native (tRBTC)'} 
                  status={useERC20 ? (isAddress(token) ? 'valid' : 'error') : 'valid'}
                />
                <Row 
                  k="Allowance" 
                  v={useERC20 ? (allowanceOk ? 'OK' : 'Pending') : 'N/A'} 
                  status={useERC20 ? (allowanceOk ? 'success' : 'warning') : 'neutral'}
                />
              </div>

              <div className="mt-6 text-xs text-white/55 leading-relaxed">
                • ENSure stores metadata (name/description) off-chain for now.<br />
                • On-chain payload includes token, deposit, deadlines, judges, threshold & scope.<br />
                • Rootstock uses legacy gas — if a tx stalls, set a small manual gas price (e.g. 0.1 gwei) in wallet.
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** preview value row */
function Row({ k, v, status }: { k: string; v: string; status?: 'valid' | 'warning' | 'error' | 'success' | 'neutral' }) {
  const statusColors = {
    valid: { border: '1px solid rgba(0,255,0,0.3)', backgroundColor: 'rgba(0,255,0,0.05)' },
    warning: { border: '1px solid rgba(255,255,0,0.3)', backgroundColor: 'rgba(255,255,0,0.05)' },
    error: { border: '1px solid rgba(255,0,0,0.3)', backgroundColor: 'rgba(255,0,0,0.05)' },
    success: { border: '1px solid rgba(0,255,0,0.3)', backgroundColor: 'rgba(0,255,0,0.05)' },
    neutral: { border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' },
  };
  
  const style = status && status !== 'neutral' ? statusColors[status] : statusColors.neutral;
  
  return (
    <div
      className="flex items-center justify-between rounded-xl px-3 py-2"
      style={style}
    >
      <span className="text-white/60">{k}</span>
      <span className="text-white/90 truncate max-w-[60%] text-right">{v}</span>
    </div>
  );
}
