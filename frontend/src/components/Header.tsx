'use client';

import Image from 'next/image';
import Link from 'next/link';
import { WalletConnectMenu } from './WalletConnectMenu';

interface HeaderProps {
  variant?: 'home' | 'default';
}

export function Header({ variant = 'default' }: HeaderProps) {
  const isHome = variant === 'home';

  return (
    <header className="sticky top-0 z-40 isolate border-b border-white/10 bg-[#0F1426]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg ring-1 ring-white/10">
            <Image src="/ensure.png" alt="ENSure logo" fill className="object-cover" />
          </div>
          <span 
            className="text-xl font-extrabold tracking-tight text-white" 
            style={{ letterSpacing: '-0.02em' }}
          >
            ENSure
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex">
          {isHome ? (
            <>
              <Link href="/#features" className="text-sm text-white/70 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="/#how" className="text-sm text-white/70 hover:text-white transition-colors">
                How it works
              </Link>
              <Link href="/events" className="text-sm text-white/70 hover:text-white transition-colors">
                Discover
              </Link>
              <Link href="/pricing" className="text-sm text-white/70 hover:text-white transition-colors">
                Pricing
              </Link>
            </>
          ) : (
            <>
              <Link href="/events" className="text-sm text-white/70 hover:text-white transition-colors">
                Discover
              </Link>
              <Link href="/pricing" className="text-sm text-white/70 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/#how" className="text-sm text-white/70 hover:text-white transition-colors">
                How it works
              </Link>
            </>
          )}
        </nav>

        {/* Wallet Connect Menu */}
        <WalletConnectMenu />
      </div>
    </header>
  );
}
