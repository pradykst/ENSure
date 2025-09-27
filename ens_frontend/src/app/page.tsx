'use client';
import ConnectButton from '@/components/ConnectButton';
import Link from 'next/link';

export default function Home() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="badge-verified mb-3">Human-Centric Hackathon Guarantees</div>
          <h1 className="text-5xl font-extrabold leading-tight">
            Prize escrow for verified humans
            <span className="block text-transparent bg-clip-text bg-brand-gradient"> on Rootstock.</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Connect your wallet, verify with Self, and unlock gated actions.
          </p>
          <div className="mt-8 flex gap-3">
            <ConnectButton goToVerify />
            <Link href="/verify" className="px-5 py-3 rounded-xl border">How verification works</Link>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <li className="bg-white p-4 rounded-xl border">🔐 ZK identity with Self</li>
            <li className="bg-white p-4 rounded-xl border">🔒 Escrowed payouts</li>
            <li className="bg-white p-4 rounded-xl border">🏷 ENS winners support</li>
            <li className="bg-white p-4 rounded-xl border">⚡ Instant finalize</li>
          </ul>
        </div>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="text-sm text-gray-600">Flow</div>
          <ol className="mt-3 space-y-2 text-sm">
            <li>1) Connect wallet → route to <code>/verify</code></li>
            <li>2) Scan Self QR (scope bound)</li>
            <li>3) (Optional) Adapter relays to Rootstock</li>
            <li>4) Verified → gated features unlocked</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
