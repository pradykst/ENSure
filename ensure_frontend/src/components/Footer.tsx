'use client';

import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10 py-10" style={{ backgroundColor: '#0F1426' }}>
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
          <Link href="https://github.com/pradykst/ENSure" className="text-white/70 hover:text-white">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
