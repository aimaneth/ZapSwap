'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { chains, wagmiConfig } from '@/lib/megaEthSdk';
import { ZapSwapProvider } from '@/contexts/ZapSwapContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider chains={chains}>
        <ZapSwapProvider>
          {children}
        </ZapSwapProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  );
} 