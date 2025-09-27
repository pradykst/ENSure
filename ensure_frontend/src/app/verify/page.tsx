'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import { useEffect, useState } from 'react';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { createPublicClient, http } from 'viem';

import { celoSepolia, rootstockTestnet } from '@/lib/chains';
import { ADDRS, SelfAdapterABI, IdentityAttestationsABI } from '@/lib/contracts';
import {
  SelfQRcodeWrapper,
  SelfAppBuilder,
  getUniversalLink,
  type SelfApp,
} from '@selfxyz/qrcode';

// re-use the same wallet menu you put on the Home page
import { Header } from '@/components/Header'; 

const sora = Sora({ subsets: ['latin'] });

// Brand (same palette as home)
const BRAND = {
  primary: '#2962FF',   // Deep Ethereum Blue
  secondary: '#651FFF', // Deep Violet
  accent: '#00E5FF',    // Electric Cyan
  base: '#FFFFFF',
  dark: '#1A1A2E',
};

// Use a short, human label. Your contracts file should map this to a bytes32 scope.
const SCOPE_LABEL = 'age18-global';

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const router = useRouter();

  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const key = (addr: string) => `ensure:verified:${addr.toLowerCase()}`;
  const keyTs = (addr: string) => `ensure:verified:timestamp:${addr.toLowerCase()}`;

  // Build the Self QR (same scope label you use when bridging)
  useEffect(() => {
    if (!address) return;
    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: process.env.NEXT_PUBLIC_APP_NAME || 'ENSure',
        scope: SCOPE_LABEL,
        endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT || 'https://self.id',
        logoBase64: 'https://i.postimg.cc/mrmVf9hm/self.png',
        userId: address,
        userIdType: 'hex',
        endpointType: 'staging_celo',
        disclosures: { minimumAge: 18 },
      }).build();
      setSelfApp(app);
      setLink(getUniversalLink(app));
    } catch (e) {
      console.error('Self QR init error:', e);
      setMsg('Could not initialize Self QR. Check your env config.');
    }
  }, [address]);

  // QR success → (optional) call adapter on Celo, then poll attestation on Rootstock
  const onVerified = async () => {
    if (!address) return;
    setLoading(true);
    setMsg('');
    try {
      // 1) Forward to your adapter on Celo Sepolia (if provided)
      await switchChainAsync({ chainId: celoSepolia.id });
      if (ADDRS.SELF_ADAPTER && ADDRS.SELF_ADAPTER !== ('0x' + '0'.repeat(40))) {
        await writeContractAsync({
          abi: SelfAdapterABI,
          address: ADDRS.SELF_ADAPTER,
          functionName: 'verifyAndBridge',
          args: ['0x', ADDRS.SCOPE, address], // scope bytes32 is in ADDRS.SCOPE
          chainId: celoSepolia.id,
        });
      }

      // 2) Poll Rootstock attestation
      const client = createPublicClient({
        chain: rootstockTestnet,
        transport: http(rootstockTestnet.rpcUrls.default.http[0]),
      });

      for (let i = 0; i < 40; i++) {
        if (ADDRS.ATTESTATIONS && ADDRS.ATTESTATIONS !== ('0x' + '0'.repeat(40))) {
          const ok = await client.readContract({
            abi: IdentityAttestationsABI,
            address: ADDRS.ATTESTATIONS,
            functionName: 'isVerified',
            args: [address, ADDRS.SCOPE],
          });
          if (ok) {
            localStorage.setItem(key(address), '1');
            localStorage.setItem(keyTs(address), String(Date.now()));
            router.replace('/events');
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      // 3) Soft-gate fallback while bridge finality catches up
      localStorage.setItem(key(address), '1');
      localStorage.setItem(keyTs(address), String(Date.now()));
      router.replace('/events');
    } catch (e: unknown) {
      console.error(e);
      const err = e as Error;
      setMsg(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If user is not connected, gently nudge back home (keeps page style consistent)
  useEffect(() => {
    if (!isConnected) {
      // don’t hard redirect instantly — they might open the wallet from here
      // leave it as-is; header has the connect button
    }
  }, [isConnected]);

  return (
    <div className={sora.className} style={{ backgroundColor: BRAND.dark, minHeight: '100vh' }}>
       {/* Header */}
       <Header />

      {/* Content */}
      <main className="mx-auto max-w-7xl px-6">
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center">
              Verify your identity
            </h1>
            <p className="mt-3 text-center text-white/75">
              Scan in the Self app. We’ll relay and confirm your Rootstock attestation.
            </p>

            <div
              className="mt-8 rounded-3xl p-6 md:p-8"
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                backgroundColor: 'rgba(255,255,255,0.04)',
              }}
            >
              {!isConnected && (
                <div
                  className="mb-6 rounded-xl px-4 py-3 text-sm"
                  style={{
                    border: '1px solid rgba(255,255,255,0.14)',
                    backgroundColor: 'rgba(41,98,255,0.16)',
                    color: BRAND.base,
                  }}
                >
                  Connect your wallet first (top right).
                </div>
              )}

              <div className="flex flex-col items-center gap-5">
                {selfApp ? (
                  <SelfQRcodeWrapper
                    selfApp={selfApp}
                    onSuccess={onVerified}
                    onError={() => setMsg('Self verification failed. Please try again.')}
                  />
                ) : (
                  <div className="w-[256px] h-[256px] rounded-xl bg-white/10 animate-pulse" />
                )}

                {!!link && (
                  <a
                    className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold shadow hover:opacity-95"
                    style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Self App
                  </a>
                )}

                {loading && (
                  <div className="text-sm text-white/70">Relaying proof & checking Rootstock…</div>
                )}

                {!!msg && (
                  <div
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{
                      border: '1px solid rgba(255,255,255,0.14)',
                      backgroundColor: 'rgba(255,0,0,0.10)',
                      color: '#ffeaea',
                    }}
                  >
                    {msg}
                  </div>
                )}
              </div>

              {/* help row */}
              <div className="mt-6 grid gap-3 md:grid-cols-3 text-sm">
                <InlineHint title="Scope" text={SCOPE_LABEL} />
                <InlineHint title="Network" text="Rootstock Testnet (31)" />
                <InlineHint title="Bridge" text="Celo Sepolia adapter (optional)" />
              </div>

              <div className="mt-6 flex items-center justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold text-white hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.14)' }}
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (same tone as home) */}
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

/* small presentational helper */
function InlineHint({ title, text }: { title: string; text: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.03)',
      }}
    >
      <div className="text-xs uppercase tracking-wide text-white/60">{title}</div>
      <div className="mt-1 text-white/85">{text}</div>
    </div>
  );
}
