'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useAccount, useChainId, useSwitchChain, useConnect, useDisconnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, isAddress, zeroAddress } from 'viem';
import { Header } from '@/components/Header';
import { rootstockTestnet } from '@/lib/chains';

/** ──────────────────────────────────────────────────────────────────────────
 *  Brand & Constants
 *  ────────────────────────────────────────────────────────────────────────── */
const BRAND = {
  primary: '#2962FF',   // Deep Ethereum Blue
  secondary: '#651FFF', // Deep Violet (minor use)
  accent: '#00E5FF',    // Electric Cyan
  base: '#FFFFFF',
  dark: '#0F1426',      // app canvas
};

const PRIZE_ESCROW_ADDR = '0xaB376f64F16481E496DdD3336Dd12f7F9a58bAd3' as `0x${string}`;

/** Minimal ABI – matches your mock (createEvent/topUp/register/finalize/getEvent) */
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
    name: 'topUp',
    stateMutability: 'payable',
    inputs: [
      { name: 'id', type: 'uint256' },
      { name: 'amount', type: 'uint96' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'finalize',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'id', type: 'uint256' },
      {
        name: 'winners',
        type: 'tuple[]',
        components: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint96' },
        ],
      },
    ],
    outputs: [],
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

/** ──────────────────────────────────────────────────────────────────────────
 *  Small UI helpers (clean, Luma-ish)
 *  ────────────────────────────────────────────────────────────────────────── */
function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl p-6 md:p-7 ${className}`}
      style={{ border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)' }}
    >
      <h2 className="text-xl md:text-2xl font-bold text-white mb-5">{title}</h2>
      {children}
    </section>
  );
}

function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success'; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-base' }[size];
  const variantStyles =
    variant === 'primary'
      ? { backgroundColor: BRAND.primary, color: BRAND.base }
      : variant === 'success'
      ? { backgroundColor: '#16a34a', color: BRAND.base }
      : variant === 'danger'
      ? { backgroundColor: '#ef4444', color: BRAND.base }
      : { backgroundColor: 'rgba(255,255,255,0.06)', color: BRAND.base, border: '1px solid rgba(255,255,255,0.12)' };
  return (
    <button
      className={`rounded-2xl font-semibold hover:opacity-95 transition ${sizes} ${className}`}
      style={variantStyles}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm text-white/85 font-semibold">{label}</span>}
      <input
        {...props}
        className="rounded-xl px-3 py-2.5 bg-white/5 text-white placeholder-white/40 outline-none border border-white/10 focus:border-white/20"
      />
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  );
}

function StatusBadge({ tone = 'info', children }: { tone?: 'success' | 'warning' | 'error' | 'info'; children: React.ReactNode }) {
  const map: Record<string, { bg: string; border: string; text: string }> = {
    success: { bg: 'rgba(22,163,74,0.20)', border: 'rgba(22,163,74,0.35)', text: '#86efac' },
    warning: { bg: 'rgba(234,179,8,0.18)', border: 'rgba(234,179,8,0.35)', text: '#fde047' },
    error: { bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.35)', text: '#fca5a5' },
    info: { bg: 'rgba(41,98,255,0.16)', border: 'rgba(255,255,255,0.16)', text: '#c7d2fe' },
  };
  const s = map[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      {children}
    </span>
  );
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Wallet/Chain strip (top-right header already handles connect; this focuses chain)
 *  ────────────────────────────────────────────────────────────────────────── */
function ChainStrip() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (chainId === rootstockTestnet.id) return null;

  return (
    <div
      className="rounded-2xl px-4 py-3 mb-6 flex items-center justify-between"
      style={{ border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.04)' }}
    >
      <div className="text-sm text-white/80">You’re on the wrong network.</div>
      <Button variant="primary" size="sm" onClick={() => switchChain?.({ chainId: rootstockTestnet.id })}>
        Switch to Rootstock Testnet
      </Button>
    </div>
  );
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Panels (Create, Read, TopUp, Register, Finalize)
 *  ────────────────────────────────────────────────────────────────────────── */
function CreatorPanel() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [useERC20, setUseERC20] = useState(false);
  const [token, setToken] = useState<string>(zeroAddress);
  const [deposit, setDeposit] = useState('0.1');
  const [regDays, setRegDays] = useState(7);
  const [finDays, setFinDays] = useState(14);
  const [scopeStr, setScopeStr] = useState('SELF_HUMAN_13+');
  const [judges, setJudges] = useState('');
  const [threshold, setThreshold] = useState(0);

  const scopeBytes = useMemo(() => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(scopeStr);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return ('0x' + (hex.length > 64 ? hex.slice(0, 64) : hex.padEnd(64, '0'))) as `0x${string}`;
  }, [scopeStr]);

  const onCreate = () => {
    if (!address) return alert('Connect wallet first');

    const judgeArr = judges
      .split(',')
      .map(s => s.trim())
      .filter(s => s && isAddress(s));

    const p = {
      token: useERC20 ? (token as `0x${string}`) : zeroAddress,
      depositAmount: parseEther(deposit),
      registerDeadline: BigInt(Math.floor(Date.now() / 1000) + regDays * 86400),
      finalizeDeadline: BigInt(Math.floor(Date.now() / 1000) + finDays * 86400),
      judges: judgeArr as `0x${string}`[],
      judgeThreshold: Number(threshold),
      scope: scopeBytes,
    };

    writeContract({
      address: PRIZE_ESCROW_ADDR,
      abi: PRIZE_ESCROW_ABI,
      functionName: 'createEvent',
      args: [p],
      value: useERC20 ? 0n : parseEther(deposit),
      chainId: rootstockTestnet.id,
    });
  };

  return (
    <Section title="🎯 Create new event">
      <div className="grid gap-6">
        {/* Token + deposit */}
        <div className="grid md:grid-cols-3 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-blue-500"
              checked={useERC20}
              onChange={e => setUseERC20(e.target.checked)}
            />
            <span className="text-white/80 text-sm">Use ERC-20 token</span>
          </label>

          {useERC20 && (
            <Input
              label="Token address"
              placeholder="0x…"
              value={token}
              onChange={e => setToken(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          )}

          <Input
            label={`Initial prize pool (${useERC20 ? 'tokens' : 'tRBTC'})`}
            type="number"
            step="0.0001"
            value={deposit}
            onChange={e => setDeposit(e.target.value)}
          />
        </div>

        {/* Timeline */}
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Registration period (days)"
            type="number"
            min={1}
            value={regDays}
            onChange={e => setRegDays(Number(e.target.value))}
          />
          <Input
            label="Total event duration (days)"
            type="number"
            min={1}
            value={finDays}
            onChange={e => setFinDays(Number(e.target.value))}
          />
        </div>

        {/* Judges */}
        <div className="grid md:grid-cols-3 gap-4">
          <Input
            label="Judges (comma separated)"
            placeholder="0xabc…, 0xdef…"
            value={judges}
            onChange={e => setJudges(e.target.value)}
          />
          <Input
            label="Required approvals"
            type="number"
            min={0}
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
          />
          <Input
            label="Scope identifier"
            placeholder="SELF_HUMAN_13+"
            value={scopeStr}
            onChange={e => setScopeStr(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={onCreate}
            disabled={isPending || isConfirming || !address}
          >
            {isPending ? 'Creating…' : isConfirming ? 'Confirming…' : 'Create event'}
          </Button>

          <div className="flex items-center gap-3">
            {hash && <span className="text-xs text-white/60 font-mono">Tx: {String(hash).slice(0, 10)}…</span>}
            {isSuccess && <StatusBadge tone="success">Event created</StatusBadge>}
          </div>
        </div>
      </div>
    </Section>
  );
}

function ReadEvent({ onLoaded }: { onLoaded: (s: any) => void }) {
  const [eventId, setEventId] = useState('1');
  const { data, refetch, isLoading } = useReadContract({
    address: PRIZE_ESCROW_ADDR,
    abi: PRIZE_ESCROW_ABI,
    functionName: 'getEvent',
    args: [BigInt(eventId || '0')],
    chainId: rootstockTestnet.id,
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
    if (eventData) {
      onLoaded({
        id: eventId,
        organizer: eventData.organizer,
        scope: eventData.scope,
        finalized: eventData.finalized,
        canceled: eventData.canceled,
        registerDeadline: eventData.registerDeadline,
        finalizeDeadline: eventData.finalizeDeadline,
        prizeRemaining: eventData.prizeRemaining,
        token: eventData.token,
        judgeThreshold: eventData.judgeThreshold,
      });
    }
  }, [eventData, eventId, onLoaded]);

  return (
    <Section title="📊 Event details">
      <div className="flex gap-3 items-end">
        <Input
          label="Event ID"
          value={eventId}
          onChange={e => setEventId(e.target.value)}
          placeholder="1"
        />
        <Button variant="secondary" onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {eventData ? (
        <div
          className="mt-5 rounded-2xl p-5 grid md:grid-cols-2 gap-6"
          style={{ border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}
        >
          <div className="space-y-3">
            <div className="text-sm text-white/70">Organizer</div>
            <div className="font-mono text-white/90">
              {String(eventData.organizer).slice(0, 10)}…{String(eventData.organizer).slice(-8)}
            </div>

            <div className="text-sm text-white/70 mt-3">Token</div>
            <div>
              {eventData.token === zeroAddress ? (
                <StatusBadge tone="info">Native tRBTC</StatusBadge>
              ) : (
                <span className="font-mono text-white/90">{String(eventData.token).slice(0, 10)}…</span>
              )}
            </div>

            <div className="text-sm text-white/70 mt-3">Prize remaining</div>
            <div className="text-white font-semibold">
              {formatEther(eventData.prizeRemaining)} {eventData.token === zeroAddress ? 'tRBTC' : 'tokens'}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm text-white/70">Registration ends</div>
            <div className="text-white/90">
              {new Date(Number(eventData.registerDeadline) * 1000).toLocaleString()}
            </div>

            <div className="text-sm text-white/70 mt-3">Event ends</div>
            <div className="text-white/90">
              {new Date(Number(eventData.finalizeDeadline) * 1000).toLocaleString()}
            </div>

            <div className="text-sm text-white/70 mt-3">Status</div>
            <div className="flex gap-2">
              <StatusBadge tone={eventData.finalized ? 'success' : 'warning'}>
                {eventData.finalized ? 'Finalized' : 'Active'}
              </StatusBadge>
              {eventData.canceled && <StatusBadge tone="error">Canceled</StatusBadge>}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-sm text-white/70">Scope</div>
            <div className="mt-1 font-mono text-xs text-white/90 break-all bg-white/5 rounded-xl p-3 border border-white/10">
              {String(eventData.scope)}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-5 text-white/60 text-sm">No event found for that ID.</div>
      )}
    </Section>
  );
}

function TopUpPanel() {
  const [eventId, setEventId] = useState('1');
  const [amount, setAmount] = useState('0.1');
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const onTopUp = () => {
    writeContract({
      address: PRIZE_ESCROW_ADDR,
      abi: PRIZE_ESCROW_ABI,
      functionName: 'topUp',
      args: [BigInt(eventId), parseEther(amount)],
      value: parseEther(amount),
      chainId: rootstockTestnet.id,
    });
  };

  return (
    <Section title="💰 Add funds">
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Event ID" type="number" value={eventId} onChange={e => setEventId(e.target.value)} />
        <Input label="Amount (tRBTC)" type="number" step="0.0001" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>

      <div className="flex items-center justify-between mt-5">
        <Button variant="success" onClick={onTopUp} disabled={isPending || isConfirming}>
          {isPending ? 'Sending…' : isConfirming ? 'Confirming…' : 'Add funds'}
        </Button>
        <div className="flex items-center gap-3">
          {hash && <span className="text-xs text-white/60 font-mono">Tx: {String(hash).slice(0, 10)}…</span>}
          {isSuccess && <StatusBadge tone="success">Topped up</StatusBadge>}
        </div>
      </div>
    </Section>
  );
}

function RegisterPanel({ eventState }: { eventState: any }) {
  const { address } = useAccount();
  const [eventId, setEventId] = useState('1');

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
    if (!address) return alert('Connect wallet first');
    if (!eventId) return;
    if (regClosed) return alert('Registration window closed');
    if (finalized || canceled) return alert('Event not open');
    writeContract({
      address: PRIZE_ESCROW_ADDR,
      abi: PRIZE_ESCROW_ABI,
      functionName: 'register',
      args: [BigInt(eventId)],
      chainId: rootstockTestnet.id,
    });
  };

  return (
    <Section title="✋ Register">
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Event ID" type="number" value={eventId} onChange={e => setEventId(e.target.value)} />
        <div className="flex items-end gap-2">
          {regClosed && <StatusBadge tone="error">Registration closed</StatusBadge>}
          {finalized && <StatusBadge tone="error">Event finalized</StatusBadge>}
          {canceled && <StatusBadge tone="error">Event canceled</StatusBadge>}
          {!regClosed && !finalized && !canceled && <StatusBadge tone="success">Open for registration</StatusBadge>}
        </div>
      </div>

      <div className="flex items-center gap-3 mt-5">
        <Button variant="primary" onClick={onRegister} disabled={isPending || isConfirming || !address || regClosed || finalized || canceled}>
          {isPending ? 'Registering…' : isConfirming ? 'Confirming…' : 'Register'}
        </Button>
        {isSuccess && <StatusBadge tone="success">Registered</StatusBadge>}
      </div>
    </Section>
  );
}

function FinalizePanel({ eventState }: { eventState: any }) {
  const { address } = useAccount();
  const [eventId, setEventId] = useState('1');
  useEffect(() => { if (eventState?.id) setEventId(String(eventState.id)); }, [eventState?.id]);

  const [rows, setRows] = useState([{ to: '', amount: '' }]);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const organizer        = eventState?.organizer;
  const prizeRemainingBn = eventState?.prizeRemaining ? BigInt(eventState.prizeRemaining) : 0n;
  const finalizeDeadline = eventState?.finalizeDeadline ? Number(eventState.finalizeDeadline) : 0;
  const judgeThreshold   = eventState?.judgeThreshold ? Number(eventState.judgeThreshold) : 0;
  const finalized        = Boolean(eventState?.finalized);
  const canceled         = Boolean(eventState?.canceled);

  const now = Math.floor(Date.now() / 1000);
  const canFinalizeTimewise = judgeThreshold === 0 || (finalizeDeadline > 0 && now >= finalizeDeadline);

  const total = useMemo(() => {
    try {
      return rows.reduce((acc, r) => (r.amount ? acc + BigInt(parseEther(String(r.amount))) : acc), 0n);
    } catch { return 0n; }
  }, [rows]);

  const winners = useMemo(
    () =>
      rows
        .filter(r => isAddress(r.to) && r.amount && r.amount !== '0')
        .map(r => ({ to: r.to as `0x${string}`, amount: BigInt(parseEther(String(r.amount))) })),
    [rows]
  );

  const addRow = () => setRows(r => [...r, { to: '', amount: '' }]);
  const removeRow = (i: number) => setRows(r => r.filter((_, idx) => idx !== i));

  const reasonsDisabled: string[] = [];
  if (!address) reasonsDisabled.push('Connect wallet');
  if (!canFinalizeTimewise) reasonsDisabled.push('Not past deadline and approvals required');
  if (finalized) reasonsDisabled.push('Event finalized');
  if (canceled) reasonsDisabled.push('Event canceled');
  if (winners.length === 0) reasonsDisabled.push('Add at least one valid winner');
  if (total === 0n) reasonsDisabled.push('Total must be > 0');
  if (prizeRemainingBn > 0n && total > prizeRemainingBn) reasonsDisabled.push('Total exceeds prize pool');

  const disabled = isPending || isConfirming || reasonsDisabled.length > 0;

  const onFinalize = () => {
    writeContract({
      address: PRIZE_ESCROW_ADDR,
      abi: PRIZE_ESCROW_ABI,
      functionName: 'finalize',
      args: [BigInt(eventId), winners],
      chainId: rootstockTestnet.id,
    });
  };

  return (
    <Section title="🏆 Finalize & distribute prizes">
      {/* Quick context */}
      <div
        className="rounded-2xl p-4 grid md:grid-cols-4 gap-4 mb-5"
        style={{ border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}
      >
        <Input label="Event ID" type="number" value={eventId} onChange={e => setEventId(e.target.value)} />
        <div className="text-sm text-white/80">
          <div><span className="text-white/60">Organizer:</span> <span className="font-mono">{organizer ? `${organizer.slice(0, 8)}…${organizer.slice(-6)}` : '—'}</span></div>
          <div><span className="text-white/60">Prize remaining:</span> <strong className="text-white">{formatEther(prizeRemainingBn)} tRBTC</strong></div>
          <div><span className="text-white/60">Finalize deadline:</span> {finalizeDeadline ? new Date(finalizeDeadline * 1000).toLocaleString() : '—'}</div>
          <div className="mt-1">{canFinalizeTimewise ? <StatusBadge tone="success">You can finalize now</StatusBadge> : <StatusBadge tone="warning">Waiting for deadline or approvals</StatusBadge>}</div>
        </div>
      </div>

      {/* Rows */}
      <div className="grid gap-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-2xl p-4 grid md:grid-cols-12 gap-3"
               style={{ border: '1px solid rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <div className="md:col-span-7">
              <Input label={`Winner ${i + 1} address`} placeholder="0x…" value={r.to}
                     onChange={e => setRows(prev => prev.map((x, idx) => (idx === i ? { ...x, to: e.target.value } : x)))} />
            </div>
            <div className="md:col-span-3">
              <Input label="Prize amount (tRBTC)" type="number" step="0.000001" value={r.amount}
                     onChange={e => setRows(prev => prev.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)))} />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => removeRow(i)} disabled={rows.length === 1} className="flex-1">Remove</Button>
              {i === rows.length - 1 && (
                <Button variant="secondary" size="sm" onClick={addRow} className="flex-1">+ Add</Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totals + Action */}
      <div className="mt-5 flex items-center justify-between">
        <div className="text-white/80">
          <span className="text-white/60">Total distribution:</span>{' '}
          <span className="font-semibold text-white">{formatEther(total)} tRBTC</span>
          {prizeRemainingBn > 0n && total > prizeRemainingBn && <span className="ml-3 text-rose-400 text-sm">Exceeds pool</span>}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="lg" onClick={onFinalize} disabled={disabled}>
            {isPending ? 'Finalizing…' : isConfirming ? 'Confirming…' : 'Finalize & pay winners'}
          </Button>
          {hash && <span className="text-xs text-white/60 font-mono">Tx: {String(hash).slice(0, 10)}…</span>}
          {isSuccess && <StatusBadge tone="success">Prizes distributed</StatusBadge>}
        </div>
      </div>

      {/* Why disabled */}
      {reasonsDisabled.length > 0 && (
        <div className="mt-3 text-xs text-white/60">
          {reasonsDisabled.map((r, idx) => <div key={idx}>• {r}</div>)}
        </div>
      )}
    </Section>
  );
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Page
 *  ────────────────────────────────────────────────────────────────────────── */
export default function EscrowPage() {
  const { isConnected } = useAccount();
  const [eventState, setEventState] = useState<any>(null);

  return (
    <div style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
      {/* Header (ENSure) */}
      <Header variant="default" />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Top strip for chain */}
        <ChainStrip />

        {/* Hero */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">Prize Escrow (Rootstock Testnet)</h1>
            <p className="text-white/70 mt-2">
              Lock prizes in escrow, let participants register, and distribute to winners—fully on-chain.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl ring-1 ring-white/10">
              <Image src="/ensure.png" alt="ENSure" fill className="object-cover" />
            </div>
          </div>
        </div>

        {/* Panels */}
        <div className="grid gap-8">
          <CreatorPanel />

          <div className="grid md:grid-cols-2 gap-8">
            <ReadEvent onLoaded={setEventState} />
            <TopUpPanel />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <RegisterPanel eventState={eventState} />
            <div className="hidden md:block" />
          </div>

          <FinalizePanel eventState={eventState} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8" style={{ backgroundColor: '#0C1120' }}>
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-7 w-7 overflow-hidden rounded-lg ring-1 ring-white/10">
              <Image src="/ensure.png" alt="ENSure" fill className="object-cover" />
            </div>
            <span className="text-sm text-white/85 font-semibold">ENSure</span>
          </div>
          <div className="text-xs text-white/60">
            Rootstock Testnet · tRBTC ·{' '}
            <span className="font-mono">PrizeEscrow: {PRIZE_ESCROW_ADDR.slice(0, 6)}…{PRIZE_ESCROW_ADDR.slice(-4)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
