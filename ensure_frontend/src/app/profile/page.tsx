'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useEnsName, useEnsAvatar, useEnsText } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';
import { Header } from '@/components/Header';


const sora = Sora({ subsets: ['latin'] });

/** Brand palette */
const BRAND = {
  primary: '#2962FF',   // Deep Ethereum Blue
  secondary: '#651FFF', // Deep Violet
  accent: '#00E5FF',    // Electric Cyan
  base: '#FFFFFF',
  dark: '#1A1A2E',
};

type Position = 1 | 2 | 3 | undefined;
type AttendedEvent = {
  id: number;
  title: string;
  org: string;
  date: string;        // ISO or human
  prize?: string;
  position?: Position; // 1/2/3 = winner place, undefined = participated
};

const truncate = (addr?: string, size = 4) =>
  addr ? `${addr.slice(0, 2 + size)}…${addr.slice(-size)}` : '';

/** Small badge for position */
function PositionBadge({ pos }: { pos?: Position }) {
  if (!pos) return null;
  const map = {
    1: { label: '1st', emoji: '🥇', bg: 'rgba(255,215,0,0.12)', ring: '#FFD700' },
    2: { label: '2nd', emoji: '🥈', bg: 'rgba(192,192,192,0.12)', ring: '#C0C0C0' },
    3: { label: '3rd', emoji: '🥉', bg: 'rgba(205,127,50,0.12)', ring: '#CD7F32' },
  } as const;
  const s = map[pos];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: s.bg,
        border: `1px solid ${s.ring}55`,
        color: '#fff',
      }}
    >
      <span>{s.emoji}</span>
      {s.label}
    </span>
  );
}

/** ENS text record row */
function TextRow({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  const Inner = (
    <>
      <span className="text-white/60">{label}</span>
      <span className="text-white">{value}</span>
    </>
  );
  return (
    <div
      className="flex items-center justify-between rounded-xl px-3 py-2"
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.03)',
      }}
    >
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="w-full flex items-center justify-between">
          {Inner}
        </a>
      ) : (
        Inner
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();

  // ENS with fallback strategy (Sepolia -> Mainnet)
  const { data: ensSepolia } = useEnsName({
    address,
    chainId: sepolia.id,
  });
  const { data: ensMainnet } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: !ensSepolia }, // only if sepolia has no record
  });
  const ensName = ensSepolia ?? ensMainnet;

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: ensSepolia ? sepolia.id : mainnet.id,
  });

  // Common ENS text records with fallback
  const { data: bio } = useEnsText({ 
    name: ensName ?? undefined, 
    key: 'description', 
    chainId: ensSepolia ? sepolia.id : mainnet.id 
  });
  const { data: website } = useEnsText({ 
    name: ensName ?? undefined, 
    key: 'url', 
    chainId: ensSepolia ? sepolia.id : mainnet.id 
  });
  const { data: twitter } = useEnsText({ 
    name: ensName ?? undefined, 
    key: 'com.twitter', 
    chainId: ensSepolia ? sepolia.id : mainnet.id 
  });
  const { data: github } = useEnsText({ 
    name: ensName ?? undefined, 
    key: 'com.github', 
    chainId: ensSepolia ? sepolia.id : mainnet.id 
  });
  const { data: email } = useEnsText({ 
    name: ensName ?? undefined, 
    key: 'email', 
    chainId: ensSepolia ? sepolia.id : mainnet.id 
  });

  // Demo data: replace with your backend later
  const events: AttendedEvent[] = useMemo(
    () => [
      { id: 1, title: 'ETH Delhi Hackathon', org: 'ETHGlobal', date: '2024-01-17', prize: 'Ξ 50,000', position: 2 },
      { id: 2, title: 'Rootstock Innovation Challenge', org: 'Rootstock', date: '2024-02-03', prize: '₿ 2.5', position: 1 },
      { id: 3, title: 'Self Protocol Identity Hack', org: 'Self', date: '2024-03-20', prize: '$ 10,000', position: 3 },
      { id: 4, title: 'Open DeFi Builders', org: 'OpenDeFi', date: '2024-05-11' },
      { id: 5, title: 'ENS Mini Build', org: 'ENS', date: '2024-06-08' },
    ],
    []
  );

  const totalJoined = events.length;
  const totalWon = events.filter((e) => !!e.position).length;

  // local verified tick from your app’s verify flow
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (address) {
      const v = localStorage.getItem(`ensure:verified:${address.toLowerCase()}`) === '1';
      setVerified(v);
    }
  }, [address]);

  return (
    <div className={sora.className} style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
      {/* Header (same style as home/verify) */}
      <Header variant="default" />


      <main className="mx-auto max-w-7xl px-6">
        {/* Profile header */}
        <section className="py-12 md:py-16">
          <div
            className="rounded-3xl p-6 md:p-8"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          >
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
              {/* Avatar */}
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-white/15">
                {avatarUrl ? (
                  // next/image would need remotePatterns; use <img> for any remote avatar
                  <img
                    src={avatarUrl}
                    alt="ENS avatar"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-3xl font-bold"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: BRAND.base }}
                  >
                    {(ensName || address || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                    {ensName || truncate(address, 4) || '—'}
                  </h1>
                  {verified && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        color: BRAND.base,
                        border: '1px solid rgba(255,255,255,0.14)',
                        backgroundColor: 'rgba(0,229,255,0.15)',
                      }}
                      title="Verified with Self"
                    >
                      ✓ Verified
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-white/60">
                  {address ? truncate(address, 6) : 'Connect wallet to view profile'}
                </div>

                {bio && (
                  <p className="mt-3 max-w-2xl text-white/80">{bio}</p>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/events"
                  className="inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                >
                  Browse events
                </Link>
                <Link
                  href="/events/create"
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold shadow hover:opacity-95"
                  style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                >
                  Host event
                </Link>
              </div>
            </div>

            {/* ENS text records */}
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <TextRow label="Website" value={website ?? undefined} href={website ?? undefined} />
              <TextRow label="Twitter" value={twitter ? `@${twitter}` : undefined} href={twitter ? `https://twitter.com/${twitter}` : undefined} />
              <TextRow label="GitHub" value={github ?? undefined} href={github ? `https://github.com/${github}` : undefined} />
              <TextRow label="Email" value={email ?? undefined} href={email ? `mailto:${email}` : undefined} />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div
              className="rounded-2xl p-5"
              style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="text-sm text-white/60">Events Joined</div>
              <div className="mt-1 text-3xl font-extrabold text-white">{totalJoined}</div>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="text-sm text-white/60">Events Won</div>
              <div className="mt-1 text-3xl font-extrabold text-white">{totalWon}</div>
            </div>
            <div
              className="rounded-2xl p-5"
              style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="text-sm text-white/60">Trust Score</div>
              <div className="mt-1 text-3xl font-extrabold" style={{ color: BRAND.accent }}>
                {verified ? '100%' : '—'}
              </div>
            </div>
          </div>
        </section>

        {/* Events list */}
        <section className="pb-20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold text-white">Your Events</h2>
            <Link href="/events" className="text-sm text-white/70 hover:text-white">See all</Link>
          </div>

          {events.length === 0 ? (
            <div
              className="rounded-2xl p-6 text-center text-white/70"
              style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              No events yet. Join your first one from the Events page!
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="rounded-2xl p-5"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-white/60">{e.org}</div>
                      <h3 className="mt-0.5 text-lg font-semibold text-white">{e.title}</h3>
                    </div>
                    <PositionBadge pos={e.position} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div
                      className="rounded-xl px-3 py-2"
                      style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="text-white/60 text-xs">Date</div>
                      <div className="text-white">{e.date}</div>
                    </div>
                    <div
                      className="rounded-xl px-3 py-2"
                      style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}
                    >
                      <div className="text-white/60 text-xs">Prize</div>
                      <div className="text-white">{e.prize || '—'}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      href={`/events/${e.id}`}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                    >
                      View details
                    </Link>
                    {!!e.position && (
                      <span
                        className="rounded-xl px-3 py-2 text-sm font-semibold"
                        style={{ backgroundColor: 'rgba(41,98,255,0.16)', border: '1px solid rgba(255,255,255,0.14)', color: BRAND.base }}
                      >
                        Trophy ready 🏆
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-10" style={{ backgroundColor: '#0F1426' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="relative h-6 w-6 overflow-hidden rounded-md ring-1 ring-white/10">
              <Image src="/ensure.png" alt="ENSure logo" fill className="object-cover" />
            </div>
            <span className="text-sm font-semibold text-white/85">ENSure</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/privacy" className="text-white/70 hover:text-white">Privacy</Link>
            <Link href="/terms" className="text-white/70 hover:text-white">Terms</Link>
            <Link href="/contact" className="text-white/70 hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
