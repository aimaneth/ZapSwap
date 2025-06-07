"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { POSITION_MANAGER_ADDRESS } from "@/lib/constants";
import { publicClient } from "@/lib/megaEthSdk";
import { formatUnits, parseUnits } from "viem";
import { writeContract, waitForTransaction, WriteContractResult } from "@wagmi/core";
import { toast } from "@/components/ui/use-toast";
import { MEGAETH_CHAIN_ID } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Position Manager ABI
const POSITION_MANAGER_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' }
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' }, 
      { name: 'index', type: 'uint256' }
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' }
    ],
    name: 'positions',
    outputs: [
      {
        components: [
          { name: 'token0', type: 'address' },
          { name: 'token1', type: 'address' },
          { name: 'fee', type: 'uint24' },
          { name: 'tickLower', type: 'int24' },
          { name: 'tickUpper', type: 'int24' },
          { name: 'liquidity', type: 'uint128' },
          { name: 'tokensOwed0', type: 'uint256' },
          { name: 'tokensOwed1', type: 'uint256' }
        ],
        name: 'position',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount0Desired', type: 'uint256' },
      { name: 'amount1Desired', type: 'uint256' },
      { name: 'amount0Min', type: 'uint256' },
      { name: 'amount1Min', type: 'uint256' }
    ],
    name: 'increaseLiquidity',
    outputs: [
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0Min', type: 'uint256' },
      { name: 'amount1Min', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ],
    name: 'decreaseLiquidity',
    outputs: [
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'amount0Max', type: 'uint128' },
      { name: 'amount1Max', type: 'uint128' }
    ],
    name: 'collect',
    outputs: [
      { name: 'amount0', type: 'uint128' },
      { name: 'amount1', type: 'uint128' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Token ABI (partial)
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Update the PositionResult type to match what's returned from the contract
type PositionStructOutput = {
  token0: `0x${string}`;
  token1: `0x${string}`;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
};

type Position = {
  id: string;
  token0: `0x${string}`;
  token1: `0x${string}`;
  token0Symbol: string;
  token1Symbol: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  priceLower: string;
  priceUpper: string;
  priceRange: string;
  apr: string;
  tvl: string;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
  token0Decimals: number;
  token1Decimals: number;
};

// Define a helper function to safely handle transaction hashes
const safeWaitForTransaction = async (txResult: WriteContractResult, chainId: number) => {
  return waitForTransaction({
    hash: txResult as unknown as `0x${string}`,
    chainId
  });
};

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for position management
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [managementAction, setManagementAction] = useState<'increase' | 'decrease' | 'collect' | null>(null);
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [txPending, setTxPending] = useState(false);
  const [removeLiquidityPercent, setRemoveLiquidityPercent] = useState(50);

  useEffect(() => {
    if (isConnected && address) {
      fetchPositions();
    } else {
      setLoading(false);
    }
  }, [address, isConnected]);

  const fetchPositions = async () => {
    try {
      if (!address) return;
      
      // Get number of positions for the connected wallet
      const balance = await publicClient({
        chainId: 6342
      }).readContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'balanceOf',
        args: [address]
      });

      const positionCount = Number(balance);
      
      if (positionCount === 0) {
        setLoading(false);
        return;
      }

      const positionPromises = [];

      // Fetch each position
      for (let i = 0; i < positionCount; i++) {
        positionPromises.push(fetchPositionDetails(i));
      }

      const fetchedPositions = await Promise.all(positionPromises);
      setPositions(fetchedPositions.filter(Boolean) as Position[]);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch positions:", error);
      setLoading(false);
    }
  };

  const fetchPositionDetails = async (index: number) => {
    try {
      if (!address) return null;
      
      // Get position ID
      const tokenId = await publicClient({
        chainId: 6342
      }).readContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'tokenOfOwnerByIndex',
        args: [address, BigInt(index)]
      }) as bigint;
      
      // Get position details
      const positionData = await publicClient({
        chainId: 6342
      }).readContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'positions',
        args: [tokenId]
      });
      
      // Cast the result to our expected structure
      const position = positionData as unknown as PositionStructOutput;
      
      // Extract values from position object
      const { token0, token1, fee, tickLower, tickUpper, liquidity, tokensOwed0, tokensOwed1 } = position;

      // Get token symbols and decimals
      const token0Symbol = await getTokenSymbol(token0);
      const token1Symbol = await getTokenSymbol(token1);
      const token0Decimals = await getTokenDecimals(token0);
      const token1Decimals = await getTokenDecimals(token1);
      
      // Calculate prices from ticks
      const priceLower = calculatePrice(tickLower, token0Decimals, token1Decimals);
      const priceUpper = calculatePrice(tickUpper, token0Decimals, token1Decimals);
      
      // Simulated values - in a real implementation, these would be calculated
      const apr = (Math.random() * 20).toFixed(2) + "%";
      const tvl = "$" + (Math.random() * 10000).toFixed(2);

      return {
        id: tokenId.toString(),
        token0,
        token1,
        token0Symbol,
        token1Symbol,
        fee,
        tickLower,
        tickUpper,
        liquidity,
        priceLower,
        priceUpper,
        priceRange: `${priceLower} - ${priceUpper}`,
        apr,
        tvl,
        tokensOwed0,
        tokensOwed1,
        token0Decimals,
        token1Decimals
      };
    } catch (error) {
      console.error(`Failed to fetch position ${index}:`, error);
      return null;
    }
  };

  const getTokenSymbol = async (tokenAddress: `0x${string}`) => {
    try {
      const symbol = await publicClient({
        chainId: 6342
      }).readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol'
      });
      return symbol;
    } catch (error) {
      console.error(`Failed to get token symbol for ${tokenAddress}:`, error);
      return "???";
    }
  };

  const getTokenDecimals = async (tokenAddress: `0x${string}`) => {
    try {
      const decimals = await publicClient({
        chainId: 6342
      }).readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals'
      });
      return decimals;
    } catch (error) {
      console.error(`Failed to get token decimals for ${tokenAddress}:`, error);
      return 18; // Default to 18 if we can't get the decimals
    }
  };

  const calculatePrice = (tick: number, decimals0: number, decimals1: number) => {
    // Formula: price = 1.0001^tick * 10^(decimals0 - decimals1)
    const price = 1.0001 ** tick * 10 ** (decimals1 - decimals0);
    return price.toFixed(6);
  };

  const handleIncreaseLiquidity = async () => {
    if (!selectedPosition || !address) return;
    
    try {
      setTxPending(true);
      
      // Convert token amounts to contract values (considering decimals)
      const amount0Value = amount0 ? parseUnits(amount0, selectedPosition.token0Decimals) : 0n;
      const amount1Value = amount1 ? parseUnits(amount1, selectedPosition.token1Decimals) : 0n;
      
      if (amount0Value === 0n && amount1Value === 0n) {
        toast({
          title: "Invalid amounts",
          description: "Please enter at least one token amount",
          variant: "destructive"
        });
        setTxPending(false);
        return;
      }
      
      // Calculate minimum amounts (for slippage protection, 0.5% slippage)
      const slippageFactor = 0.995; // 0.5% slippage
      const amount0Min = amount0Value ? (amount0Value * BigInt(Math.floor(slippageFactor * 1000)) / 1000n) : 0n;
      const amount1Min = amount1Value ? (amount1Value * BigInt(Math.floor(slippageFactor * 1000)) / 1000n) : 0n;
      
      // Approve tokens
      if (amount0Value > 0n) {
        await writeContract({
          address: selectedPosition.token0,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [POSITION_MANAGER_ADDRESS as `0x${string}`, amount0Value],
          chainId: MEGAETH_CHAIN_ID
        });
      }
      
      if (amount1Value > 0n) {
        await writeContract({
          address: selectedPosition.token1,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [POSITION_MANAGER_ADDRESS as `0x${string}`, amount1Value],
          chainId: MEGAETH_CHAIN_ID
        });
      }
      
      // Increase liquidity
      const txHash = await writeContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'increaseLiquidity',
        args: [
          BigInt(selectedPosition.id),
          amount0Value,
          amount1Value,
          amount0Min,
          amount1Min
        ],
        chainId: MEGAETH_CHAIN_ID
      });
      
      // Use our helper function
      await safeWaitForTransaction(txHash, MEGAETH_CHAIN_ID);
      
      toast({
        title: "Liquidity increased",
        description: "Your liquidity has been increased successfully"
      });
      
      // Refresh positions
      fetchPositions();
      
      // Reset form
      setAmount0("");
      setAmount1("");
      setManagementAction(null);
      setSelectedPosition(null);
      
    } catch (err: any) {
      console.error("Error increasing liquidity:", err);
      toast({
        title: "Transaction failed",
        description: err?.message || "Failed to increase liquidity",
        variant: "destructive"
      });
    } finally {
      setTxPending(false);
    }
  };

  const handleDecreaseLiquidity = async () => {
    if (!selectedPosition || !address) return;
    
    try {
      setTxPending(true);
      
      // Calculate liquidity to remove based on percentage
      const liquidityToRemove = (selectedPosition.liquidity * BigInt(removeLiquidityPercent)) / 100n;
      
      if (liquidityToRemove === 0n) {
        toast({
          title: "Invalid amount",
          description: "Please specify a valid percentage to remove",
          variant: "destructive"
        });
        setTxPending(false);
        return;
      }
      
      // Set minimum amounts to 0 for simplicity (would be calculated based on slippage in a real app)
      const amount0Min = 0n;
      const amount1Min = 0n;
      
      // Set deadline to 30 minutes from now
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
      
      // Decrease liquidity
      const txHash = await writeContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'decreaseLiquidity',
        args: [
          BigInt(selectedPosition.id),
          liquidityToRemove,
          amount0Min,
          amount1Min,
          deadline
        ],
        chainId: MEGAETH_CHAIN_ID
      });
      
      // Use our helper function
      await safeWaitForTransaction(txHash, MEGAETH_CHAIN_ID);
      
      toast({
        title: "Liquidity decreased",
        description: `${removeLiquidityPercent}% of your liquidity has been removed`
      });
      
      // Refresh positions
      fetchPositions();
      
      // Reset form
      setRemoveLiquidityPercent(50);
      setManagementAction(null);
      setSelectedPosition(null);
      
    } catch (err: any) {
      console.error("Error decreasing liquidity:", err);
      toast({
        title: "Transaction failed",
        description: err?.message || "Failed to decrease liquidity",
        variant: "destructive"
      });
    } finally {
      setTxPending(false);
    }
  };

  const handleCollectFees = async () => {
    if (!selectedPosition || !address) return;
    
    try {
      setTxPending(true);
      
      // Collect all available fees
      const txHash = await writeContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'collect',
        args: [
          BigInt(selectedPosition.id),
          address,
          // Set to max uint128 to collect all fees
          BigInt('0xffffffffffffffffffffffffffffffff'),
          BigInt('0xffffffffffffffffffffffffffffffff')
        ],
        chainId: MEGAETH_CHAIN_ID
      });
      
      // Use our helper function
      await safeWaitForTransaction(txHash, MEGAETH_CHAIN_ID);
      
      toast({
        title: "Fees collected",
        description: "Your fees have been collected successfully"
      });
      
      // Refresh positions
      fetchPositions();
      
      // Reset form
      setManagementAction(null);
      setSelectedPosition(null);
      
    } catch (err: any) {
      console.error("Error collecting fees:", err);
      toast({
        title: "Transaction failed",
        description: err?.message || "Failed to collect fees",
        variant: "destructive"
      });
    } finally {
      setTxPending(false);
    }
  };

  const formatTokenAmount = (amount: bigint, decimals: number) => {
    return parseFloat(formatUnits(amount, decimals)).toFixed(6);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 pt-44">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Your positions</h1>
            <Link href="/positions/create">
              <Button className="bg-primary hover:bg-primary/90 text-black shadow-glow-sm hover:shadow-glow-md">New position</Button>
            </Link>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center py-8">Loading positions...</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-44 pb-20">
        <div className="max-w-5xl w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Your positions</h1>
            <Link href="/positions/create">
              <Button className="bg-primary hover:bg-primary/90 text-black shadow-glow-sm hover:shadow-glow-md">New position</Button>
            </Link>
          </div>
          
          {positions.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">You don't have any liquidity positions yet</p>
                  <Link href="/positions/create">
                    <Button className="bg-primary hover:bg-primary/90 text-black shadow-glow-sm hover:shadow-glow-md">Create your first position</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {positions.map((position) => (
                <Card key={position.id} className="overflow-hidden">
                  <div className="p-4 bg-muted">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center mr-2">
                          <span className="font-semibold">{position.token0Symbol}/{position.token1Symbol}</span>
                        </div>
                        <div>
                          <h3 className="font-medium">{position.token0Symbol}/{position.token1Symbol}</h3>
                          <p className="text-sm text-muted-foreground">{position.fee / 10000}% fee tier</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">ID: {position.id}</p>
                      </div>
                    </div>
                  </div>
                  
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Price range</p>
                        <p className="font-medium">{position.priceRange}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">APR</p>
                        <p className="font-medium">{position.apr}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">TVL</p>
                        <p className="font-medium">{position.tvl}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Liquidity</p>
                        <p className="font-medium">{formatUnits(position.liquidity, 18)}</p>
                      </div>
                    </div>
                    
                    {/* Fees section */}
                    {(position.tokensOwed0 > 0n || position.tokensOwed1 > 0n) && (
                      <div className="bg-primary/10 p-3 rounded-md mb-4">
                        <p className="text-sm font-medium mb-1">Uncollected fees</p>
                        <div className="flex justify-between text-sm">
                          <span>{formatTokenAmount(position.tokensOwed0, position.token0Decimals)} {position.token0Symbol}</span>
                          <span>{formatTokenAmount(position.tokensOwed1, position.token1Decimals)} {position.token1Symbol}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedPosition(position);
                              setManagementAction('increase');
                            }}
                          >
                            Add liquidity
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add liquidity</DialogTitle>
                            <DialogDescription>
                              Add more tokens to your {position.token0Symbol}/{position.token1Symbol} position
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label htmlFor="amount0">Amount {position.token0Symbol}</Label>
                              <Input
                                id="amount0"
                                type="number"
                                placeholder="0"
                                value={amount0}
                                onChange={(e) => setAmount0(e.target.value)}
                              />
                            </div>
                            <div>
                              <Label htmlFor="amount1">Amount {position.token1Symbol}</Label>
                              <Input
                                id="amount1"
                                type="number"
                                placeholder="0"
                                value={amount1}
                                onChange={(e) => setAmount1(e.target.value)}
                              />
                            </div>
                          </div>
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90 text-black" 
                            onClick={handleIncreaseLiquidity}
                            disabled={txPending}
                          >
                            {txPending ? "Transaction pending..." : "Add liquidity"}
                          </Button>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedPosition(position);
                              setManagementAction('decrease');
                            }}
                          >
                            Remove
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove liquidity</DialogTitle>
                            <DialogDescription>
                              Remove liquidity from your {position.token0Symbol}/{position.token1Symbol} position
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <Label>Percentage to remove</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="range"
                                  min="1"
                                  max="100"
                                  value={removeLiquidityPercent}
                                  onChange={(e) => setRemoveLiquidityPercent(parseInt(e.target.value))}
                                />
                                <span>{removeLiquidityPercent}%</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            className="w-full bg-primary hover:bg-primary/90 text-black" 
                            onClick={handleDecreaseLiquidity}
                            disabled={txPending}
                          >
                            {txPending ? "Transaction pending..." : `Remove ${removeLiquidityPercent}%`}
                          </Button>
                        </DialogContent>
                      </Dialog>
                      
                      {(position.tokensOwed0 > 0n || position.tokensOwed1 > 0n) && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedPosition(position);
                                setManagementAction('collect');
                              }}
                            >
                              Collect fees
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Collect fees</DialogTitle>
                              <DialogDescription>
                                Collect fees from your {position.token0Symbol}/{position.token1Symbol} position
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="bg-muted p-4 rounded-md">
                                <p className="text-sm mb-2">Available fees:</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between">
                                    <span>{position.token0Symbol}:</span>
                                    <span>{formatTokenAmount(position.tokensOwed0, position.token0Decimals)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>{position.token1Symbol}:</span>
                                    <span>{formatTokenAmount(position.tokensOwed1, position.token1Decimals)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button 
                              className="w-full bg-primary hover:bg-primary/90 text-black" 
                              onClick={handleCollectFees}
                              disabled={txPending}
                            >
                              {txPending ? "Transaction pending..." : "Collect fees"}
                            </Button>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
} 