'use client';
import { ReactNode, useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { useRouter } from 'next/navigation';
import { IdentityAttestationsABI, ADDRS } from '@/lib/contracts';
import { rootstockTestnet } from '@/lib/chains';

export default function Protected({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [allow, setAllow] = useState(false);

  // Hard gate if you've set the attestation contract; otherwise soft-gate with localStorage
  const { data: verified } = useReadContract({
    abi: IdentityAttestationsABI,
    address: ADDRS.ATTESTATIONS,
    functionName: 'isVerified',
    args: [address!, ADDRS.SCOPE],
    chainId: rootstockTestnet.id,
    query: { enabled: !!address && !!ADDRS.ATTESTATIONS },
  });

  useEffect(() => {
    if (!isConnected || !address) { router.replace('/verify'); return; }

    const soft = localStorage.getItem(`ensure:verified:${address.toLowerCase()}`) === '1';
    if (verified || soft) setAllow(true);
    else router.replace('/verify');
  }, [isConnected, address, verified, router]);

  if (!allow) return null;
  return <>{children}</>;
}
