'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { usePublicClient } from 'wagmi';
import { realtimeAPI } from '@/lib/megaEthSdk';
import { formatEther } from 'viem';

// Define the token interface
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance?: string;
}

// Define the context shape
interface ZapSwapContextType {
  // Wallet state - these come directly from useWalletConnection
  isConnected: boolean;
  account: string | undefined;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  balance: string;
  network: string;
  
  // Token state
  tokens: Token[];
  loadingTokens: boolean;
  tokenError: string | null;
  
  // Swap state
  swapLoading: boolean;
  swapError: string | null;
  
  // User balances
  getUserBalance: (tokenAddress: string) => Promise<string>;
  refreshBalances: () => Promise<void>;
}

// Create the context
const ZapSwapContext = createContext<ZapSwapContextType | undefined>(undefined);

// Provider component
export const ZapSwapProvider = ({ children }: { children: ReactNode }) => {
  // Get wallet connection state - this simplifies our code by using the hook
  const walletConnection = useWalletConnection();
  
  // Use wagmi to get client
  const publicClient = usePublicClient();
  
  // Token state
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  // Swap state
  const [swapLoading, setSwapLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);

  // Load some default tokens when the app starts
  useEffect(() => {
    setTokens([
      {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ether',
        decimals: 18,
        logoURI: '/eth-logo.png'
      },
      {
        address: '0x0000000000000000000000000000000000000001',
        symbol: 'ZAP',
        name: 'ZapToken',
        decimals: 18,
        logoURI: '/zap-logo.png'
      },
      {
        address: '0x0000000000000000000000000000000000000002',
        symbol: 'USDT',
        name: 'Tether USD',
        decimals: 6,
        logoURI: '/usdt-logo.png'
      },
      {
        address: '0x0000000000000000000000000000000000000003',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        logoURI: '/usdc-logo.png'
      }
    ]);
  }, []);

  // Load token pairs when connected
  useEffect(() => {
    const loadTokenPairs = async () => {
      if (walletConnection.isConnected) {
        setLoadingTokens(true);
        setTokenError(null);
        
        try {
          // In a production app, we would:
          // 1. Load all pools from the PoolManager
          // 2. Extract unique tokens from those pools
          // 3. Fetch metadata (name, symbol, decimals) for each token
          
          // For demonstration, we're using our hardcoded tokens
          await refreshBalances();
        } catch (error) {
          console.error('Failed to load tokens:', error);
          setTokenError('Failed to load tokens');
        } finally {
          setLoadingTokens(false);
        }
      }
    };
    
    loadTokenPairs();
  }, [walletConnection.isConnected, walletConnection.account]);

  // Fetch a user's token balance
  const getUserBalance = async (tokenAddress: string): Promise<string> => {
    if (!walletConnection.isConnected || !walletConnection.account) {
      return '0';
    }
    
    try {
      // For the native ETH token
      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
        // Use wagmi to get the balance
        const balance = await publicClient.getBalance({
          address: walletConnection.account as `0x${string}`
        });
        
        return formatEther(balance);
      }
      
      // For other tokens, use the token contract's balanceOf method
      const result = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: 'balance', type: 'uint256' }]
        }],
        functionName: 'balanceOf',
        args: [walletConnection.account as `0x${string}`]
      });
      
      return result ? formatEther(result as bigint) : '0';
    } catch (error) {
      console.error(`Failed to get balance for token ${tokenAddress}:`, error);
      return '0';
    }
  };

  // Refresh all token balances
  const refreshBalances = async () => {
    if (!walletConnection.isConnected || !walletConnection.account) {
      return;
    }
    
    const updatedTokens = await Promise.all(
      tokens.map(async (token) => {
        const balance = await getUserBalance(token.address);
        return { ...token, balance };
      })
    );
    
    setTokens(updatedTokens);
  };

  // Remove the real-time balance updates subscription as it's now handled in useWalletConnection

  const value = {
    // Wallet state - pass through from useWalletConnection
    ...walletConnection,
    
    // Token state
    tokens,
    loadingTokens,
    tokenError,
    
    // Swap state
    swapLoading,
    swapError,
    
    // User balances
    getUserBalance,
    refreshBalances,
  };

  return (
    <ZapSwapContext.Provider value={value}>
      {children}
    </ZapSwapContext.Provider>
  );
};

// Custom hook to use the context
export const useZapSwap = () => {
  const context = useContext(ZapSwapContext);
  if (context === undefined) {
    throw new Error('useZapSwap must be used within a ZapSwapProvider');
  }
  return context;
}; 