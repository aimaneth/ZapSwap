'use client';

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import { realtimeAPI } from '@/lib/megaEthSdk';

// Hook for wallet connection with MegaETH
export const useWalletConnection = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isLoading: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({
    address,
    watch: true,
  });

  const [error, setError] = useState<string | null>(null);
  const [realtimeBalance, setRealtimeBalance] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // Set up error from connect operation
  useEffect(() => {
    if (connectError) {
      setError(connectError.message);
    } else {
      setError(null);
    }
  }, [connectError]);

  // Connect to Realtime API for balance updates
  useEffect(() => {
    if (isConnected && address) {
      // Initialize WebSocket connection
      realtimeAPI.connect().then(async (connected) => {
        if (connected) {
          try {
            // Subscribe to state changes for real-time balance updates
            const subId = await realtimeAPI.subscribeToStateChanges(
              [address],
              (stateChange) => {
                if (stateChange && stateChange.address && 
                    stateChange.address.toLowerCase() === address.toLowerCase()) {
                  // Update balance from state change
                  setRealtimeBalance(stateChange.balance);
                }
              }
            );
            
            // Store subscription ID for cleanup
            setSubscriptionId(subId);
          } catch (err) {
            console.error('Failed to subscribe to state changes:', err);
          }
        }
      });
    }

    // Cleanup function
    return () => {
      if (subscriptionId) {
        realtimeAPI.unsubscribe(subscriptionId).catch(console.error);
        setSubscriptionId(null);
      }
    };
  }, [isConnected, address]);

  // Handler for wallet connection
  const handleConnect = useCallback(async () => {
    try {
      setError(null);
      // Find Rainbow connector or fallback to first available
      const rainbowConnector = connectors.find(c => c.id === 'rainbow') || connectors[0];
      if (rainbowConnector) {
        await connect({ connector: rainbowConnector });
      } else {
        setError('No wallet connector available');
      }
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  }, [connect, connectors]);

  // Handler for wallet disconnection
  const handleDisconnect = useCallback(() => {
    try {
      disconnect();
      // Clean up Realtime API subscriptions
      if (subscriptionId) {
        realtimeAPI.unsubscribe(subscriptionId).catch(console.error);
        setSubscriptionId(null);
      }
    } catch (err) {
      console.error('Disconnection error:', err);
    }
  }, [disconnect, subscriptionId]);

  return {
    isConnected,
    account: address,
    isConnecting,
    error,
    balance: realtimeBalance || balanceData?.formatted || '0',
    network: 'testnet', // MegaETH testnet is the only network for now
    connect: handleConnect,
    disconnect: handleDisconnect
  };
}; 