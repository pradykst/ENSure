'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatEther, isAddress, zeroAddress } from 'viem';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

type Status = 'upcoming' | 'ongoing' | 'ended';

type EventCard = {
  id: number;
  title: string;
  organizer: string;
  startDate: string;  // ISO: '2025-10-01'
  endDate: string;    // ISO
  location: string;
  prizePool: string;
  participants: number;
  maxParticipants: number;
  image?: string;
  tags?: string[];
  short?: string;
};

const BRAND = {
  primary: '#2962FF',
  base: '#FFFFFF',
  dark: '#1A1A2E',
};

/** Smart Contract Configuration */
const PRIZE_ESCROW_ADDR = '0xaB376f64F16481E496DdD3336Dd12f7F9a58bAd3' as `0x${string}`;
const TRIF_ADDRESS = '0x19f64674D8a5b4e652319F5e239EFd3bc969a1FE' as `0x${string}`;

/** ABI for getting event details */
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

const saveEventMetadata = (eventId: number, metadata: any) => {
  try {
    localStorage.setItem(`ensure:event:${eventId}`, JSON.stringify(metadata));
  } catch (error) {
    console.error('Failed to save event metadata:', error);
  }
};

const mockEvents: EventCard[] = [
  {
    id: 1,
    title: 'ETHGlobal New Delhi',
    organizer: 'ETHGlobal',
    startDate: '2025-10-12',
    endDate: '2025-10-14',
    location: 'New Delhi, India',
    prizePool: '10,000 USDC',
    participants: 156,
    maxParticipants: 240,
    image: '/ensure.png',
    tags: ['Ethereum', 'DeFi', 'Open Track'],
    short: 'Build the future of decentralized apps in Delhi.',
  },
  {
    id: 2,
    title: 'Rootstock Innovation Challenge',
    organizer: 'Rootstock',
    startDate: '2025-10-20',
    endDate: '2025-10-22',
    location: 'Remote / Global',
    prizePool: '2.5 BTC',
    participants: 89,
    maxParticipants: 180,
    image: '/ensure.png',
    tags: ['Bitcoin', 'Rootstock', 'Smart Contracts'],
    short: 'Bitcoin-secured smart contracts. Ship an MVP.',
  },
  {
    id: 3,
    title: 'Self Protocol Identity Hack',
    organizer: 'Self',
    startDate: '2025-09-18',
    endDate: '2025-09-21',
    location: 'Online',
    prizePool: '10,000 USDC',
    participants: 134,
    maxParticipants: 200,
    image: '/ensure.png',
    tags: ['Identity', 'ZK', 'Privacy'],
    short: 'Build privacy-preserving identity experiences.',
  },
  {
    id: 4,
    title: 'Bangalore DeFi Summit',
    organizer: 'DeFi India',
    startDate: '2025-11-05',
    endDate: '2025-11-08',
    location: 'Bengaluru, India',
    prizePool: '15,000 USDC',
    participants: 0,
    maxParticipants: 220,
    image: '/ensure.png',
    tags: ['DeFi', 'DEX', 'L2'],
    short: 'Protocols, liquidity, and next-gen finance.',
  },
  {
    id: 5,
    title: 'Web3 Mumbai Mini-Hack',
    organizer: 'Mumbai Web3',
    startDate: '2025-09-05',
    endDate: '2025-09-06',
    location: 'Mumbai, India',
    prizePool: '5,000 USDC',
    participants: 75,
    maxParticipants: 120,
    image: '/ensure.png',
    tags: ['NFT', 'Gaming'],
    short: 'Weekend sprint with focused tracks.',
  },
  {
    id: 6,
    title: 'ENS Builders Jam',
    organizer: 'ENS',
    startDate: '2025-12-10',
    endDate: '2025-12-12',
    location: 'Online',
    prizePool: '7,500 USDC',
    participants: 42,
    maxParticipants: 150,
    image: '/ensure.png',
    tags: ['ENS', 'Identity'],
    short: 'Naming, profiles, and identity UX.',
  },
];

function statusFor(startISO: string, endISO: string, now = new Date()): Status {
  const start = new Date(startISO);
  const end = new Date(endISO);
  if (now < start) return 'upcoming';
  if (now > end) return 'ended';
  return 'ongoing';
}

function formatRange(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  return `${s.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

/** Component to fetch individual event data */
function EventDataFetcher({ eventId, onData }: { eventId: number; onData: (data: any) => void }) {
  const { data, isLoading, error } = useReadContract({
    address: PRIZE_ESCROW_ADDR,
    abi: PRIZE_ESCROW_ABI,
    functionName: 'getEvent',
    args: [BigInt(eventId)],
    query: { enabled: true },
  });

  useEffect(() => {
    if (data && Array.isArray(data)) {
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

      const eventData = {
        id: eventId,
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

      onData(eventData);
    }
  }, [data, eventId, onData]);

  return null;
}

export default function EventsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [query, setQuery] = useState('');
  const [realEvents, setRealEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Gate: must be connected (removed Self verification requirement)
  useEffect(() => {
    if (!isConnected || !address) {
      router.replace('/');
      return;
    }
    // Commented out Self verification check as requested
    // const ok = localStorage.getItem(`ensure:verified:${address.toLowerCase()}`) === '1';
    // if (!ok) {
    //   router.replace('/verify');
    //   return;
    // }
    setReady(true);
  }, [isConnected, address, router]);

  // Fetch real events from blockchain and localStorage
  useEffect(() => {
    if (!ready) return;
    
    const fetchEvents = async () => {
      setLoadingEvents(true);
      const events: any[] = [];
      
      // Check events 1-50 for localStorage metadata
      for (let i = 1; i <= 50; i++) {
        try {
          const metadata = getEventMetadata(i);
          if (metadata) {
            events.push({
              id: i,
              ...metadata,
              isRealEvent: true,
            });
          }
        } catch (error) {
          console.error(`Error fetching event ${i}:`, error);
        }
      }
      
      // Add some mock events for demonstration if no real events
      const combinedEvents = events.length > 0 ? events : mockEvents.slice(0, 3);
      
      setRealEvents(combinedEvents);
      setLoadingEvents(false);
    };

    fetchEvents();
    
    // Listen for new events created (from localStorage changes)
    const handleStorageChange = () => {
      fetchEvents();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for new events
    const interval = setInterval(fetchEvents, 10000); // Check every 10 seconds
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [ready]);

  const computed = useMemo(() => {
    const now = new Date();
    
    // Transform real events to match EventCard format
    const transformedEvents = realEvents.map((e) => {
      // For real events, calculate status based on deadlines
      let status: Status = 'upcoming';
      if (e.finalized || e.canceled) {
        status = 'ended';
      } else if (e.registerDeadline && e.finalizeDeadline) {
        const regDeadline = new Date(e.registerDeadline * 1000);
        const finDeadline = new Date(e.finalizeDeadline * 1000);
        
        if (now > finDeadline) {
          status = 'ended';
        } else if (now > regDeadline) {
          status = 'ongoing';
        }
      }
      
      return {
        id: e.id,
        title: e.title || e.eventName || `Event #${e.id}`,
        organizer: e.organizer || 'Unknown',
        startDate: e.registerDeadline ? new Date(e.registerDeadline * 1000).toISOString().split('T')[0] : '2025-01-01',
        endDate: e.finalizeDeadline ? new Date(e.finalizeDeadline * 1000).toISOString().split('T')[0] : '2025-01-15',
        location: e.location || 'Online',
        prizePool: e.prizeRemaining ? `${formatEther(e.prizeRemaining)} ${tokenLabel(e.token)}` : '0 tRBTC',
        participants: 0, // TODO: Get from contract
        maxParticipants: 1000,
        image: e.image || '/ensure.png',
        tags: e.tags || [tokenLabel(e.token), e.scope || 'Blockchain'],
        short: e.description || e.short || `Event #${e.id} on Rootstock`,
        _status: status,
        isRealEvent: e.isRealEvent || false,
        eventData: e, // Keep original blockchain data
      };
    });
    
    return transformedEvents
      .filter((e) => {
        // filter by status
        const passStatus = filter === 'all' ? true : e._status === filter;
        // search across title, organizer, location, tags
        const q = query.trim().toLowerCase();
        const passQuery = !q
          ? true
          : [e.title, e.organizer, e.location, ...(e.tags || [])]
              .join(' ')
              .toLowerCase()
              .includes(q);
        return passStatus && passQuery;
      })
      // sort: ongoing first, then upcoming by start date asc, then ended by end date desc
      .sort((a, b) => {
        const order = { ongoing: 0, upcoming: 1, ended: 2 } as const;
        if (order[a._status] !== order[b._status]) return order[a._status] - order[b._status];
        if (a._status === 'upcoming' && b._status === 'upcoming') {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        if (a._status === 'ended' && b._status === 'ended') {
          return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
        }
        // fallback by start date
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });
  }, [filter, query, realEvents]);

  if (!ready) {
    return (
      <div style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
        <Header />
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl animate-pulse"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
      <Header />

      {/* Page header / controls */}
      <section className="border-b border-white/10" style={{ backgroundColor: '#0F1426' }}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-white">Events</h1>
              <p className="mt-1 text-white/70">Discover and participate in human-verified Web3 events</p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div
                className="rounded-2xl px-4 py-2.5"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events, organizers, locations…"
                  className="w-72 bg-transparent text-sm text-white placeholder-white/50 outline-none"
                />
              </div>

              <div className="flex gap-2">
                {(['all', 'ongoing', 'upcoming', 'ended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className="rounded-xl px-3 py-2 text-sm font-semibold transition"
                    style={
                      filter === s
                        ? { backgroundColor: BRAND.primary, color: BRAND.base }
                        : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)' }
                    }
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              <Link
                href="/events/create"
                className="rounded-2xl px-5 py-2.5 font-semibold shadow hover:opacity-95 text-center"
                style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
              >
                Create Event
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Events grid */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {loadingEvents ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="text-4xl animate-spin">⏳</div>
            <h3 className="mt-3 text-lg font-semibold text-white">Loading events...</h3>
            <p className="mt-1 text-white/70">Fetching events from blockchain</p>
          </div>
        ) : computed.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="text-4xl">🎫</div>
            <h3 className="mt-3 text-lg font-semibold text-white">No events found</h3>
            <p className="mt-1 text-white/70">Create your first event to get started!</p>
            <Link
              href="/events/create"
              className="mt-4 inline-flex items-center justify-center rounded-2xl px-6 py-3 font-semibold text-white"
              style={{ backgroundColor: BRAND.primary }}
            >
              Create Event
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {computed.map((e) => (
              <article
                key={e.id}
                className="overflow-hidden rounded-2xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                {/* Cover */}
                <div className="relative h-36 w-full">
                  <div className="absolute right-3 top-3 z-10">
                    <StatusPill status={e._status as Status} />
                  </div>
                  <div className="absolute inset-0">
                    {/* simple image holder; replace with organizer art later */}
                    <div className="grid h-full w-full place-items-center bg-white/[0.03]">
                      <Image src={e.image || '/ensure.png'} alt={e.title} width={64} height={64} className="rounded-lg opacity-90" />
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-white">{e.title}</h3>
                      <p className="mt-0.5 text-sm text-white/70">by {e.organizer}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/60">Prize Pool</div>
                      <div className="font-semibold text-white">{e.prizePool}</div>
                    </div>
                  </div>

                  {e.short && <p className="mt-3 line-clamp-2 text-sm text-white/75">{e.short}</p>}

                  {/* Meta */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <MetaChip label="Dates" value={formatRange(e.startDate, e.endDate)} />
                    <MetaChip label="Location" value={e.location} />
                  </div>

                  {/* Participants */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Participants</span>
                      <span className="font-medium text-white/80">
                        {e.participants}/{e.maxParticipants}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((e.participants / Math.max(1, e.maxParticipants)) * 100))}%`,
                          backgroundColor: BRAND.primary,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  {e.tags && e.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {e.tags.map((t: string) => (
                        <span
                          key={t}
                          className="rounded-lg px-2 py-1 text-xs"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.12)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex items-center gap-2">
                    <Link
                      href={`/events/${e.id}`}
                      className="flex-1 rounded-xl border px-3 py-2 text-center text-sm font-semibold text-white hover:bg-white/10"
                      style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                    >
                      View Details
                    </Link>
                    <button
                      className="rounded-xl px-3 py-2 text-sm font-semibold shadow hover:opacity-95"
                      style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                    >
                      Join
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      
      <Footer />
    </div>
  );
}

/* ---------- little presentational helpers ---------- */

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { text: string; bg: string; border: string; fg: string }> = {
    ongoing: {
      text: 'Ongoing',
      bg: 'rgba(41,98,255,0.18)',
      border: 'rgba(255,255,255,0.14)',
      fg: '#FFFFFF',
    },
    upcoming: {
      text: 'Upcoming',
      bg: 'rgba(255,255,255,0.08)',
      border: 'rgba(255,255,255,0.14)',
      fg: '#FFFFFF',
    },
    ended: {
      text: 'Ended',
      bg: 'rgba(255,255,255,0.06)',
      border: 'rgba(255,255,255,0.10)',
      fg: 'rgba(255,255,255,0.80)',
    },
  };

  const s = map[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.fg }}
    >
      {s.text}
    </span>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.12)' }}
    >
      <div className="text-[11px] uppercase tracking-wide text-white/55">{label}</div>
      <div className="mt-0.5 text-white/90">{value}</div>
    </div>
  );
}
