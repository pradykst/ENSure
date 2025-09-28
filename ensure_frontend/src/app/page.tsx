'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Sora } from 'next/font/google';
import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WalletConnectMenu as WalletConnectMenuComponent } from '@/components/WalletConnectMenu';

const sora = Sora({ subsets: ['latin'] });

/** Brand (uniform colors only) */
const BRAND = {
  primary: '#2962FF',   // Deep Ethereum Blue
  secondary: '#651FFF', // Deep Violet
  accent: '#00E5FF',    // Electric Cyan
  base: '#FFFFFF',
  dark: '#1A1A2E',      // Digital Dark Grey
};



export default function Home() {
  const { address, isConnected } = useAccount();
  const [bootRedirected, setBootRedirected] = useState(false);

  // Boot redirect: /events if connected (removed Self verification requirement)
  useEffect(() => {
    if (!isConnected || !address || bootRedirected) return;
    // Commented out Self verification check as requested
    // const v = localStorage.getItem(`ensure:verified:${address.toLowerCase()}`);
    // const target = v === '1' ? '/events' : '/verify';
    const target = '/events'; // Always redirect to events page
    const t = setTimeout(() => {
      window.location.assign(target);
    }, 350);
    setBootRedirected(true);
    return () => clearTimeout(t);
  }, [isConnected, address, bootRedirected]);

  return (
    <div
      className={sora.className}
      style={{
        backgroundColor: BRAND.dark,
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <Header variant="home" />

      {/* hero */}
      <main className="mx-auto max-w-7xl px-6">
        <section className="py-8 md:py-12">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: 'rgba(255,255,255,0.14)',
                  color: BRAND.base,
                  backgroundColor: 'rgba(41,98,255,0.16)', // primary tint
                }}
              >
                Human-first Web3 Events
              </div>

              <h1 className="mt-4 text-4xl md:text-6xl font-extrabold leading-[1.1] text-white">
                Luma-style events with
                <span className="block">sybil-resistance & trustless prizes.</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg text-white/75">
                Connect your wallet, verify with Self (≥18), and join events where prize pools
                are locked in Rootstock escrow and auto-paid to winners. Profiles pick your ENS
                name and avatar on connect.
              </p>

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/events/create"
                  className="inline-flex items-center justify-center rounded-2xl px-6 py-3.5 font-semibold shadow hover:opacity-95"
                  style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                >
                  Host your event ↗
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex items-center justify-center rounded-2xl border px-6 py-3.5 font-semibold text-white hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                >
                  Verify & join
                </Link>
              </div>

              {/* partners strip */}
              <div className="mt-10 flex flex-wrap items-center gap-6">
                <BadgePill label="Rootstock Testnet" color={BRAND.primary} />
                <BadgePill label="Self Protocol (ZK)" color={BRAND.secondary} />
                <BadgePill label="ENS Profiles" color={BRAND.accent} />
              </div>
            </div>

            {/* side panel card */}
            <div className="relative">
              <div
                className="absolute -inset-1 rounded-3xl opacity-30 blur-3xl"
                style={{
                  backgroundColor: BRAND.primary,
                  filter: 'blur(80px)',
                }}
              />
              <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/85">Event Escrow</span>
                  <span
                    className="rounded-full px-3 py-1 text-xs"
                    style={{
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: BRAND.base,
                      backgroundColor: 'rgba(101,31,255,0.16)', // secondary tint
                    }}
                  >
                    Rootstock • tRBTC
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoTile label="Prize Pool" value="$10,000 (locked)" stripe={BRAND.primary} />
                  <InfoTile label="Verification" value="Self (≥18, ZK)" stripe={BRAND.accent} />
                  <InfoTile label="Winners" value="Auto-payouts" stripe={BRAND.secondary} />
                  <InfoTile label="Profiles" value="ENS avatar + name" stripe={BRAND.base} />
                </div>

                <div
                  className="mt-6 rounded-2xl p-4 text-sm text-white/75"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' }}
                >
                  Create an event, lock funds in escrow, verify participants, judge, then finalize to
                  stream prizes to winners—no spreadsheets, no trust assumptions.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="pb-14">
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon="🔐"
              title="Sybil-resistant signups"
              text="Self Protocol proofs ensure real people (and ≥18) without exposing personal data."
            />
            <FeatureCard
              icon="🔒"
              title="Escrowed prize pools"
              text="Organizers lock funds up-front on Rootstock testnet. Payouts are programmatic."
            />
            <FeatureCard
              icon="🏷"
              title="ENS-powered profiles"
              text="Fetch ENS name & avatar on connect. Winners can optionally mint trophies."
            />
          </div>
        </section>

        {/* how it works */}
        <section id="how" className="pb-24">
          <ol className="grid gap-5 md:grid-cols-3">
            <StepCard n={1} title="Connect" text="Link your wallet (Rootstock testnet preferred)." />
            <StepCard n={2} title="Verify" text="Scan the Self QR to prove personhood & age (≥18)." />
            <StepCard n={3} title="Compete & win" text="Join events. Judges finalize. Prizes flow trustlessly." />
          </ol>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

/** UI atoms */

function BadgePill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-xs font-medium"
      style={{
        color: BRAND.base,
        border: '1px solid rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        boxShadow: `inset 0 0 0 1px ${color}22`,
      }}
    >
      {label}
    </span>
  );
}

function InfoTile({
  label,
  value,
  stripe,
}: {
  label: string;
  value: string;
  stripe: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.03)',
      }}
    >
      <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-semibold text-white">{value}</span>
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: stripe }}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div
      className="rounded-3xl p-6 shadow-2xl"
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/75">{text}</p>
    </div>
  );
}

function StepCard({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li
      className="relative rounded-3xl p-6"
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="absolute -top-3 left-4 rounded-full px-3 py-1 text-xs"
        style={{
          border: '1px solid rgba(255,255,255,0.14)',
          color: BRAND.base,
          backgroundColor: 'rgba(0,229,255,0.15)', // accent tint
        }}
      >
        Step {n}
      </div>
      <h4 className="mt-3 text-base font-semibold text-white">{title}</h4>
      <p className="mt-2 text-sm text-white/75">{text}</p>
    </li>
  );
}
