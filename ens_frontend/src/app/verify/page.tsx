'use client';
import { useEffect, useState } from 'react';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { celoSepolia, rootstockTestnet } from '@/lib/chains';
import { ADDRS, SelfAdapterABI, IdentityAttestationsABI } from '@/lib/contracts';
import { SelfQRcodeWrapper, SelfAppBuilder, getUniversalLink, type SelfApp } from '@selfxyz/qrcode';
import { createPublicClient, http } from 'viem';
import { useRouter } from 'next/navigation';

const SCOPE_LABEL = 'mydapp-scope';

export default function VerifyPage() {
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const router = useRouter();

  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState('');
  const key = (addr: string) => `ensure:verified:${addr.toLowerCase()}`;

  // Build the Self QR
  useEffect(() => {
    if (!address) return;
    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: process.env.NEXT_PUBLIC_APP_NAME,
        scope: SCOPE_LABEL,                 // <<— string label (fixes the 31-char error)
        endpoint: process.env.NEXT_PUBLIC_SELF_ENDPOINT,
        logoBase64: 'https://i.postimg.cc/mrmVf9hm/self.png',
        userId: address,
        userIdType: 'hex',
        endpointType: 'staging_celo',
        disclosures: { minimumAge: 18 },
      }).build();
      setSelfApp(app);
      setLink(getUniversalLink(app));
    } catch (e) {
      console.error(e);
      setMsg('Failed to initialize Self QR');
    }
  }, [address]);

  // Called when QR completes in web context
  const onVerified = async () => {
    if (!address) return;
    try {
      // 1) (Optional) forward to your adapter on Celo Sepolia
      await switchChainAsync({ chainId: celoSepolia.id });
      if (ADDRS.SELF_ADAPTER && ADDRS.SELF_ADAPTER !== ('0x' + '0'.repeat(40))) {
        await writeContractAsync({
          abi: SelfAdapterABI,
          address: ADDRS.SELF_ADAPTER,
          functionName: 'verifyAndBridge',
          args: ['0x', ADDRS.SCOPE, address], // bytes32 scope goes on-chain
          chainId: celoSepolia.id,
        });
      }

      // 2) Poll Rootstock attestation (if address set)
      const client = createPublicClient({ chain: rootstockTestnet, transport: http(rootstockTestnet.rpcUrls.default.http[0]) });
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
            router.replace('/profile');
            return;
          }
        }
        await new Promise(r => setTimeout(r, 500));
      }

      // Soft-gate fallback (let them in while finality catches up)
      localStorage.setItem(key(address), '1');
      router.replace('/profile');
    } catch (e: unknown) {
      console.error(e);
      const error = e as Error;
      setMsg(error?.message || 'Verification failed');
    }
  };

  return (
    <section className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">Verify your identity</h1>
      <p className="text-gray-600 mt-2">Scan in the Self app. We&apos;ll relay and confirm your Rootstock attestation.</p>

      <div className="mt-6 bg-white border rounded-2xl p-6 flex flex-col items-center gap-4">
        {!isConnected && <p className="text-sm">Connect your wallet first (top right).</p>}
        {selfApp ? (
          <SelfQRcodeWrapper selfApp={selfApp} onSuccess={onVerified} onError={() => setMsg('Self verification failed')} />
        ) : (
          <div className="w-[256px] h-[256px] bg-gray-200 animate-pulse" />
        )}
        {!!link && (
          <a className="px-4 py-2 rounded-xl bg-primary text-white" href={link} target="_blank" rel="noreferrer">
            Open Self App
          </a>
        )}
        {!!msg && <div className="text-sm text-gray-700">{msg}</div>}
      </div>
    </section>
  );
}
