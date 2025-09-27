'use client';
import './globals.css';
import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import ConnectButton from '@/components/ConnectButton';
import Link from 'next/link';

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="text-gray-900">
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b">
              <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                <Link href="/" className="font-bold">ENSure</Link>
                <nav className="flex items-center gap-3">
                  <Link className="text-sm text-gray-600 hover:text-gray-900" href="/verify">Verify</Link>
                  <ConnectButton />
                </nav>
              </div>
            </header>
            <main className="min-h-[calc(100vh-56px)]">{children}</main>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
