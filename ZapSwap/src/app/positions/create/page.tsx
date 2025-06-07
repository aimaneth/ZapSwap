"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { POOL_MANAGER_ADDRESS, POSITION_MANAGER_ADDRESS, MEGAETH_CHAIN_ID, DEFAULT_SLIPPAGE_TOLERANCE, DEFAULT_TRANSACTION_DEADLINE } from "@/lib/constants";
import { publicClient } from "@/lib/megaEthSdk";
import { getContract } from "@/lib/utils/contract";
import { formatUnits, parseUnits } from "viem";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { writeContract, waitForTransaction, WriteContractResult } from "@wagmi/core";
import type { Hash } from "@wagmi/core";
import { toast } from "@/components/ui/use-toast";

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
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
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

// Sample token list - in a real app, this would come from a token list API or similar
const TOKENS = [
  { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "ETH", name: "Ether", decimals: 18 },
  { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18 },
  { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
];

// Updated FEE_TIERS with descriptions
const FEE_TIERS = [
  { fee: 0.0001, label: '0.01%', value: 10, tickSpacing: 1, description: "Best for very stable pairs" },
  { fee: 0.0005, label: '0.05%', value: 50, tickSpacing: 10, description: "Best for stable pairs" },
  { fee: 0.003, label: '0.3%', value: 300, tickSpacing: 60, description: "Best for most pairs" },
  { fee: 0.01, label: '1%', value: 1000, tickSpacing: 200, description: "Best for exotic pairs" }
];

// Position Manager ABI for creating positions
const POSITION_MANAGER_ABI = [
  {
    inputs: [
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' },
      { name: 'tickLower', type: 'int24' },
      { name: 'tickUpper', type: 'int24' },
      { name: 'amount0Desired', type: 'uint256' },
      { name: 'amount1Desired', type: 'uint256' },
      { name: 'amount0Min', type: 'uint256' },
      { name: 'amount1Min', type: 'uint256' },
      { name: 'recipient', type: 'address' }
    ],
    name: 'mint',
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'liquidity', type: 'uint128' },
      { name: 'amount0', type: 'uint256' },
      { name: 'amount1', type: 'uint256' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

// Pool Manager ABI for fetching price
const POOL_MANAGER_ABI = [
  {
    inputs: [
      { name: 'poolKey', type: 'tuple', components: [
        { name: 'currency0', type: 'address' },
        { name: 'currency1', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'tickSpacing', type: 'int24' },
        { name: 'hooks', type: 'address' }
      ]}
    ],
    name: 'getSlot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint16' },
      { name: 'hookFees', type: 'uint24' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

interface OrderedTokens {
  token0: typeof TOKENS[0];
  token1: typeof TOKENS[0];
  isReversed: boolean;
}

// Add the helper function to handle transaction hash conversions
const safeWaitForTransaction = async (txResult: WriteContractResult, chainId: number) => {
  return waitForTransaction({
    hash: txResult as unknown as `0x${string}`,
    chainId
  });
};

export default function CreatePositionPage() {
  const { address, isConnected } = useAccount();
  
  // Current step
  const [currentStep, setCurrentStep] = useState(1);
  
  // Token selection
  const [token0, setToken0] = useState(TOKENS[0]);
  const [token1, setToken1] = useState(TOKENS[1]);
  const [feeTier, setFeeTier] = useState(FEE_TIERS[2].value.toString());
  
  // Price range
  const [rangeType, setRangeType] = useState("full"); // full or custom
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currentPrice, setCurrentPrice] = useState("0"); 
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  
  // Deposit amounts
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [balance0, setBalance0] = useState("0");
  const [balance1, setBalance1] = useState("0");
  
  // Advanced options
  const [useHook, setUseHook] = useState(false);
  const [hookAddress, setHookAddress] = useState<string | null>(null);
  
  // Gas estimation
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // New states for transaction handling
  const [txPending, setTxPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get ordered tokens to ensure token0 < token1
  const getOrderedTokens = (): OrderedTokens => {
    const addr0 = token0.address.toLowerCase();
    const addr1 = token1.address.toLowerCase();
    
    if (addr0 < addr1) {
      return { token0, token1, isReversed: false };
    } else {
      return { token0: token1, token1: token0, isReversed: true };
    }
  };
  
  // Get tickSpacing for selected fee tier
  const getTickSpacingForFeeTier = (fee: string): number => {
    const feeTierObj = FEE_TIERS.find(tier => tier.value.toString() === fee);
    return feeTierObj?.tickSpacing || 60; // Default to 60 if not found
  };
  
  useEffect(() => {
    if (isConnected && address) {
      fetchBalances();
    }
  }, [address, isConnected, token0, token1]);
  
  // Fetch price when tokens or fee tier changes
  useEffect(() => {
    if (token0 && token1 && feeTier) {
      fetchCurrentPrice();
    }
  }, [token0, token1, feeTier]);
  
  const fetchCurrentPrice = async () => {
    try {
      setIsLoadingPrice(true);
      
      const { token0: orderedToken0, token1: orderedToken1, isReversed } = getOrderedTokens();
      const tickSpacing = getTickSpacingForFeeTier(feeTier);
      
      const poolKey = {
        currency0: orderedToken0.address as `0x${string}`,
        currency1: orderedToken1.address as `0x${string}`,
        fee: parseInt(feeTier),
        tickSpacing: tickSpacing,
        hooks: useHook && hookAddress ? hookAddress as `0x${string}` : "0x0000000000000000000000000000000000000000" as `0x${string}`
      };
      
      try {
        const slot0Data = await publicClient({
          chainId: MEGAETH_CHAIN_ID
        }).readContract({
          address: POOL_MANAGER_ADDRESS as `0x${string}`,
          abi: POOL_MANAGER_ABI,
          functionName: 'getSlot0',
          args: [poolKey]
        });
        
        // Calculate price from sqrtPriceX96
        const sqrtPriceX96 = slot0Data[0];
        const priceX96 = (sqrtPriceX96 * sqrtPriceX96) / (2n ** 192n);
        
        // Convert to decimal considering token decimals
        const decimalAdjustment = 10n ** BigInt(orderedToken1.decimals - orderedToken0.decimals);
        let price = Number(priceX96 * decimalAdjustment) / 2**96;
        
        // If tokens were reversed, invert the price
        if (isReversed) {
          price = 1 / price;
        }
        
        setCurrentPrice(price.toFixed(6));
        
        // Set default min and max prices based on current price
        if (!minPrice) {
          setMinPrice((price * 0.8).toFixed(6));
        }
        if (!maxPrice) {
          setMaxPrice((price * 1.2).toFixed(6));
        }
      } catch (error) {
        console.error("Pool may not exist yet, using default price:", error);
        // Set a default price (this would be replaced with an oracle in production)
        const defaultPrice = 2577.13;
        setCurrentPrice(defaultPrice.toString());
        
        // Set default min and max prices based on default price
        if (!minPrice) {
          setMinPrice((defaultPrice * 0.8).toFixed(6));
        }
        if (!maxPrice) {
          setMaxPrice((defaultPrice * 1.2).toFixed(6));
        }
      }
    } catch (error) {
      console.error("Failed to fetch current price:", error);
      // Fallback to a default price
      setCurrentPrice("2577.13");
    } finally {
      setIsLoadingPrice(false);
    }
  };
  
  const fetchBalances = async () => {
    try {
      if (!token0 || !token1 || !address) return;
      
      const balance0 = await publicClient({
        chainId: MEGAETH_CHAIN_ID
      }).readContract({
        address: token0.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      });
      
      const balance1 = await publicClient({
        chainId: MEGAETH_CHAIN_ID
      }).readContract({
        address: token1.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      });
      
      setBalance0(formatUnits(balance0, token0.decimals));
      setBalance1(formatUnits(balance1, token1.decimals));
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    }
  };
  
  const handleContinueToStep2 = () => {
    // Validate step 1
    if (!isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first"
      });
      return;
    }
    
    if (!token0 || !token1) {
      toast({
        title: "Select tokens",
        description: "Please select both tokens"
      });
      return;
    }
    
    if (token0.symbol === token1.symbol) {
      toast({
        title: "Invalid token selection",
        description: "Please select different tokens"
      });
      return;
    }
    
    // Proceed to step 2
    setCurrentStep(2);
  };
  
  // Helper function to convert price to tick
  const priceToTick = (price: number): number => {
    // Formula: tick = log(price) / log(1.0001)
    return Math.floor(Math.log(price) / Math.log(1.0001));
  };
  
  // Helper function to align tick to spacing
  const alignTickToSpacing = (tick: number, tickSpacing: number): number => {
    return Math.floor(tick / tickSpacing) * tickSpacing;
  };
  
  // Helper function to calculate minimum amounts (for slippage protection)
  const calculateMinAmounts = (amount0: string, amount1: string): [string, string] => {
    // Use fixed 0.5% slippage for minimum amounts (only relevant for validation)
    const slippageFactor = 0.995; // 0.5% slippage
    const min0 = amount0 ? (parseFloat(amount0) * slippageFactor).toString() : '0';
    const min1 = amount1 ? (parseFloat(amount1) * slippageFactor).toString() : '0';
    return [min0, min1];
  };
  
  // Function to validate deposit amounts against balances
  const validateAmounts = (): boolean => {
    if (amount0 && parseFloat(amount0) > parseFloat(balance0)) {
      toast({
        title: "Insufficient balance",
        description: `You don't have enough ${token0.symbol}`,
        variant: "destructive"
      });
      return false;
    }
    
    if (amount1 && parseFloat(amount1) > parseFloat(balance1)) {
      toast({
        title: "Insufficient balance",
        description: `You don't have enough ${token1.symbol}`,
        variant: "destructive"
      });
      return false;
    }
    
    if (!amount0 && !amount1) {
      toast({
        title: "Invalid amounts",
        description: "Please enter at least one token amount",
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };
  
  // Function to estimate gas for the transaction
  const estimateTransactionGas = async (
    orderedTokens: OrderedTokens,
    tickLower: number,
    tickUpper: number,
    amount0Value: bigint,
    amount1Value: bigint,
    amount0Min: bigint,
    amount1Min: bigint
  ) => {
    try {
      const tickSpacing = getTickSpacingForFeeTier(feeTier);
      
      // If we're using the actual tokens in the correct order
      const { token0: orderedToken0, token1: orderedToken1, isReversed } = orderedTokens;
      
      // Map amounts to the correct order
      const orderedAmount0 = isReversed ? amount1Value : amount0Value;
      const orderedAmount1 = isReversed ? amount0Value : amount1Value;
      const orderedAmount0Min = isReversed ? amount1Min : amount0Min;
      const orderedAmount1Min = isReversed ? amount0Min : amount1Min;
      
      // Since estimateGas isn't available directly, we'll use publicClient's estimateGas instead
      const gas = await publicClient({
        chainId: MEGAETH_CHAIN_ID
      }).estimateContractGas({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'mint',
        args: [
          orderedToken0.address as `0x${string}`,
          orderedToken1.address as `0x${string}`,
          parseInt(feeTier),
          tickLower,
          tickUpper,
          orderedAmount0,
          orderedAmount1,
          orderedAmount0Min,
          orderedAmount1Min,
          address as `0x${string}`
        ],
        account: address as `0x${string}`
      });
      
      return gas;
    } catch (error) {
      console.error("Failed to estimate gas:", error);
      return null;
    }
  };
  
  const handleCreatePosition = async () => {
    // Validate step 2
    if (rangeType === "custom" && (!minPrice || !maxPrice)) {
      toast({
        title: "Invalid price range",
        description: "Please enter a valid price range",
        variant: "destructive"
      });
      return;
    }
    
    if (!validateAmounts()) {
      return;
    }
    
    if (!isConnected || !address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a position",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      setTxPending(true);
      setError(null);
      
      // Get ordered tokens
      const orderedTokens = getOrderedTokens();
      const { token0: orderedToken0, token1: orderedToken1, isReversed } = orderedTokens;
      
      // Convert token amounts to contract values (considering decimals)
      const amount0Value = amount0 ? parseUnits(amount0, token0.decimals) : 0n;
      const amount1Value = amount1 ? parseUnits(amount1, token1.decimals) : 0n;
      
      // Map amounts to the correct order
      const orderedAmount0 = isReversed ? amount1Value : amount0Value;
      const orderedAmount1 = isReversed ? amount0Value : amount1Value;
      
      // Get tickSpacing for the selected fee tier
      const tickSpacing = getTickSpacingForFeeTier(feeTier);
      
      // Calculate tick ranges from prices
      let tickLower = -887272; // Min tick for uniswap v4
      let tickUpper = 887272;  // Max tick for uniswap v4
      
      if (rangeType === "custom") {
        // Convert price to ticks and align with tick spacing
        let lowerTick = priceToTick(parseFloat(minPrice));
        let upperTick = priceToTick(parseFloat(maxPrice));
        
        // If tokens are reversed, we need to invert the ticks
        if (isReversed) {
          const temp = -upperTick;
          upperTick = -lowerTick;
          lowerTick = temp;
        }
        
        // Align ticks with spacing
        tickLower = alignTickToSpacing(lowerTick, tickSpacing);
        tickUpper = alignTickToSpacing(upperTick, tickSpacing);
        
        // Ensure tickLower < tickUpper
        if (tickLower >= tickUpper) {
          tickUpper = tickLower + tickSpacing;
        }
      }
      
      // Calculate minimum amounts (for slippage protection)
      const [min0, min1] = calculateMinAmounts(amount0, amount1);
      const amount0Min = min0 ? parseUnits(min0, token0.decimals) : 0n;
      const amount1Min = min1 ? parseUnits(min1, token1.decimals) : 0n;
      
      // Map min amounts to the correct order
      const orderedAmount0Min = isReversed ? amount1Min : amount0Min;
      const orderedAmount1Min = isReversed ? amount0Min : amount1Min;
      
      // Estimate gas
      const estimatedGas = await estimateTransactionGas(
        orderedTokens,
        tickLower,
        tickUpper,
        orderedAmount0,
        orderedAmount1,
        orderedAmount0Min,
        orderedAmount1Min
      );
      
      if (estimatedGas) {
        setGasEstimate(estimatedGas);
      }
      
      // Approve tokens if needed
      if (amount0Value > 0n) {
        try {
          const approveTx = await writeContract({
            address: token0.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [POSITION_MANAGER_ADDRESS as `0x${string}`, amount0Value],
            chainId: MEGAETH_CHAIN_ID
          });
          
          await safeWaitForTransaction(approveTx, MEGAETH_CHAIN_ID);
        } catch (error) {
          console.error("Token0 approval failed:", error);
          throw new Error(`Failed to approve ${token0.symbol}: ${(error as Error).message}`);
        }
      }
      
      if (amount1Value > 0n) {
        try {
          const approveTx = await writeContract({
            address: token1.address as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [POSITION_MANAGER_ADDRESS as `0x${string}`, amount1Value],
            chainId: MEGAETH_CHAIN_ID
          });
          
          await safeWaitForTransaction(approveTx, MEGAETH_CHAIN_ID);
        } catch (error) {
          console.error("Token1 approval failed:", error);
          throw new Error(`Failed to approve ${token1.symbol}: ${(error as Error).message}`);
        }
      }
      
      // Create the position
      try {
        const mintTx = await writeContract({
          address: POSITION_MANAGER_ADDRESS as `0x${string}`,
          abi: POSITION_MANAGER_ABI,
          functionName: 'mint',
          args: [
            orderedToken0.address as `0x${string}`,
            orderedToken1.address as `0x${string}`,
            parseInt(feeTier),
            tickLower,
            tickUpper,
            orderedAmount0,
            orderedAmount1,
            orderedAmount0Min,
            orderedAmount1Min,
            address as `0x${string}`
          ],
          chainId: MEGAETH_CHAIN_ID
        });
        
        // Store transaction hash as string for UI display
        setTxHash(typeof mintTx === 'string' ? mintTx : String(mintTx));
        
        // Wait for transaction to complete
        await safeWaitForTransaction(mintTx, MEGAETH_CHAIN_ID);
        
        toast({
          title: "Position created successfully!",
          description: "Your new liquidity position has been created."
        });
        
        // Redirect to positions page
        window.location.href = '/positions';
      } catch (error) {
        console.error("Mint transaction failed:", error);
        throw error; // Rethrow to be caught by the outer catch block
      }
    } catch (err: any) {
      console.error("Error creating position:", err);
      
      // Specific error handling
      let errorMessage = "Failed to create position";
      
      if (err.message) {
        if (err.message.includes("Invalid token order")) {
          errorMessage = "Token order is invalid. Please try again.";
        } else if (err.message.includes("Invalid amounts")) {
          errorMessage = "Invalid token amounts. Please provide valid amounts.";
        } else if (err.message.includes("Invalid tick range")) {
          errorMessage = "Invalid price range. Please adjust your price range.";
        } else if (err.message.includes("Too much token0 used") || err.message.includes("Too much token1 used")) {
          errorMessage = "Slippage error. Try increasing slippage tolerance.";
        } else if (err.message.includes("Too little token0 used") || err.message.includes("Too little token1 used")) {
          errorMessage = "Minimum amount not met. Try increasing slippage tolerance.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast({
        title: "Transaction failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTxPending(false);
    }
  };
  
  return (
    <>
      <Navbar />
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-44 pb-20">
        <div className="max-w-5xl w-full mx-auto">
          <div className="mb-6">
            <Link href="/positions" className="text-sm text-primary hover:underline flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Your positions
            </Link>
          </div>
          
          <h1 className="text-2xl font-bold mb-6">New position</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="space-y-4">
                <div className={`bg-muted rounded-lg p-4 ${currentStep === 1 ? 'border-2 border-primary' : ''}`}>
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-foreground font-bold mr-2">
                      1
                    </div>
                    <div>
                      <h3 className="font-medium">Step 1</h3>
                      <p className="text-sm text-muted-foreground">Select token pair and fees</p>
                    </div>
                  </div>
                </div>
                
                <div className={`bg-muted rounded-lg p-4 ${currentStep === 2 ? 'border-2 border-primary' : ''}`}>
                  <div className="flex items-center mb-2">
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-foreground font-bold mr-2">
                      2
                    </div>
                    <div>
                      <h3 className="font-medium">Step 2</h3>
                      <p className="text-sm text-muted-foreground">Set price range and deposit amounts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              {currentStep === 1 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">Select pair</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose the tokens you want to provide liquidity for. You can select tokens on all supported networks.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <Select value={token0.symbol} onValueChange={(value) => setToken0(TOKENS.find(t => t.symbol === value) || TOKENS[0])}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOKENS.map((token) => (
                              <SelectItem key={token.address} value={token.symbol}>
                                <div className="flex items-center">
                                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2">
                                    {token.symbol.charAt(0)}
                                  </div>
                                  {token.symbol}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Select value={token1.symbol} onValueChange={(value) => setToken1(TOKENS.find(t => t.symbol === value) || TOKENS[1])}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select token" />
                          </SelectTrigger>
                          <SelectContent>
                            {TOKENS.map((token) => (
                              <SelectItem key={token.address} value={token.symbol}>
                                <div className="flex items-center">
                                  <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-white text-xs font-bold mr-2">
                                    {token.symbol.charAt(0)}
                                  </div>
                                  {token.symbol}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <Label className="block mb-2">Fee tier</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        The amount earned providing liquidity. Choose an amount that suits your risk tolerance and strategy.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {FEE_TIERS.map((tier) => (
                          <div
                            key={tier.value}
                            className={`p-3 border rounded-lg cursor-pointer ${
                              feeTier === tier.value.toString()
                                ? "border-primary bg-primary/10 dark:bg-primary/20"
                                : "border-border"
                            }`}
                            onClick={() => setFeeTier(tier.value.toString())}
                          >
                            <div className="font-medium">{tier.label} fee tier</div>
                            <div className="text-sm text-muted-foreground">{tier.description || `Tick spacing: ${tier.tickSpacing}`}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                      <Switch id="hook-switch" checked={useHook} onCheckedChange={setUseHook} />
                      <Label htmlFor="hook-switch" className="ml-2">Add a Hook (Advanced)</Label>
                        </div>
                      </div>
                      
                      {useHook && (
                        <div>
                          <Label htmlFor="hook-address" className="mb-1 block">Hook Address</Label>
                          <Input
                            id="hook-address"
                            value={hookAddress || ''}
                            onChange={(e) => setHookAddress(e.target.value)}
                            placeholder="0x..."
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Enter the address of the hook contract to use with this position
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-black shadow-glow-sm hover:shadow-glow-md" 
                      onClick={handleContinueToStep2}
                    >
                      Continue
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {currentStep === 2 && (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="text-xl font-semibold mb-4">Set price range</h2>
                    
                    <div className="bg-background border border-border rounded-lg p-4 mb-6">
                    <Tabs value={rangeType} onValueChange={setRangeType} className="mb-6">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="full">Full range</TabsTrigger>
                        <TabsTrigger value="custom">Custom range</TabsTrigger>
                      </TabsList>
                      
                        {/* Common price display for both tabs */}
                        <div className="flex justify-between items-center mb-2 bg-muted/30 p-2 rounded-md">
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                            </div>
                            <span className="text-sm">Current market price</span>
                          </div>
                          <div className="text-sm font-medium">
                            {isLoadingPrice ? (
                              <span className="text-muted-foreground">Loading price...</span>
                            ) : (
                              `${currentPrice} ${token1.symbol} per ${token0.symbol}`
                            )}
                          </div>
                        </div>
                        
                        <TabsContent value="full" className="mb-0">
                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                            <p className="text-sm text-muted-foreground">
                              Providing full range liquidity ensures continuous market participation across all
                              possible prices, offering simplicity but with potential for higher impermanent loss.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-background/10 rounded-md p-3 border border-border">
                              <div className="text-sm text-muted-foreground mb-2">Min price</div>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="border-0 bg-transparent text-2xl font-medium h-auto py-1 px-0 focus-visible:ring-0"
                                  value={minPrice === "0" ? "" : minPrice}
                                  onChange={(e) => {
                                    setMinPrice(e.target.value || "0");
                                    if (e.target.value && e.target.value !== "0") {
                                      setRangeType("custom");
                                    }
                                  }}
                                />
                                {(!minPrice || minPrice === "0") && (
                                  <div className="absolute top-0 left-0 text-2xl font-medium text-foreground/90 pointer-events-none">
                                    0
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {token1.symbol} per {token0.symbol}
                              </div>
                            </div>
                            
                            <div className="bg-background/10 rounded-md p-3 border border-border">
                              <div className="text-sm text-muted-foreground mb-2">Max price</div>
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="∞"
                                  className="border-0 bg-transparent text-2xl font-medium h-auto py-1 px-0 focus-visible:ring-0"
                                  value={maxPrice === "0" ? "" : maxPrice}
                                  onChange={(e) => {
                                    setMaxPrice(e.target.value || "0");
                                    if (e.target.value && e.target.value !== "0") {
                                      setRangeType("custom");
                                    }
                                  }}
                                />
                                {(!maxPrice || maxPrice === "0") && (
                                  <div className="absolute top-0 left-0 text-2xl font-medium text-foreground/90 pointer-events-none">
                                    ∞
                                  </div>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {token1.symbol} per {token0.symbol}
                              </div>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="custom" className="mb-0">
                        <p className="text-sm text-muted-foreground mb-4">
                          Custom range allows you to concentrate your liquidity within specific price bounds,
                          enhancing capital efficiency and fee earnings but requiring more active management.
                        </p>
                        
                        <div className="mb-4">
                          <div className="h-40 bg-muted rounded-md mb-4 relative">
                              {/* Price chart with visual price range indicator */}
                              <div className="absolute inset-0">
                                <div className="w-full h-full bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5 rounded-md">
                                  {/* Price line */}
                                  <div className="absolute top-0 bottom-0 w-px bg-primary/70 left-1/2 z-10"></div>
                                  
                                  {/* Price range visualization */}
                                  {minPrice && maxPrice && currentPrice && (
                                    <div 
                                      className="absolute bg-primary/30 border border-primary/50 rounded-md z-0"
                                      style={{
                                        left: `${Math.max(0, (parseFloat(minPrice) / parseFloat(currentPrice) * 100) - 50 + 50)}%`,
                                        right: `${Math.max(0, 100 - ((parseFloat(maxPrice) / parseFloat(currentPrice) * 100) - 50 + 50))}%`,
                                        top: '10%',
                                        bottom: '10%'
                                      }}
                                    ></div>
                                  )}
                                </div>
                              </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-muted-foreground z-20">{token0.symbol}/{token1.symbol} price chart</p>
                            </div>
                          </div>
                          
                            <div className="flex justify-between mb-4">
                            <Button size="sm" variant="outline">1D</Button>
                            <Button size="sm" variant="outline">1W</Button>
                            <Button size="sm" variant="outline">1M</Button>
                            <Button size="sm" variant="outline">1Y</Button>
                            <Button size="sm" variant="outline">All time</Button>
                            <Button size="sm" variant="outline">Reset</Button>
                          </div>
                        </div>
                        
                          <div className="space-y-6 mb-4">
                          <div>
                              <div className="flex justify-between mb-1">
                            <Label htmlFor="min-price">Min price</Label>
                                <span className="text-xs text-muted-foreground">
                                  {minPrice && currentPrice ? `${((parseFloat(minPrice) / parseFloat(currentPrice)) * 100).toFixed(2)}% of current price` : ''}
                                </span>
                              </div>
                              <div className="flex mb-1">
                              <Input
                                id="min-price"
                                type="number"
                                placeholder="0"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                  className="rounded-r-none"
                              />
                                <div className="bg-muted border border-l-0 border-input px-3 inline-flex items-center rounded-r-md text-sm">
                                  {token1.symbol} per {token0.symbol}
                            </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setMinPrice((parseFloat(currentPrice) * 0.5).toString())}
                                >
                                  50%
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setMinPrice((parseFloat(currentPrice) * 0.75).toString())}
                                >
                                  75%
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setMinPrice((parseFloat(currentPrice) * 0.9).toString())}
                                >
                                  90%
                                </Button>
                                <div className="flex-grow">
                                  <Slider 
                                    value={[minPrice && currentPrice ? Math.min(100, (parseFloat(minPrice) / parseFloat(currentPrice)) * 100) : 0]} 
                                    min={0} 
                                    max={100} 
                                    step={1} 
                                    onValueChange={(value) => setMinPrice((parseFloat(currentPrice) * (value[0] / 100)).toString())}
                                  />
                                </div>
                              </div>
                          </div>
                          
                          <div>
                              <div className="flex justify-between mb-1">
                            <Label htmlFor="max-price">Max price</Label>
                                <span className="text-xs text-muted-foreground">
                                  {maxPrice && currentPrice ? `${((parseFloat(maxPrice) / parseFloat(currentPrice)) * 100).toFixed(2)}% of current price` : ''}
                                </span>
                              </div>
                              <div className="flex mb-1">
                              <Input
                                id="max-price"
                                type="number"
                                placeholder="∞"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                  className="rounded-r-none"
                              />
                                <div className="bg-muted border border-l-0 border-input px-3 inline-flex items-center rounded-r-md text-sm">
                                  {token1.symbol} per {token0.symbol}
                            </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setMaxPrice((parseFloat(currentPrice) * 1.1).toString())}
                                >
                                  110%
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setMaxPrice((parseFloat(currentPrice) * 1.25).toString())}
                                >
                                  125%
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setMaxPrice((parseFloat(currentPrice) * 1.5).toString())}
                                >
                                  150%
                                </Button>
                                <div className="flex-grow">
                                  <Slider 
                                    value={[maxPrice && currentPrice ? Math.min(200, (parseFloat(maxPrice) / parseFloat(currentPrice)) * 100) : 200]} 
                                    min={100} 
                                    max={200} 
                                    step={1} 
                                    onValueChange={(value) => setMaxPrice((parseFloat(currentPrice) * (value[0] / 100)).toString())}
                                  />
                                </div>
                              </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                    </div>
                    
                    <h2 className="text-xl font-semibold mb-4">Deposit tokens</h2>
                    
                    <div className="bg-background border border-border rounded-lg mb-6 overflow-hidden">
                      <div className="p-6">
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2">
                                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                                  {token0.symbol.charAt(0)}
                        </div>
                              </div>
                              <span className="font-medium">{token0.symbol}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setAmount0(balance0)}
                              className="text-xs text-muted-foreground hover:text-foreground"
                              disabled={parseFloat(balance0) <= 0}
                            >
                              Balance: {parseFloat(balance0).toFixed(4)}
                            </Button>
                          </div>
                          
                          <div className="relative">
                          <Input
                            id="amount0"
                            type="number"
                            placeholder="0"
                            value={amount0}
                            onChange={(e) => setAmount0(e.target.value)}
                              className="bg-muted/50 text-3xl font-medium h-16 px-4 py-2 border-border focus-visible:ring-primary"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setAmount0((parseFloat(balance0) * 0.25).toString())}
                                disabled={parseFloat(balance0) <= 0}
                              >
                                25%
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setAmount0((parseFloat(balance0) * 0.5).toString())}
                                disabled={parseFloat(balance0) <= 0}
                              >
                                50%
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setAmount0((parseFloat(balance0) * 0.75).toString())}
                                disabled={parseFloat(balance0) <= 0}
                              >
                                75%
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setAmount0(balance0)}
                                disabled={parseFloat(balance0) <= 0}
                              >
                            Max
                          </Button>
                        </div>
                          </div>
                          
                          <div className="mt-1 flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">${parseFloat(amount0 || "0") * parseFloat(currentPrice || "0")}</p>
                          </div>
                        </div>
                        
                        <div className="my-4">
                          <div className="flex items-center">
                            <div className="flex-grow h-px bg-border"></div>
                            <div className="mx-4 text-muted-foreground text-sm">and</div>
                            <div className="flex-grow h-px bg-border"></div>
                          </div>
                      </div>
                      
                      <div>
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary mr-2">
                                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-white text-sm font-bold">
                                  {token1.symbol.charAt(0)}
                        </div>
                              </div>
                              <span className="font-medium">{token1.symbol}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setAmount1(balance1)}
                              className="text-xs text-muted-foreground hover:text-foreground"
                              disabled={parseFloat(balance1) <= 0}
                            >
                              Balance: {parseFloat(balance1).toFixed(4)}
                            </Button>
                          </div>
                          
                          <div className="relative">
                          <Input
                            id="amount1"
                            type="number"
                            placeholder="0"
                            value={amount1}
                            onChange={(e) => setAmount1(e.target.value)}
                              className="bg-muted/50 text-3xl font-medium h-16 px-4 py-2 border-border focus-visible:ring-primary"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setAmount1((parseFloat(balance1) * 0.25).toString())}
                                disabled={parseFloat(balance1) <= 0}
                              >
                                25%
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setAmount1((parseFloat(balance1) * 0.5).toString())}
                                disabled={parseFloat(balance1) <= 0}
                              >
                                50%
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setAmount1((parseFloat(balance1) * 0.75).toString())}
                                disabled={parseFloat(balance1) <= 0}
                              >
                                75%
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setAmount1(balance1)}
                                disabled={parseFloat(balance1) <= 0}
                              >
                            Max
                          </Button>
                        </div>
                          </div>
                          
                          <div className="mt-1 flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">${parseFloat(amount1 || "0")}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Replace Advanced Settings with this placeholder for gas estimate */}
                    {gasEstimate && (
                      <div className="bg-background border border-border rounded-lg mb-6 overflow-hidden">
                        <div className="p-4">
                          <h3 className="font-medium mb-2">Gas Estimate</h3>
                          <div className="text-sm font-medium">{gasEstimate.toString()} gas units</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            This is an estimate and the actual gas used may vary.
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {error && (
                      <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6">
                        <h3 className="font-medium text-destructive mb-1">Error</h3>
                        <p className="text-sm">{error}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-4">
                      <Button 
                        variant="outline"
                        className="w-1/3" 
                        onClick={() => setCurrentStep(1)}
                      >
                        Back
                      </Button>
                      
                      <Button 
                        className="w-2/3 bg-primary hover:bg-primary/90 text-black shadow-glow-sm hover:shadow-glow-md" 
                        onClick={handleCreatePosition}
                        disabled={loading || txPending}
                      >
                        {txPending ? "Transaction pending..." : loading ? "Creating position..." : "Create position"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
} 