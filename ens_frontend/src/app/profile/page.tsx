'use client';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import Protected from '@/components/Protected';
import Link from 'next/link';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const [verificationTime, setVerificationTime] = useState<string>('');

  useEffect(() => {
    // Get verification timestamp from localStorage if available
    const timestamp = localStorage.getItem(`ensure:verified:timestamp:${address?.toLowerCase()}`);
    if (timestamp) {
      setVerificationTime(new Date(parseInt(timestamp)).toLocaleString());
    } else {
      setVerificationTime(new Date().toLocaleString());
    }
  }, [address]);

  return (
    <Protected>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-brand-gradient rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">✓</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome to ENSure</h1>
                <div className="badge-verified mt-2">Verified Human</div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Wallet Address</h3>
                <p className="text-sm text-gray-600 break-all">{address}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Verification Status</h3>
                <p className="text-sm text-green-600">✓ Verified with Self Protocol</p>
                {verificationTime && (
                  <p className="text-xs text-gray-500 mt-1">Verified: {verificationTime}</p>
                )}
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link href="/events" className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🎫</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Events</h3>
              <p className="text-sm text-gray-600">Browse and participate in verified human events</p>
            </Link>

            <Link href="/escrow" className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Prize Escrow</h3>
              <p className="text-sm text-gray-600">Secure prize distribution for hackathons</p>
            </Link>

            <Link href="/ens" className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">🏷️</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">ENS Support</h3>
              <p className="text-sm text-gray-600">Enhanced ENS features for winners</p>
            </Link>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Your Activity</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">0</div>
                <div className="text-sm text-gray-600">Events Joined</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">0</div>
                <div className="text-sm text-gray-600">Prizes Won</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">1</div>
                <div className="text-sm text-gray-600">Verifications</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-dark">100%</div>
                <div className="text-sm text-gray-600">Trust Score</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}
