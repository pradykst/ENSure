'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsName,
  useEnsAvatar,
} from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';

/** Brand (uniform palette) */
const BRAND = {
  primary: '#2962FF',   // Deep Ethereum Blue
  base: '#FFFFFF',
  darkCard: '#121628',  // Dark card bg
};

const borderLight = '1px solid rgba(255,255,255,0.12)';
const hoverGlass = 'rgba(255,255,255,0.06)';

function truncate(addr?: string, size = 4) {
  if (!addr) return '';
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}

export function WalletConnectMenu() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // ENS (Sepolia → fallback to Mainnet)
  const { data: nameSepolia } = useEnsName({ address, chainId: sepolia.id });
  const { data: nameMainnet } = useEnsName({
    address,
    chainId: mainnet.id,
    query: { enabled: !nameSepolia },
  });
  const ensName = nameSepolia ?? nameMainnet ?? null;

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName ?? undefined,
    chainId: nameSepolia ? sepolia.id : mainnet.id,
  });

  /* -------------------------- CONNECTED STATE --------------------------- */
  if (isConnected && address) {
    const displayName = ensName || truncate(address, 6);

    return (
      <div className="relative" ref={dropdownRef}>
        {/* Trigger */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="inline-flex items-center gap-3 rounded-2xl px-5 py-3 font-semibold transition-all duration-150"
          style={{ color: BRAND.base, backgroundColor: 'rgba(255,255,255,0.06)', border: borderLight }}
          title={address}
        >
          {/* avatar: solid blue if missing */}
          {avatarUrl ? (
            // Use <img> to avoid Next remotePatterns config for ENS CDN
            <span className="relative inline-block h-8 w-8 overflow-hidden rounded-full ring-2 ring-white/20">
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            </span>
          ) : (
            <span
              className="inline-grid h-8 w-8 place-items-center rounded-full text-sm font-bold"
              style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
            >
              {displayName?.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-white/90">{displayName}</span>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="absolute right-0 mt-3 w-72 rounded-2xl py-3 z-50 shadow-2xl"
            style={{ backgroundColor: BRAND.darkCard, border: borderLight, backdropFilter: 'blur(16px)' }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <div className="flex items-center gap-3">
                {avatarUrl ? (
                  <span className="relative inline-block h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/15">
                    <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  </span>
                ) : (
                  <span
                    className="inline-grid h-12 w-12 place-items-center rounded-full text-lg font-bold"
                    style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
                  >
                    {displayName?.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{displayName}</div>
                  {ensName && <div className="text-xs text-white/55 truncate">{ensName}</div>}
                  <div className="text-[11px] text-white/45 font-mono truncate">{address}</div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="py-2">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-white/90 hover:bg-white/[0.06] transition-colors"
              >
                <span className="inline-grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: hoverGlass }}>
                  <svg className="h-4 w-4 text-white/75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                Profile
              </Link>

              <Link
                href="/events"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-white/90 hover:bg-white/[0.06] transition-colors"
              >
                <span className="inline-grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: hoverGlass }}>
                  <svg className="h-4 w-4 text-white/75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                Events
              </Link>

              <button
                onClick={() => { disconnect(); setIsOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-300 hover:bg-white/[0.06] transition-colors text-left"
              >
                <span className="inline-grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: 'rgba(255,0,0,0.10)' }}>
                  <svg className="h-4 w-4" style={{ color: '#ff6666' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </span>
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ------------------------ DISCONNECTED STATE ------------------------- */
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-2xl px-5 py-3 font-semibold shadow transition-all duration-150"
        style={{ backgroundColor: BRAND.primary, color: BRAND.base }}
      >
        Connect Wallet
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-3 w-64 rounded-2xl py-3 z-50 shadow-2xl"
          style={{ backgroundColor: BRAND.darkCard, border: borderLight, backdropFilter: 'blur(16px)' }}
        >
          <div className="px-3 py-2">
            <div className="mb-2 text-xs uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>
              Connect Wallet
            </div>

            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => { connect({ connector }); setIsOpen(false); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.9)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverGlass)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <span className="inline-grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: hoverGlass }}>
                  <svg className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                {connector.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
