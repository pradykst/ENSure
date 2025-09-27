'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useEnsName, useEnsAvatar, useEnsText } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { createPortal } from 'react-dom';

const sora = Sora({ subsets: ['latin'] });

/** Brand palette */
const BRAND = {
  primary: '#2962FF',   // Deep Ethereum Blue
  secondary: '#651FFF', // Deep Violet (unused here)
  accent: '#00E5FF',    // Electric Cyan
  base: '#FFFFFF',
  dark: '#1A1A2E',
};

type Position = 1 | 2 | 3 | undefined;
type AttendedEvent = {
  id: number;
  title: string;
  org: string;
  date: string;
  prize?: string;
  position?: Position;
};

const truncate = (addr?: string, size = 4) =>
  addr ? `${addr.slice(0, 2 + size)}…${addr.slice(-size)}` : '';

/* ----------------------- Small presentational bits ---------------------- */

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

/* -------------------------- Tilted NFT preview -------------------------- */

function TiltedNFTCard({ src, alt }: { src: string; alt?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;   // 0..1
    const py = (e.clientY - rect.top) / rect.height;   // 0..1
    const rx = (py - 0.5) * 10; // rotateX
    const ry = (0.5 - px) * 10; // rotateY
    el.style.setProperty('--rx', `${rx}deg`);
    el.style.setProperty('--ry', `${ry}deg`);
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', `0deg`);
    el.style.setProperty('--ry', `0deg`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className="relative mx-auto aspect-square w-full max-w-sm rounded-2xl"
      style={{
        transform: 'perspective(1000px) rotateX(var(--rx,0)) rotateY(var(--ry,0))',
        transition: 'transform 120ms ease',
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
      }}
    >
      <div className="absolute inset-0 rounded-2xl overflow-hidden">
        <Image src={src} alt={alt || 'NFT'} fill className="object-cover" />
        {/* glow that follows the cursor */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(400px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.10), transparent 40%)',
            mixBlendMode: 'screen',
          }}
        />
      </div>
      {/* subtle bottom plate */}
      <div
        className="absolute -inset-x-6 -bottom-6 h-10 rounded-[20px] blur-2xl"
        style={{ backgroundColor: 'rgba(41,98,255,0.25)', opacity: 0.5 }}
      />
    </div>
  );
}

/* -------------------------------- Modal -------------------------------- */

function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-3xl rounded-3xl p-6 md:p-8"
        style={{ backgroundColor: '#121628', border: '1px solid rgba(255,255,255,0.12)' }}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-1.5 text-sm text-white/80 hover:bg-white/[0.06]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------ Main page ------------------------------ */

export default function ProfilePage() {
  const { address } = useAccount();

  // ENS with fallback strategy (Sepolia -> Mainnet)
  const { data: ensSepolia } = useEnsName({ address, chainId: sepolia.id });
  const { data: ensMainnet } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: !ensSepolia },
  });
  const ensName = ensSepolia ?? ensMainnet;

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: ensSepolia ? sepolia.id : mainnet.id,
  });

  // Common ENS text records (fallback to where name came from)
  const chainIdForText = ensSepolia ? sepolia.id : mainnet.id;
  const { data: bio } = useEnsText({ name: ensName ?? undefined, key: 'description', chainId: chainIdForText });
  const { data: website } = useEnsText({ name: ensName ?? undefined, key: 'url', chainId: chainIdForText });
  const { data: twitter } = useEnsText({ name: ensName ?? undefined, key: 'com.twitter', chainId: chainIdForText });
  const { data: github } = useEnsText({ name: ensName ?? undefined, key: 'com.github', chainId: chainIdForText });
  const { data: email } = useEnsText({ name: ensName ?? undefined, key: 'email', chainId: chainIdForText });

  // Demo data
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

  // verified badge via your verify flow
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (address) {
      const v = localStorage.getItem(`ensure:verified:${address.toLowerCase()}`) === '1';
      setVerified(v);
    }
  }, [address]);

  /* -------- modal state + nft metadata mapping (dummy for now) -------- */

  type NftMeta = {
    image: string;
    tokenId: string;
    contract?: `0x${string}`;
    chain: 'rootstock-testnet' | 'sepolia';
  };

  const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_CONTRACT as `0x${string}` | undefined;

  const nftByEvent: Record<number, NftMeta> = {
    1: { image: '/nfts/1.png', tokenId: '0', contract: NFT_CONTRACT, chain: 'rootstock-testnet' },
    2: { image: '/nfts/2.png', tokenId: '1', contract: NFT_CONTRACT, chain: 'rootstock-testnet' },
    3: { image: '/nfts/3.png', tokenId: '2', contract: NFT_CONTRACT, chain: 'rootstock-testnet' },
    4: { image: '/nfts/4.png', tokenId: '3', contract: NFT_CONTRACT, chain: 'rootstock-testnet' },
    5: { image: '/nfts/4.png', tokenId: '7', contract: NFT_CONTRACT, chain: 'rootstock-testnet' },
  };

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AttendedEvent | null>(null);

  const openDetails = (e: AttendedEvent) => {
    setSelected(e);
    setOpen(true);
  };

  const explorerFor = (meta: NftMeta) => {
    const base =
      meta.chain === 'rootstock-testnet'
        ? 'https://explorer.testnet.rootstock.io/address/0x4Ae9Dba99b907F6c48CD3Ec8C834181110A457dD'
        : 'https://sepolia.etherscan.io';
    if (meta.contract) {
      // generic address page; customize to a token route if you deploy a real NFT
      return `${base}/address/${meta.contract}`;
    }
    return base;
  };

  return (
    <div className={sora.className} style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
      <Header variant="default" />

      <main className="mx-auto max-w-7xl px-6">
        {/* Profile header */}
        <section className="py-12 md:py-16">
          <div
            className="rounded-3xl p-6 md:p-8"
            style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}
          >
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
              {/* Avatar */}
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-2 ring-white/15">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="ENS avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
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

                {bio && <p className="mt-3 max-w-2xl text-white/80">{bio}</p>}
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
            <div className="rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <div className="text-sm text-white/60">Events Joined</div>
              <div className="mt-1 text-3xl font-extrabold text-white">{totalJoined}</div>
            </div>
            <div className="rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <div className="text-sm text-white/60">Events Won</div>
              <div className="mt-1 text-3xl font-extrabold text-white">{totalWon}</div>
            </div>
            <div className="rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
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
            <div className="rounded-2xl p-6 text-center text-white/70" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
              No events yet. Join your first one from the Events page!
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <div key={e.id} className="rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-white/60">{e.org}</div>
                      <h3 className="mt-0.5 text-lg font-semibold text-white">{e.title}</h3>
                    </div>
                    <PositionBadge pos={e.position} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl px-3 py-2" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-white/60 text-xs">Date</div>
                      <div className="text-white">{e.date}</div>
                    </div>
                    <div className="rounded-xl px-3 py-2" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-white/60 text-xs">Prize</div>
                      <div className="text-white">{e.prize || '—'}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => openDetails(e)}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                    >
                      View details
                    </button>
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
      <Footer />

      {/* Details modal */}
      <Modal
        open={open && !!selected}
        onClose={() => setOpen(false)}
        title={selected ? `${selected.title} — details` : undefined}
      >
        {selected && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tilted NFT */}
            <div>
              <TiltedNFTCard
                src={nftByEvent[selected.id]?.image || '/ensure.png'}
                alt={`${selected.title} NFT`}
              />
            </div>

            {/* Right column info */}
            <div className="flex flex-col">
              <div className="rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs text-white/60">Organizer</div>
                <div className="text-white font-semibold">{selected.org}</div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl px-3 py-2" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-white/60 text-xs">Date</div>
                    <div className="text-white">{selected.date}</div>
                  </div>
                  <div className="rounded-xl px-3 py-2" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                    <div className="text-white/60 text-xs">Prize</div>
                    <div className="text-white">{selected.prize || '—'}</div>
                  </div>
                </div>
                <div className="mt-3">{selected.position && <PositionBadge pos={selected.position} />}</div>
              </div>

              {/* Token row */}
              <div className="mt-4 rounded-2xl p-4" style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-xs text-white/60 mb-1">NFT</div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg px-2.5 py-1.5 text-sm font-mono text-white" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    Token #{nftByEvent[selected.id]?.tokenId ?? '—'}
                  </div>
                  <button
                    onClick={() => {
                      const tid = nftByEvent[selected.id]?.tokenId ?? '';
                      navigator.clipboard?.writeText(tid);
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-sm text-white/85 hover:bg-white/[0.06]"
                    style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    Copy
                  </button>
                  <a
                    href={explorerFor(nftByEvent[selected.id] ?? { image: '', tokenId: '', chain: 'rootstock-testnet' })}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg px-2.5 py-1.5 text-sm font-semibold shadow hover:opacity-95"
                    style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                  >
                    View on chain ↗
                  </a>
                </div>
                <div className="mt-2 text-[11px] text-white/55">
                  {nftByEvent[selected.id]?.chain === 'rootstock-testnet' ? 'Rootstock Testnet' : 'Sepolia'}
                  {nftByEvent[selected.id]?.contract ? ` • ${nftByEvent[selected.id]?.contract}` : ''}
                </div>
              </div>

              {/* CTA row */}
              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/events/${selected.id}`}
                  className="rounded-2xl border px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                >
                  Go to event page
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-4 py-2.5 text-sm font-semibold"
                  style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
