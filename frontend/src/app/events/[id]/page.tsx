'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter, useParams } from 'next/navigation';
import { parseEther, formatEther, isAddress, zeroAddress } from 'viem';
import Link from 'next/link';
import Image from 'next/image';
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
const TRIF_ADDRESS = '0x19f64674D8a5b4e652319F5e239EFd3bc969a1FE' as `0x${string}`;

/** ABIs */
const PRIZE_ESCROW_ABI = [
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
  {
    type: 'function',
    name: 'register',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [],
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

/** Helper functions */
const isZero = (addr?: string) => !addr || addr.toLowerCase() === zeroAddress.toLowerCase();
const isTrif = (addr?: string) => !!addr && addr.toLowerCase() === TRIF_ADDRESS.toLowerCase();
const tokenLabel = (addr?: string) => (isZero(addr) ? "tRBTC" : isTrif(addr) ? "tRIF" : "tokens");

/** Local storage helpers */
const getEventMetadata = (eventId: number) => {
  try {
    const stored = localStorage.getItem(`ensure:event:${eventId}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/** UI Components */
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl p-6 md:p-8 ${className}`}
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </div>
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
      className={`rounded-2xl px-5 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 ${loading ? 'animate-pulse' : ''}`}
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

function Input({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: boolean }) {
  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-white/85">{label}</label>}
      <input
        {...props}
        className={`w-full rounded-2xl px-4 py-3 text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 transition-all duration-200 hover:bg-white/8 focus:bg-white/8 ${error ? 'border-red-500/50 bg-red-500/5' : ''}`}
        style={{
          backgroundColor: error ? 'rgba(255,0,0,0.05)' : 'rgba(255,255,255,0.06)',
          border: error ? '1px solid rgba(255,0,0,0.5)' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      />
    </div>
  );
}

/** Main Page Component */
export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const { address, chainId, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: txError } = useWaitForTransactionReceipt({ hash: txHash });

  // State for different actions
  const [topUpAmount, setTopUpAmount] = useState('');
  const [winners, setWinners] = useState<{ to: string; amount: string }[]>([{ to: '', amount: '' }]);
  const [topUpPending, setTopUpPending] = useState(false);
  const [finalizePending, setFinalizePending] = useState(false);
  const [registerPending, setRegisterPending] = useState(false);

  // Fetch event data
  const { data: eventData, isLoading: eventLoading, refetch: refetchEvent } = useReadContract({
    address: PRIZE_ESCROW_ADDR,
    abi: PRIZE_ESCROW_ABI,
    functionName: 'getEvent',
    args: [BigInt(eventId || '0')],
    query: { enabled: !!eventId },
  });

  // Get event metadata from localStorage
  const eventMetadata = useMemo(() => {
    return getEventMetadata(Number(eventId));
  }, [eventId]);

  // Parse event data
  const parsedEventData = useMemo(() => {
    if (!eventData || !Array.isArray(eventData)) return null;
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
    ] = eventData as any[];

    return {
      organizer: String(organizer),
      token: String(token),
      prizeRemaining: BigInt(prizeRemaining),
      registerDeadline: Number(registerDeadline),
      finalizeDeadline: Number(finalizeDeadline),
      scope: String(scope),
      finalized: Boolean(finalized),
      canceled: Boolean(canceled),
      judgeCount: Number(judgeCount),
      judgeThreshold: Number(judgeThreshold),
    };
  }, [eventData]);

  // Check if user can register
  const canRegister = useMemo(() => {
    if (!parsedEventData || !address) return false;
    const now = Math.floor(Date.now() / 1000);
    return now < parsedEventData.registerDeadline && !parsedEventData.finalized && !parsedEventData.canceled;
  }, [parsedEventData, address]);

  // Check if user can finalize (organizer only)
  const canFinalize = useMemo(() => {
    if (!parsedEventData || !address) return false;
    const isOrganizer = address.toLowerCase() === parsedEventData.organizer.toLowerCase();
    const now = Math.floor(Date.now() / 1000);
    return isOrganizer && now >= parsedEventData.finalizeDeadline && !parsedEventData.finalized;
  }, [parsedEventData, address]);

  // ERC-20 allowance for top-up
  const { data: allowance } = useReadContract({
    address: parsedEventData?.token && !isZero(parsedEventData.token) ? (parsedEventData.token as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address as `0x${string}`, PRIZE_ESCROW_ADDR] : undefined,
    query: { enabled: !!parsedEventData?.token && !isZero(parsedEventData.token) && !!address },
  } as any);

  const topUpAmountWei = useMemo(() => {
    try {
      return parseEther(topUpAmount || '0');
    } catch {
      return BigInt(0);
    }
  }, [topUpAmount]);

  const needsApproval = parsedEventData?.token && !isZero(parsedEventData.token) && 
    allowance !== undefined && BigInt(allowance as any) < topUpAmountWei;

  // Registration handler
  const handleRegister = async () => {
    if (!address || !eventId) return;
    
    setRegisterPending(true);
    try {
      await writeContract({
        address: PRIZE_ESCROW_ADDR,
        abi: PRIZE_ESCROW_ABI,
        functionName: 'register',
        args: [BigInt(eventId)],
      });
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    } finally {
      setRegisterPending(false);
    }
  };

  // Top-up handler
  const handleTopUp = async () => {
    if (!address || !eventId || !parsedEventData) return;
    
    setTopUpPending(true);
    try {
      await writeContract({
        address: PRIZE_ESCROW_ADDR,
        abi: PRIZE_ESCROW_ABI,
        functionName: 'topUp',
        args: [BigInt(eventId), topUpAmountWei],
        value: isZero(parsedEventData.token) ? topUpAmountWei : BigInt(0),
      });
    } catch (error) {
      console.error('Top-up failed:', error);
      alert('Top-up failed. Please try again.');
    } finally {
      setTopUpPending(false);
    }
  };

  // Finalize handler
  const handleFinalize = async () => {
    if (!address || !eventId || !parsedEventData) return;
    
    const validWinners = winners
      .filter(w => isAddress(w.to) && w.amount && w.amount !== '0')
      .map(w => ({
        to: w.to as `0x${string}`,
        amount: BigInt(parseEther(w.amount)),
      }));

    if (validWinners.length === 0) {
      alert('Please add at least one valid winner');
      return;
    }

    setFinalizePending(true);
    try {
      await writeContract({
        address: PRIZE_ESCROW_ADDR,
        abi: PRIZE_ESCROW_ABI,
        functionName: 'finalize',
        args: [BigInt(eventId), validWinners],
      });
    } catch (error) {
      console.error('Finalization failed:', error);
      alert('Finalization failed. Please try again.');
    } finally {
      setFinalizePending(false);
    }
  };

  if (eventLoading) {
    return (
      <div style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
        <Header variant="default" />
        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-4xl animate-spin mb-4">⏳</div>
              <h2 className="text-xl font-semibold text-white">Loading event details...</h2>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!parsedEventData) {
    return (
      <div style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
        <Header variant="default" />
        <main className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="text-4xl mb-4">❌</div>
              <h2 className="text-xl font-semibold text-white">Event not found</h2>
              <p className="text-white/70 mt-2">The event you're looking for doesn't exist.</p>
              <Link
                href="/events"
                className="mt-4 inline-flex items-center justify-center rounded-2xl px-6 py-3 font-semibold text-white"
                style={{ backgroundColor: BRAND.primary }}
              >
                Back to Events
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
      <Header variant="default" />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/events"
              className="rounded-2xl border px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.14)' }}
            >
              ← Back to Events
            </Link>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                {eventMetadata?.eventName || eventMetadata?.title || `Event #${eventId}`}
              </h1>
              <p className="text-white/60 mt-1">
                Organized by {parsedEventData.organizer.slice(0, 6)}...{parsedEventData.organizer.slice(-4)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {parsedEventData.finalized && <Badge variant="success">Finalized</Badge>}
            {parsedEventData.canceled && <Badge variant="error">Canceled</Badge>}
            {!parsedEventData.finalized && !parsedEventData.canceled && (
              <Badge variant={canRegister ? 'warning' : 'default'}>
                {canRegister ? 'Open for Registration' : 'Registration Closed'}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <Card>
              <h2 className="text-2xl font-bold text-white mb-6">Event Information</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-1">Prize Pool</h3>
                  <p className="text-xl font-bold text-green-400">
                    {formatEther(parsedEventData.prizeRemaining)} {tokenLabel(parsedEventData.token)}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-1">Token Type</h3>
                  <p className="text-lg text-white">
                    {isZero(parsedEventData.token) ? 'Native tRBTC' : isTrif(parsedEventData.token) ? 'tRIF (ERC-20)' : 'ERC-20'}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-1">Registration Deadline</h3>
                  <p className="text-lg text-white">
                    {new Date(parsedEventData.registerDeadline * 1000).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-1">Finalization Deadline</h3>
                  <p className="text-lg text-white">
                    {new Date(parsedEventData.finalizeDeadline * 1000).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-1">Judges</h3>
                  <p className="text-lg text-white">{parsedEventData.judgeCount} judges</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white/70 mb-1">Required Approvals</h3>
                  <p className="text-lg text-white">{parsedEventData.judgeThreshold} approvals</p>
                </div>
              </div>
              
              {eventMetadata?.description && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-sm font-medium text-white/70 mb-2">Description</h3>
                  <p className="text-white/85">{eventMetadata.description}</p>
                </div>
              )}
            </Card>

            {/* Registration Section */}
            {canRegister && (
              <Card>
                <h2 className="text-2xl font-bold text-white mb-6">Register for Event</h2>
                <p className="text-white/70 mb-6">
                  Register to participate in this event. Registration is free and only requires a wallet connection.
                </p>
                <PrimaryButton
                  onClick={handleRegister}
                  loading={registerPending}
                  disabled={!isConnected || chainId !== 31}
                >
                  {registerPending ? 'Registering...' : 'Register for Event'}
                </PrimaryButton>
                {!isConnected && (
                  <p className="text-sm text-white/60 mt-2">Please connect your wallet to register</p>
                )}
                {chainId !== 31 && (
                  <p className="text-sm text-white/60 mt-2">Please switch to Rootstock Testnet to register</p>
                )}
              </Card>
            )}

            {/* Top-up Section (Organizer only) */}
            {address?.toLowerCase() === parsedEventData.organizer.toLowerCase() && (
              <Card>
                <h2 className="text-2xl font-bold text-white mb-6">Add Funds to Prize Pool</h2>
                <div className="space-y-4">
                  <Input
                    label={`Amount to add (${tokenLabel(parsedEventData.token)})`}
                    type="number"
                    step="0.0001"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="0.1"
                  />
                  {needsApproval && (
                    <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-sm text-yellow-400">
                        You need to approve the token before adding funds.
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <PrimaryButton
                      onClick={handleTopUp}
                      loading={topUpPending}
                      disabled={!topUpAmount || Number(topUpAmount) <= 0 || needsApproval}
                    >
                      {topUpPending ? 'Adding Funds...' : 'Add Funds'}
                    </PrimaryButton>
                  </div>
                </div>
              </Card>
            )}

            {/* Finalization Section (Organizer only) */}
            {canFinalize && (
              <Card>
                <h2 className="text-2xl font-bold text-white mb-6">Finalize Event & Distribute Prizes</h2>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Prize Distribution</h3>
                  {winners.map((winner, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-2">
                      <Input
                        label={`Winner ${index + 1} Address`}
                        placeholder="0x..."
                        value={winner.to}
                        onChange={(e) => {
                          const newWinners = [...winners];
                          newWinners[index].to = e.target.value;
                          setWinners(newWinners);
                        }}
                        error={winner.to && !isAddress(winner.to)}
                      />
                      <Input
                        label="Prize Amount"
                        type="number"
                        step="0.00001"
                        placeholder="0.0"
                        value={winner.amount}
                        onChange={(e) => {
                          const newWinners = [...winners];
                          newWinners[index].amount = e.target.value;
                          setWinners(newWinners);
                        }}
                      />
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <GhostButton
                      onClick={() => setWinners([...winners, { to: '', amount: '' }])}
                    >
                      Add Winner
                    </GhostButton>
                    <PrimaryButton
                      onClick={handleFinalize}
                      loading={finalizePending}
                    >
                      {finalizePending ? 'Finalizing...' : 'Finalize & Distribute Prizes'}
                    </PrimaryButton>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Event Summary</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Status:</span>
                    <span className="text-white">
                      {parsedEventData.finalized ? 'Finalized' : 
                       parsedEventData.canceled ? 'Canceled' : 
                       canRegister ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Prize Pool:</span>
                    <span className="text-white font-semibold">
                      {formatEther(parsedEventData.prizeRemaining)} {tokenLabel(parsedEventData.token)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Judges:</span>
                    <span className="text-white">{parsedEventData.judgeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Required Approvals:</span>
                    <span className="text-white">{parsedEventData.judgeThreshold}</span>
                  </div>
                </div>

                {txHash && (
                  <div className="pt-4 border-t border-white/10">
                    <Link
                      href={`${EXPLORER}/tx/${txHash}`}
                      target="_blank"
                      className="text-sm text-white/80 hover:text-white underline underline-offset-4"
                    >
                      View transaction on explorer ↗
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
