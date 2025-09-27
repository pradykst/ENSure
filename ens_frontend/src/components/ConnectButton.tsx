'use client';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useRouter } from 'next/navigation';

type Props = { goToVerify?: boolean };

export default function ConnectButton({ goToVerify }: Props) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const onConnect = async () => {
    const injected = connectors.find(c => c.id === 'injected') ?? connectors[0];
    await connect({ connector: injected });
    if (goToVerify) router.push('/verify');
  };

  if (isConnected) {
    return (
      <button
        onClick={() => disconnect()}
        title={address}
        className="rounded-xl px-5 py-3 bg-dark text-white hover:bg-opacity-90"
      >
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={onConnect} className="btn-brand">Connect Wallet</button>
      {status === 'error' && <span className="text-xs text-red-600">{(error as Error)?.message}</span>}
    </div>
  );
}
