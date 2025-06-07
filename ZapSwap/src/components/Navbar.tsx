'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WalletConnectButton } from './WalletConnectButton';
import { Button } from './ui/button';
import { useNetwork } from 'wagmi';
import { useZapSwap } from '@/contexts/ZapSwapContext';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected } = useZapSwap();
  const { chain } = useNetwork();
  
  // Handle mobile menu toggle with shape change first
  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <div className="w-full flex justify-center px-4 sm:px-6 lg:px-8 fixed top-0 left-0 z-50 pt-8">
      <nav className={`w-full max-w-5xl bg-card/90 backdrop-blur-md ${mobileMenuOpen ? 'rounded-2xl' : 'rounded-full'} shadow-glow-navbar py-3 px-4`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2">
                <div className="h-8 w-8 relative">
                  <Image 
                    src="/logo.png"
                    alt="ZapSwap Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="text-xl font-bold text-white">
                  ZapSwap
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-10 sm:flex">
              <div className="bg-background-light/80 backdrop-blur-sm rounded-full p-1 flex gap-1 items-center">
                <Link
                  href="/swap"
                  className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
                >
                  Swap
                </Link>
                <Link
                  href="/liquidity"
                  className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
                >
                  Liquidity
                </Link>
                <Link
                  href="/positions"
                  className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-primary/10 transition-colors"
                >
                  Positions
                </Link>
                <div className="relative group">
                  <button className="px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-primary/10 transition-colors flex items-center gap-1">
                    <span>More</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-card/90 backdrop-blur-md rounded-xl shadow-lg border border-border/50 p-2 hidden group-hover:block">
                    <Link href="/analytics" className="block px-4 py-2 text-sm rounded-lg hover:bg-primary/10">
                      Analytics
                    </Link>
                    <Link href="/docs" className="block px-4 py-2 text-sm rounded-lg hover:bg-primary/10">
                      Documentation
                    </Link>
                    <Link href="/faq" className="block px-4 py-2 text-sm rounded-lg hover:bg-primary/10">
                      FAQ
                    </Link>
                    <Link href="/community" className="block px-4 py-2 text-sm rounded-lg hover:bg-primary/10">
                      Community
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex sm:items-center">
            <WalletConnectButton />
          </div>
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/10 focus:outline-none"
              aria-expanded={mobileMenuOpen}
              onClick={handleMobileMenuToggle}
            >
              <span className="sr-only">Toggle main menu</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu - not using a transition-all to avoid the delay */}
        <div className={`sm:hidden ${mobileMenuOpen ? 'block mt-4 border-t border-border/20 pt-4' : 'hidden'}`}>
          <div className="flex flex-col space-y-2">
            <Link
              href="/swap"
              className="block px-3 py-2 rounded-xl text-base font-medium text-foreground hover:bg-primary/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              Swap
            </Link>
            <Link
              href="/liquidity"
              className="block px-3 py-2 rounded-xl text-base font-medium text-foreground hover:bg-primary/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              Liquidity
            </Link>
            <Link
              href="/positions"
              className="block px-3 py-2 rounded-xl text-base font-medium text-foreground hover:bg-primary/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              Positions
            </Link>
            <Link
              href="/analytics"
              className="block px-3 py-2 rounded-xl text-base font-medium text-foreground hover:bg-primary/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              Analytics
            </Link>
            <Link
              href="/docs"
              className="block px-3 py-2 rounded-xl text-base font-medium text-foreground hover:bg-primary/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              Documentation
            </Link>
          </div>
          <div className="pt-4 mt-3 border-t border-border/20">
            <div className="flex items-center justify-end">
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}; 