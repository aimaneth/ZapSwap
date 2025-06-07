'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { TokenSelector } from '@/components/TokenSelector';
import { getTokens, getTokenBalance, Token } from '@/services/tokenService';
import { getPools, getUserPositions, addLiquidity, removeLiquidity, subscribeToLiquidityEvents, Pool, LiquidityPosition } from '@/services/liquidityService';
import { realtimeAPI } from '@/lib/megaEthSdk';
import { FEE_TIERS, DEFAULT_SLIPPAGE_TOLERANCE, MEGAETH_EXPLORER_URL } from '@/lib/constants';
import Link from 'next/link';
import Image from 'next/image';

// Updated interface for token data in pools
interface TokenInfo {
  symbol: string;
  address: string;
  logoURI?: string;
  balance?: string;
}

// Updated LiquidityPair interface
interface LiquidityPair {
  id: string;
  token0: TokenInfo;
  token1: TokenInfo;
  tvl: string;
  volume24h: string;
  fees24h: string;
  apr: string;
  myLiquidity?: string;
}

export default function LiquidityPage() {
  // State for liquidity pairs
  const [allPools, setAllPools] = useState<Pool[]>([]);
  const [myPositions, setMyPositions] = useState<LiquidityPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    tvl: '$0',
    volume24h: '$0',
    fees24h: '$0'
  });
  
  // State for add liquidity modal
  const [isAddLiquidityOpen, setIsAddLiquidityOpen] = useState(false);
  const [isRemoveLiquidityOpen, setIsRemoveLiquidityOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  
  // Token selection state
  const [token0, setToken0] = useState<Token | null>(null);
  const [token1, setToken1] = useState<Token | null>(null);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [isToken0SelectorOpen, setIsToken0SelectorOpen] = useState(false);
  const [isToken1SelectorOpen, setIsToken1SelectorOpen] = useState(false);
  
  // Liquidity input state
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [selectedFee, setSelectedFee] = useState(FEE_TIERS[2].value); // Default to 0.3%
  const [slippage, setSlippage] = useState(`${DEFAULT_SLIPPAGE_TOLERANCE}`);
  
  // Transaction state
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [isTransacting, setIsTransacting] = useState(false);
  const [realtimeSubscriptionId, setRealtimeSubscriptionId] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('all-pools');
  
  // Wallet connection
  const { 
    isConnected, 
    account, 
    connect
  } = useWalletConnection();

  // In the component state section, add token balance states
  const [token0Balance, setToken0Balance] = useState('0.00');
  const [token1Balance, setToken1Balance] = useState('0.00');

  // Load available tokens
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const tokens = await getTokens();
        setAvailableTokens(tokens);
        
        // Set default tokens if none selected
        if (!token0 && tokens.length > 0) {
          setToken0(tokens[0]); // ETH
        }
        
        if (!token1 && tokens.length > 1) {
          setToken1(tokens[1]); // WETH
        }
      } catch (error) {
        console.error('Failed to load tokens:', error);
      }
    };
    
    loadTokens();
  }, []);

  // Fetch pools and positions
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Get all pools
        const pools = await getPools();
        setAllPools(pools);
        
        // Calculate stats
        const tvl = pools.reduce((sum, pool) => sum + Number(pool.tvlUSD.replace('$', '').replace(/,/g, '')), 0);
        const volume = pools.reduce((sum, pool) => sum + Number(pool.volumeUSD24h.replace('$', '').replace(/,/g, '')), 0);
        const fees = pools.reduce((sum, pool) => sum + Number(pool.volumeUSD24h.replace('$', '').replace(/,/g, '')) * 0.003, 0);
        
        setStatsData({
          tvl: `$${tvl.toLocaleString()}`,
          volume24h: `$${volume.toLocaleString()}`,
          fees24h: `$${fees.toLocaleString()}`
        });
        
        // Get user positions if connected
        if (isConnected && account) {
          const positions = await getUserPositions(account);
          setMyPositions(positions);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [isConnected, account]);

  // Subscribe to liquidity events for real-time updates
  useEffect(() => {
    const setupLiquidityListener = async () => {
      if (isConnected && token0 && token1) {
        try {
          // Clean up any existing subscription
          if (realtimeSubscriptionId) {
            await realtimeAPI.unsubscribe(realtimeSubscriptionId);
          }
          
          // Subscribe to liquidity events for our token pair
          const subscriptionId = await subscribeToLiquidityEvents(
            token0.address,
            token1.address,
            selectedFee,
            (event) => {
              // When a liquidity event happens, refresh data
              fetchData();
              console.log('Liquidity event received:', event);
            }
          );
          
          setRealtimeSubscriptionId(subscriptionId);
        } catch (error) {
          console.error('Failed to subscribe to liquidity events:', error);
        }
      }
    };
    
    const fetchData = async () => {
      try {
        // Get all pools
        const pools = await getPools();
        setAllPools(pools);
        
        // Get user positions if connected
        if (isConnected && account) {
          const positions = await getUserPositions(account);
          setMyPositions(positions);
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      }
    };
    
    setupLiquidityListener();
    
    // Cleanup on unmount
    return () => {
      if (realtimeSubscriptionId) {
        realtimeAPI.unsubscribe(realtimeSubscriptionId).catch(console.error);
      }
    };
  }, [isConnected, token0, token1, selectedFee, account]);

  // Add a useEffect to load token balances
  useEffect(() => {
    const loadBalances = async () => {
      if (isConnected && account) {
        try {
          if (token0) {
            const balance0 = await getTokenBalance(token0.address, account);
            setToken0Balance(balance0);
          }
          
          if (token1) {
            const balance1 = await getTokenBalance(token1.address, account);
            setToken1Balance(balance1);
          }
        } catch (error) {
          console.error('Failed to load token balances:', error);
        }
      }
    };
    
    loadBalances();
  }, [isConnected, account, token0, token1]);

  // Handle add liquidity
  const handleAddLiquidity = async () => {
    if (!isConnected) {
      connect();
      return;
    }
    
    if (!token0 || !token1 || !amount0 || !amount1 || !account) {
      return;
    }
    
    setIsTransacting(true);
    setTxError(null);
    setTxHash(null);
    
    try {
      // Calculate minimum amounts based on slippage
      const slippagePercent = Number(slippage) / 100;
      const amount0Min = (Number(amount0) * (1 - slippagePercent)).toFixed(6);
      const amount1Min = (Number(amount1) * (1 - slippagePercent)).toFixed(6);
      
      // Default tick range (-10% to +10% around current price)
      const tickLower = -887272; // Simplified for example
      const tickUpper = 887272;  // Simplified for example
      
      // Add liquidity
      const result = await addLiquidity({
        token0: token0.address,
        token1: token1.address,
        fee: selectedFee,
        tickLower,
        tickUpper,
        amount0Desired: amount0,
        amount1Desired: amount1,
        amount0Min,
        amount1Min,
        recipient: account
      });
      
      // Update UI
      setTxHash('0x' + Math.random().toString(36).substring(2, 15)); // Placeholder for demo
      
      // Clear inputs
      setAmount0('');
      setAmount1('');
      
      // Refresh data
      const pools = await getPools();
      setAllPools(pools);
      
      if (account) {
        const positions = await getUserPositions(account);
        setMyPositions(positions);
      }
      
      // Close modal after successful transaction
      setTimeout(() => {
        setIsAddLiquidityOpen(false);
      }, 2000);
    } catch (error) {
      console.error('Error adding liquidity:', error);
      setTxError(error instanceof Error ? error.message : 'Failed to add liquidity');
    } finally {
      setIsTransacting(false);
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async (positionId: string, liquidity: string) => {
    if (!isConnected || !account) {
      connect();
      return;
    }
    
    setIsTransacting(true);
    setTxError(null);
    setTxHash(null);
    
    try {
      // Calculate minimum amounts based on slippage
      const slippagePercent = Number(slippage) / 100;
      const amount0Min = '0'; // Simplified for example
      const amount1Min = '0'; // Simplified for example
      
      // Calculate deadline (30 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
      
      // Remove liquidity
      const result = await removeLiquidity(
        positionId,
        liquidity,
        amount0Min,
        amount1Min,
        deadline
      );
      
      // Update UI
      setTxHash('0x' + Math.random().toString(36).substring(2, 15)); // Placeholder for demo
      
      // Refresh data
      const pools = await getPools();
      setAllPools(pools);
      
      if (account) {
        const positions = await getUserPositions(account);
        setMyPositions(positions);
      }
      
      // Close modal after successful transaction
      setTimeout(() => {
        setIsRemoveLiquidityOpen(false);
        setSelectedPositionId(null);
      }, 2000);
    } catch (error) {
      console.error('Error removing liquidity:', error);
      setTxError(error instanceof Error ? error.message : 'Failed to remove liquidity');
    } finally {
      setIsTransacting(false);
    }
  };

  // Helper functions
  const handleToken0Select = (token: Token) => {
    if (token.address === token1?.address) {
      // If same as token1, swap them
      setToken1(token0);
    }
    setToken0(token);
    setIsToken0SelectorOpen(false);
  };

  const handleToken1Select = (token: Token) => {
    if (token.address === token0?.address) {
      // If same as token0, swap them
      setToken0(token1);
    }
    setToken1(token);
    setIsToken1SelectorOpen(false);
  };

  const handleAmount0Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount0(value);
      // In a real app, would calculate amount1 based on pool price
      setAmount1((Number(value) * 2).toString()); // Simplified example
    }
  };

  const handleAmount1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount1(value);
      // In a real app, would calculate amount0 based on pool price
      setAmount0((Number(value) / 2).toString()); // Simplified example
    }
  };

  const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSlippage(value);
    }
  };

  const switchTokens = () => {
    const tempToken = token0;
    setToken0(token1);
    setToken1(tempToken);
    
    const tempAmount = amount0;
    setAmount0(amount1);
    setAmount1(tempAmount);
  };

  return (
    <>
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-44 pb-20">
        <div className="max-w-5xl w-full mx-auto">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Liquidity Pools</h1>
              <p className="text-muted-foreground">
                Add liquidity to earn fees and participate in yield farming
              </p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <Button 
                onClick={() => setIsAddLiquidityOpen(true)}
                className="bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-2xl shadow-glow-sm hover:shadow-glow-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M5 12h14"></path>
                  <path d="M12 5v14"></path>
                </svg>
                Add Liquidity
              </Button>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card-glass p-5">
              <div className="text-muted-foreground text-sm mb-1">Total Value Locked</div>
              <div className="text-2xl font-bold">{statsData.tvl}</div>
            </div>
            
            <div className="card-glass p-5">
              <div className="text-muted-foreground text-sm mb-1">24h Trading Volume</div>
              <div className="text-2xl font-bold">{statsData.volume24h}</div>
            </div>
            
            <div className="card-glass p-5">
              <div className="text-muted-foreground text-sm mb-1">Total Fees (24h)</div>
              <div className="text-2xl font-bold">{statsData.fees24h}</div>
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs defaultValue="all-pools" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4 bg-card/50 rounded-xl p-1">
              <TabsTrigger 
                value="all-pools"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
              >
                All Pools
              </TabsTrigger>
              <TabsTrigger 
                value="my-pools"
                className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                onClick={() => !isConnected && connect()}
              >
                My Pools
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all-pools" className="p-0 border-0">
              {isLoading ? (
                <div className="flex justify-center p-12">
                  <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="card-glass overflow-hidden rounded-2xl">
                  <Table>
                    <TableHeader className="bg-background-light/40">
                      <TableRow>
                        <TableHead className="font-semibold">Pool</TableHead>
                        <TableHead className="font-semibold text-right">TVL</TableHead>
                        <TableHead className="font-semibold text-right">Volume (24h)</TableHead>
                        <TableHead className="font-semibold text-right">Fees (24h)</TableHead>
                        <TableHead className="font-semibold text-right">APR</TableHead>
                        <TableHead className="font-semibold text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPools.map((pool) => {
                        // Create TokenInfo objects from pool data
                        const token0Info: TokenInfo = {
                          symbol: availableTokens.find(t => t.address === pool.token0)?.symbol || 'Unknown',
                          address: pool.token0,
                          logoURI: availableTokens.find(t => t.address === pool.token0)?.logoURI
                        };
                        
                        const token1Info: TokenInfo = {
                          symbol: availableTokens.find(t => t.address === pool.token1)?.symbol || 'Unknown',
                          address: pool.token1,
                          logoURI: availableTokens.find(t => t.address === pool.token1)?.logoURI
                        };
                        
                        return (
                          <TableRow key={pool.id} className="hover:bg-primary/5 transition-colors">
                            <TableCell className="py-4">
                              <div className="flex items-center">
                                <div className="flex -space-x-2 mr-3">
                                  <div className="token-logo z-10">
                                    {token0Info.logoURI ? (
                                      <img src={token0Info.logoURI} alt={token0Info.symbol} className="w-6 h-6" />
                                    ) : (
                                      <span className="text-xs">{token0Info.symbol.substring(0, 2)}</span>
                                    )}
                                  </div>
                                  <div className="token-logo">
                                    {token1Info.logoURI ? (
                                      <img src={token1Info.logoURI} alt={token1Info.symbol} className="w-6 h-6" />
                                    ) : (
                                      <span className="text-xs">{token1Info.symbol.substring(0, 2)}</span>
                                    )}
                                  </div>
                                </div>
                                <span className="font-medium">{token0Info.symbol}/{token1Info.symbol}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{pool.tvlUSD}</TableCell>
                            <TableCell className="text-right">{pool.volumeUSD24h}</TableCell>
                            <TableCell className="text-right">{pool.volumeUSD24h}</TableCell>
                            <TableCell className="text-right font-medium text-primary">{pool.apr}</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                                onClick={() => {
                                  // Set token selections to this pool's tokens
                                  const token0 = availableTokens.find(t => t.address === pool.token0);
                                  const token1 = availableTokens.find(t => t.address === pool.token1);
                                  if (token0) setToken0(token0);
                                  if (token1) setToken1(token1);
                                  setSelectedFee(pool.fee);
                                  setIsAddLiquidityOpen(true);
                                }}
                              >
                                Add
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="my-pools" className="p-0 border-0">
              {!isConnected ? (
                <div className="card-glass p-10 text-center">
                  <h3 className="text-xl font-semibold mb-4">Connect your wallet</h3>
                  <p className="text-muted-foreground mb-6">Connect your wallet to view your liquidity positions</p>
                  <Button 
                    onClick={connect} 
                    className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl shadow-glow-sm hover:shadow-glow-md"
                  >
                    Connect Wallet
                  </Button>
                </div>
              ) : isLoading ? (
                <div className="flex justify-center p-12">
                  <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : myPositions.length > 0 ? (
                <div className="card-glass overflow-hidden rounded-2xl">
                  <Table>
                    <TableHeader className="bg-background-light/40">
                      <TableRow>
                        <TableHead className="font-semibold">Pool</TableHead>
                        <TableHead className="font-semibold text-right">My Liquidity</TableHead>
                        <TableHead className="font-semibold text-right">TVL</TableHead>
                        <TableHead className="font-semibold text-right">APR</TableHead>
                        <TableHead className="font-semibold text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myPositions.map((position) => {
                        // Create TokenInfo objects from position data
                        const token0Info: TokenInfo = {
                          symbol: availableTokens.find(t => t.address === position.token0)?.symbol || 'Unknown',
                          address: position.token0,
                          logoURI: availableTokens.find(t => t.address === position.token0)?.logoURI
                        };
                        
                        const token1Info: TokenInfo = {
                          symbol: availableTokens.find(t => t.address === position.token1)?.symbol || 'Unknown',
                          address: position.token1,
                          logoURI: availableTokens.find(t => t.address === position.token1)?.logoURI
                        };
                        
                        return (
                          <TableRow key={position.id} className="hover:bg-primary/5 transition-colors">
                            <TableCell className="py-4">
                              <div className="flex items-center">
                                <div className="flex -space-x-2 mr-3">
                                  <div className="token-logo z-10">
                                    {token0Info.logoURI ? (
                                      <img src={token0Info.logoURI} alt={token0Info.symbol} className="w-6 h-6" />
                                    ) : (
                                      <span className="text-xs">{token0Info.symbol.substring(0, 2)}</span>
                                    )}
                                  </div>
                                  <div className="token-logo">
                                    {token1Info.logoURI ? (
                                      <img src={token1Info.logoURI} alt={token1Info.symbol} className="w-6 h-6" />
                                    ) : (
                                      <span className="text-xs">{token1Info.symbol.substring(0, 2)}</span>
                                    )}
                                  </div>
                                </div>
                                <span className="font-medium">{token0Info.symbol}/{token1Info.symbol}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">{position.liquidity}</TableCell>
                            <TableCell className="text-right">${Number(position.amount0) * 2000 + Number(position.amount1)}</TableCell>
                            <TableCell className="text-right font-medium text-primary">15.2%</TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                                  onClick={() => {
                                    // Set token selections to this position's tokens
                                    const token0 = availableTokens.find(t => t.address === position.token0);
                                    const token1 = availableTokens.find(t => t.address === position.token1);
                                    if (token0) setToken0(token0);
                                    if (token1) setToken1(token1);
                                    setSelectedFee(position.fee);
                                    setIsAddLiquidityOpen(true);
                                  }}
                                >
                                  Add
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  onClick={() => {
                                    setSelectedPositionId(position.id);
                                    setIsRemoveLiquidityOpen(true);
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="card-glass p-10 text-center">
                  <h3 className="text-xl font-semibold mb-4">No liquidity positions found</h3>
                  <p className="text-muted-foreground mb-6">You haven't added liquidity to any pools yet</p>
                  <Button 
                    onClick={() => setIsAddLiquidityOpen(true)}
                    className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl shadow-glow-sm hover:shadow-glow-md"
                  >
                    Add Liquidity
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      {/* Add Liquidity Modal */}
      <Dialog open={isAddLiquidityOpen} onOpenChange={setIsAddLiquidityOpen}>
        <DialogContent className="bg-card border-border/50 backdrop-blur-md max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add Liquidity</DialogTitle>
          </DialogHeader>
          
          <div className="my-4">
            <p className="text-sm text-muted-foreground mb-6">
              Add liquidity to receive LP tokens and earn 0.3% of all trades on this pair proportional to your share of the pool.
            </p>
            
            {/* Token Input Fields (simplified for this example) */}
            <div className="space-y-4">
              <div className="p-4 bg-card/80 rounded-2xl border border-border/50 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Token 1</span>
                  <span className="text-sm text-muted-foreground">
                    Balance: {token0Balance}
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="0.00"
                      className="token-amount-input"
                      value={amount0}
                      onChange={handleAmount0Change}
                    />
                  </div>
                  
                  <button 
                    className="token-selector shadow-sm hover:shadow-md transition-shadow flex-shrink-0"
                    onClick={() => setIsToken0SelectorOpen(true)}
                  >
                    <div className="token-logo">
                      {token0?.logoURI ? (
                        <img src={token0.logoURI} alt={token0.symbol} className="w-6 h-6 rounded-full" />
                      ) : (
                        <span className="text-xs">{token0?.symbol?.substring(0, 2) || 'T1'}</span>
                      )}
                    </div>
                    <span className="font-medium">{token0?.symbol || 'Select'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="flex justify-center -my-3 z-10 relative">
                <div className="swap-arrow shadow-sm hover:shadow-md bg-card/80 border-border/60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14"></path>
                    <path d="M5 12h14"></path>
                  </svg>
                </div>
              </div>
              
              <div className="p-4 bg-card/80 rounded-2xl border border-border/50 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Token 2</span>
                  <span className="text-sm text-muted-foreground">
                    Balance: {token1Balance}
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      placeholder="0.00"
                      className="token-amount-input"
                      value={amount1}
                      onChange={handleAmount1Change}
                    />
                  </div>
                  
                  <button 
                    className="token-selector shadow-sm hover:shadow-md transition-shadow flex-shrink-0"
                    onClick={() => setIsToken1SelectorOpen(true)}
                  >
                    <div className="token-logo">
                      {token1?.logoURI ? (
                        <img src={token1.logoURI} alt={token1.symbol} className="w-6 h-6 rounded-full" />
                      ) : (
                        <span className="text-xs">{token1?.symbol?.substring(0, 2) || 'T2'}</span>
                      )}
                    </div>
                    <span className="font-medium">{token1?.symbol || 'Select'}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-primary/5 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Pool share</span>
                <span className="font-medium">{token0 && token1 ? ((Number(amount0) / Number(amount1)) * 100).toFixed(2) : '0.00'}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">LP tokens received</span>
                <span className="font-medium">{token0 && token1 ? ((Number(amount0) / Number(amount1)) * 100).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full bg-gradient-to-r from-primary to-secondary text-white rounded-2xl shadow-glow-sm hover:shadow-glow-md py-6 text-lg font-semibold"
            disabled={!isConnected || !token0 || !token1 || !amount0 || !amount1}
            onClick={handleAddLiquidity}
          >
            {isConnected ? "Add Liquidity" : "Connect Wallet"}
          </Button>
        </DialogContent>
      </Dialog>
      
      <TokenSelector
        isOpen={isToken0SelectorOpen}
        onClose={() => setIsToken0SelectorOpen(false)}
        onSelect={handleToken0Select}
        selectedToken={token0 || undefined}
        excludeToken={token1 || undefined}
        tokens={availableTokens}
      />
      
      <TokenSelector
        isOpen={isToken1SelectorOpen}
        onClose={() => setIsToken1SelectorOpen(false)}
        onSelect={handleToken1Select}
        selectedToken={token1 || undefined}
        excludeToken={token0 || undefined}
        tokens={availableTokens}
      />
      
      <Footer />
    </>
  );
} 