"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProofOfHuman } from "../lib/contract";

export default function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!window.ethereum) { 
        router.replace("/verify"); 
        return; 
      }
      
      // Use eth_accounts to avoid prompting MetaMask on every mount
      const [account] = await window.ethereum.request({ method: "eth_accounts" });
      if (!account) {
        router.replace("/verify");
        return;
      }
      
      try {
        const c = await getProofOfHuman();
        const ok = await c.isVerified(account);
        if (!ok) {
          router.replace("/verify");
        } else {
          setReady(true);
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
        router.replace("/verify");
      }
    })();
  }, [router]);

  if (!ready) return null; // or a spinner
  return <>{children}</>;
}
