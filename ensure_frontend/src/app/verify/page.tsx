"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SelfQRcodeWrapper,
  SelfAppBuilder,
  type SelfApp,
  getUniversalLink,
} from "@selfxyz/qrcode";
import { getProofOfHuman } from "../../lib/contract";
import { Sora } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";

// ---------- Brand + font (same as profile) ----------
const sora = Sora({ subsets: ["latin"] });
const BRAND = {
  primary: "#2962FF",
  secondary: "#651FFF",
  accent: "#00E5FF",
  base: "#FFFFFF",
  dark: "#1A1A2E",
};
const SCOPE_LABEL = process.env.NEXT_PUBLIC_SELF_SCOPE ?? "—";

// ---------- CELO SEPOLIA (UNCHANGED) ----------
const CELO_SEPOLIA = {
  chainId: "0xaa044c", // 11142220
  chainName: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
  blockExplorerUrls: ["https://celo-sepolia.blockscout.com/"],
};

export default function VerifyPage() {
  const router = useRouter();
  const [address, setAddress] = useState<string>("");
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [toast, setToast] = useState<string>("");

  const key = (addr: string) => `verified:11142220:${addr.toLowerCase()}`;

  // ---------- connect wallet (UNCHANGED) ----------
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) return alert("Install MetaMask and try again.");
    const [acct] = await window.ethereum.request({ method: "eth_requestAccounts" });
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CELO_SEPOLIA.chainId }],
      });
    } catch (err: any) {
      if (err?.code === 4902 || err?.data?.originalError?.code === 4902) {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [CELO_SEPOLIA] });
      } else {
        throw err;
      }
    }
    setAddress(acct);
  }, []);

  // ---------- already verified redirect (UNCHANGED) ----------
  useEffect(() => {
    if (!address) return;
    if (localStorage.getItem(key(address)) === "1") router.replace("/profile");
  }, [address, router]);

  // ---------- build Self app (UNCHANGED) ----------
  useEffect(() => {
    if (!address) return;
    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: process.env.NEXT_PUBLIC_APP_NAME,
        scope: process.env.NEXT_PUBLIC_SELF_SCOPE,
        endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT,
        logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
        userId: address,
        userIdType: "hex",
        endpointType: "staging_celo",
        disclosures: { minimumAge: 18 },
      }).build();
      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
    } catch (e) {
      console.error(e);
      setToast("Failed to initialize Self QR");
      setTimeout(() => setToast(""), 2500);
    }
  }, [address]);

  // ---------- poll contract + redirect (UNCHANGED) ----------
  useEffect(() => {
    if (!address) return;
    let stop = false;
    (async () => {
      const c = await getProofOfHuman();
      while (!stop) {
        try {
          const ok = await c.isVerified(address);
          if (ok) {
            localStorage.setItem(key(address), "1");
            router.replace("/profile");
            return;
          }
        } catch (e) {
          console.error("poll error", e);
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    })();
    return () => { stop = true; };
  }, [address, router]);

  // ---------- Self callback (UNCHANGED) ----------
  const handleSuccess = async () => {
    localStorage.setItem(key(address), "1");
    router.replace("/profile");
  };

  // =================== UI ONLY BELOW ===================

  // Screen 1: not connected yet
  if (!address) {
    return (
      <div className={sora.className} style={{ backgroundColor: BRAND.dark, minHeight: "100vh" }}>
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
                Connect your wallet to begin and scan in the Self app.
              </p>

              <div
                className="mt-8 rounded-3xl p-6 md:p-8"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex flex-col items-center gap-5">
                  <button
                    onClick={connectWallet}
                    className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold shadow hover:opacity-95"
                    style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                  >
                    Connect Wallet
                  </button>
                  {!!toast && (
                    <div
                      className="w-full rounded-xl px-4 py-3 text-sm"
                      style={{
                        border: "1px solid rgba(255,255,255,0.14)",
                        backgroundColor: "rgba(255,0,0,0.10)",
                        color: "#ffeaea",
                      }}
                    >
                      {toast}
                    </div>
                  )}
                </div>

                {/* help row */}
                <div className="mt-6 grid gap-3 md:grid-cols-3 text-sm">
                  <InlineHint title="Scope" text={SCOPE_LABEL} />
                  <InlineHint title="Network" text="Celo Sepolia (11142220)" />
                  <InlineHint title="Bridge" text="Optional adapter route" />
                </div>

                <div className="mt-6 flex items-center justify-center">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold text-white hover:bg-white/10"
                    style={{ borderColor: "rgba(255,255,255,0.14)" }}
                  >
                    ← Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 py-10" style={{ backgroundColor: "#0F1426" }}>
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

  // Screen 2: connected — show QR flow with your exact logic
  return (
    <div className={sora.className} style={{ backgroundColor: BRAND.dark, minHeight: "100vh" }}>
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
                border: "1px solid rgba(255,255,255,0.12)",
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              <div className="flex flex-col items-center gap-5">
                {selfApp ? (
                  <SelfQRcodeWrapper
                    selfApp={selfApp}
                    onSuccess={handleSuccess}
                    onError={() => setToast("Self verification failed. Please try again.")}
                  />
                ) : (
                  <div className="w-[256px] h-[256px] rounded-xl bg-white/10 animate-pulse" />
                )}

                {!!universalLink && (
                  <a
                    className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold shadow hover:opacity-95"
                    style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                    href={universalLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Self App
                  </a>
                )}

                {!!toast && (
                  <div
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{
                      border: "1px solid rgba(255,255,255,0.14)",
                      backgroundColor: "rgba(255,0,0,0.10)",
                      color: "#ffeaea",
                    }}
                  >
                    {toast}
                  </div>
                )}
              </div>

              {/* help row */}
              <div className="mt-6 grid gap-3 md:grid-cols-3 text-sm">
                <InlineHint title="Scope" text={SCOPE_LABEL} />
                <InlineHint title="Network" text="Celo Sepolia (11142220)" />
                <InlineHint title="Bridge" text="Optional adapter route" />
              </div>

              <div className="mt-6 flex items-center justify-center">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 font-semibold text-white hover:bg-white/10"
                  style={{ borderColor: "rgba(255,255,255,0.14)" }}
                >
                  ← Back to Home
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (same tone as home) */}
      <footer className="border-t border-white/10 py-10" style={{ backgroundColor: "#0F1426" }}>
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

/* small presentational helper — UI only */
function InlineHint({ title, text }: { title: string; text: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <div className="text-xs uppercase tracking-wide text-white/60">{title}</div>
      <div className="mt-1 text-white/85">{text}</div>
    </div>
  );
}