'use client';

import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Shield, Zap, CoinsIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { Spotlight } from '@/components/ui/spotlight';
import { EtherealEffect } from '@/components/ui/EtherealEffect';

// Sample data for top liquidity pools
const topPools = [
  {
    id: 'eth-usdt',
    token0: { symbol: 'ETH', logoURI: '/token-logos/eth.png' },
    token1: { symbol: 'USDT', logoURI: '/token-logos/usdt.png' },
    tvl: '$1,245,678',
    volume24h: '$345,890',
    apr: '12.4%',
  },
  {
    id: 'eth-usdc',
    token0: { symbol: 'ETH', logoURI: '/token-logos/eth.png' },
    token1: { symbol: 'USDC', logoURI: '/token-logos/usdc.png' },
    tvl: '$978,456',
    volume24h: '$289,765',
    apr: '10.8%',
  },
  {
    id: 'eth-wbtc',
    token0: { symbol: 'ETH', logoURI: '/token-logos/eth.png' },
    token1: { symbol: 'WBTC', logoURI: '/token-logos/wbtc.png' },
    tvl: '$876,543',
    volume24h: '$187,654',
    apr: '9.7%',
  },
  {
    id: 'usdt-usdc',
    token0: { symbol: 'USDT', logoURI: '/token-logos/usdt.png' },
    token1: { symbol: 'USDC', logoURI: '/token-logos/usdc.png' },
    tvl: '$543,210',
    volume24h: '$98,765',
    apr: '6.5%',
  },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-grow flex flex-col items-center pt-36 relative overflow-hidden">
        {/* Spotlight effect */}
        <Spotlight />
        
        {/* Hero Section */}
        <section className="w-full max-w-7xl mx-auto px-4 pt-8 pb-20 flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center max-w-3xl mb-6">
            <span className="text-foreground">Trade tokens </span>
            <span className="text-primary">faster</span>
            <span className="text-foreground"> and </span>
            <span className="text-primary">safer</span>
            <span className="text-foreground"> on MegaETH</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl text-center max-w-2xl mb-12">
            Swap tokens with singleton pools on MegaETH with 10ms confirmation times
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-primary to-secondary shadow-glow-sm hover:shadow-glow-md text-black font-semibold">
              <Link href="/swap">Launch App</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full hover:bg-primary/10 hover:border-primary/50">
              <Link href="/docs">Learn More</Link>
            </Button>
          </div>
        </section>
        
        {/* Top Liquidity Pools Section */}
        <section className="w-full max-w-7xl mx-auto px-4 pb-24">
          <div className="relative">
            {/* More transparent glass frame */}
            <div className="absolute -inset-[10px] rounded-3xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-white/3 rounded-3xl"></div>
              <div className="absolute inset-0 border border-white/10 rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-20 rounded-3xl"></div>
            </div>
            
            {/* Content container with dark background - matched to navbar color */}
            <div className="relative z-10 rounded-3xl bg-card/90 backdrop-blur-md overflow-hidden shadow-lg">
              <div className="p-6 mb-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white">Top Liquidity Pools</h2>
                  <Button asChild variant="outline" size="sm" className="rounded-xl border-white/30 hover:bg-white/10 hover:text-white text-white">
                    <Link href="/liquidity">View All</Link>
                  </Button>
                </div>
              </div>
              
              {/* Table header - Responsive grid with smaller text on mobile */}
              <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 text-sm font-medium text-gray-400 bg-background-light/30">
                <div className="col-span-4">Pool</div>
                <div className="col-span-3 text-right">TVL</div>
                <div className="col-span-3 text-right">Volume (24h)</div>
                <div className="col-span-2 text-right">APR</div>
              </div>
              
              {/* Mobile-specific header */}
              <div className="md:hidden grid grid-cols-12 gap-1 px-3 py-3 text-[10px] font-medium text-gray-400 bg-background-light/30">
                <div className="col-span-4">Pool</div>
                <div className="col-span-3 text-right">TVL</div>
                <div className="col-span-3 text-right">Vol</div>
                <div className="col-span-2 text-right">APR</div>
              </div>
              
              {/* Table content - with responsive styling */}
              <div className="max-h-[320px] overflow-hidden">
                {topPools.map((pool) => (
                  <Link 
                    key={pool.id} 
                    href={`/swap?fromToken=${pool.token0.symbol}&toToken=${pool.token1.symbol}`}
                    className="grid grid-cols-12 gap-1 md:gap-4 px-3 md:px-6 py-3 border-b border-border/20 hover:bg-primary/5 transition-colors block cursor-pointer text-gray-200"
                  >
                    <div className="col-span-4 md:col-span-4 pr-1">
                      <div className="flex items-center">
                        <div className="flex -space-x-1 mr-1 md:mr-3 flex-shrink-0">
                          <div className="token-logo z-10">
                            <img src={pool.token0.logoURI} alt={pool.token0.symbol} className="w-6 h-6 md:w-6 md:h-6" />
                          </div>
                          <div className="token-logo">
                            <img src={pool.token1.logoURI} alt={pool.token1.symbol} className="w-6 h-6 md:w-6 md:h-6" />
                          </div>
                        </div>
                        <span className="font-medium text-[10px] md:text-base truncate">{pool.token0.symbol}/{pool.token1.symbol}</span>
                      </div>
                    </div>
                    <div className="col-span-3 text-right text-[10px] md:text-base whitespace-nowrap">{pool.tvl}</div>
                    <div className="col-span-3 md:col-span-3 text-right text-[10px] md:text-base whitespace-nowrap">{pool.volume24h}</div>
                    <div className="col-span-2 text-right font-medium text-primary text-[10px] md:text-base">{pool.apr}</div>
                  </Link>
                ))}
              </div>
            </div>
            
            {/* Enhanced fade effect to completely hide the bottom border */}
            <div className="absolute -inset-x-[10px] bottom-[-5%] h-[45%] bg-gradient-to-t from-background via-background/85 to-transparent pointer-events-none z-30 rounded-b-3xl"></div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="w-full py-24">
          <div className="@container mx-auto max-w-5xl px-6">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-center mb-4">
                <span className="text-foreground">Why Choose </span>
                <span className="text-primary">ZapSwap</span>
              </h2>
              <p className="mt-4 text-gray-400">
                Built on MegaETH's ultra-fast blockchain technology with singleton architecture
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8 md:mt-16">
              <Card className="group shadow-black-950/5 border border-white/10 bg-gradient-to-br from-background-light/10 to-background/5 backdrop-blur-md text-center">
                <CardHeader className="pb-3">
                  <CardDecorator>
                    <Shield className="size-6 text-primary" aria-hidden />
                  </CardDecorator>
                  <h3 className="mt-6 font-medium text-white text-center">Secure Transactions</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 text-center">
                    Built on MegaETH's secure EVM-compatible environment with all the security of Ethereum.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="group shadow-black-950/5 border border-white/10 bg-gradient-to-br from-background-light/10 to-background/5 backdrop-blur-md text-center">
                <CardHeader className="pb-3">
                  <CardDecorator>
                    <Zap className="size-6 text-primary" aria-hidden />
                  </CardDecorator>
                  <h3 className="mt-6 font-medium text-white text-center">Ultra Fast</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 text-center">
                    Experience 10ms mini blocks for near-instant transaction confirmations with the MegaETH Realtime API.
                  </p>
                </CardContent>
              </Card>
              
              <Card className="group shadow-black-950/5 border border-white/10 bg-gradient-to-br from-background-light/10 to-background/5 backdrop-blur-md text-center">
                <CardHeader className="pb-3">
                  <CardDecorator>
                    <CoinsIcon className="size-6 text-primary" aria-hidden />
                  </CardDecorator>
                  <h3 className="mt-6 font-medium text-white text-center">Gas Efficient</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-400 text-center">
                    Minimize costs with singleton architecture and MegaETH's optimized execution environment.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
        
        {/* Stats Section */}
        <section className="w-full max-w-7xl mx-auto px-4 py-20">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <span className="text-foreground">Powered by </span>
            <span className="text-primary">MegaETH</span>
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center">
              <p className="text-4xl font-bold text-primary mb-2">10ms</p>
              <p className="text-muted-foreground text-center">Block Time</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-4xl font-bold text-primary mb-2">50K+</p>
              <p className="text-muted-foreground text-center">Users</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-4xl font-bold text-primary mb-2">500K+</p>
              <p className="text-muted-foreground text-center">Transactions</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-4xl font-bold text-primary mb-2">20+</p>
              <p className="text-muted-foreground text-center">Token Pairs</p>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="w-full py-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="relative">
              {/* Sleek Border Container */}
              <div className="absolute -inset-[2px] rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-primary/20 to-primary/50 rounded-3xl"></div>
              </div>
              
              {/* Content container */}
              <div className="relative z-10 rounded-3xl bg-card/90 backdrop-blur-md overflow-hidden shadow-lg border border-white/10" style={{ height: '320px' }}>
                <EtherealEffect 
                  color="rgba(209, 240, 25, 0.15)" 
                  animation={{ scale: 40, speed: 30 }}
                  noise={{ opacity: 0.2, scale: 1.5 }}
                  className="w-full h-full"
                >
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-8 py-40 text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                      <span className="text-foreground">Ready to </span>
                      <span className="text-primary">start trading</span>
                      <span className="text-foreground">?</span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-10">
                      Join thousands of users already swapping tokens with ZapSwap on MegaETH
                    </p>
                    <Button asChild size="lg" className="rounded-full bg-gradient-to-r from-primary to-secondary shadow-glow-sm hover:shadow-glow-md text-black font-semibold px-10 py-6 text-lg">
                      <Link href="/swap">Launch App</Link>
                    </Button>
                  </div>
                </EtherealEffect>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// CardDecorator component at the bottom of the file
const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div aria-hidden className="relative mx-auto size-36 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]">
    <div className="absolute inset-0 [--border:white] bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"/>
    <div className="bg-card absolute inset-0 m-auto flex size-12 items-center justify-center border-t border-l border-white/10">{children}</div>
  </div>
) 