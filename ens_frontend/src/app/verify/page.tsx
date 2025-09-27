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

// --- CELO SEPOLIA CHAIN PARAMS ---
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

  // If we already know this wallet is verified, bounce to profile immediately
  useEffect(() => {
    if (!address) return;
    if (localStorage.getItem(key(address)) === "1") router.replace("/profile");
  }, [address, router]);

  // Build the Self QR
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

  // Fallback: poll the contract every 3s; when verified, store + redirect
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
        await new Promise(r => setTimeout(r, 3000));
      }
    })();
    return () => { stop = true; };
  }, [address, router]);

  const handleSuccess = async () => {
    // Works when the callback fires on this page (mobile/webview case)
    localStorage.setItem(key(address), "1");
    router.replace("/profile");
  };

  if (!address) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
        <div className="bg-white rounded-xl shadow p-6 space-y-4 w-[360px]">
          <h1 className="text-2xl font-bold">Verify Identity</h1>
          <p className="text-gray-600">Connect your wallet to start</p>
          <button onClick={connectWallet} className="w-full rounded-md px-4 py-2 bg-black text-white">
            Connect Wallet
          </button>
          {toast && <div className="text-sm text-gray-600 bg-gray-100 rounded p-2">{toast}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-6">
      <div className="bg-white rounded-xl shadow p-6 space-y-4 w-full max-w-md">
        <h1 className="text-xl font-semibold">Verify with Self</h1>
        {selfApp ? (
          <SelfQRcodeWrapper
            selfApp={selfApp}
            onSuccess={handleSuccess}
            onError={() => setToast("Verification failed")}
          />
        ) : (
          <div className="w-[256px] h-[256px] bg-gray-200 animate-pulse" />
        )}
        <div className="text-xs text-gray-600 break-all">Connected: {address}</div>
        {universalLink && (
          <button
            onClick={() => window.open(universalLink, "_blank")}
            className="w-full rounded-md px-4 py-2 bg-blue-600 text-white"
          >
            Open Self App
          </button>
        )}
        {toast && <div className="text-sm text-gray-600 bg-gray-100 rounded p-2">{toast}</div>}
      </div>
    </div>
  );
}
