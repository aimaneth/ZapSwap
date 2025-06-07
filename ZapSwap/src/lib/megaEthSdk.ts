/**
 * MegaETH SDK Integration
 * 
 * This module provides integration with the MegaETH blockchain for ZapSwap,
 * implementing RainbowKit for wallet connections and Realtime API for instant updates.
 */

import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

// Define MegaETH Testnet chain configuration
export const megaEthTestnet = {
  id: 6342,
  name: 'MegaETH Testnet',
  network: 'megaeth-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MEGA Testnet Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://carrot.megaeth.com/rpc'] },
    default: { http: ['https://carrot.megaeth.com/rpc'] },
    websocket: { http: ['wss://carrot.megaeth.com/ws'] },
  },
  blockExplorers: {
    default: { name: 'MegaExplorer', url: 'https://megaexplorer.xyz' },
  },
};

// Configure chains and providers
export const { chains, publicClient } = configureChains(
  [megaEthTestnet],
  [publicProvider()]
);

// Get connectors for RainbowKit
export const { connectors } = getDefaultWallets({
  appName: 'ZapSwap',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '', // Get from environment variable
  chains,
});

// Create wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

// Realtime API WebSocket integration
export class MegaEthRealtime {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, (data: any) => void> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1500;
  
  constructor(private url: string = 'wss://carrot.megaeth.com/ws') {}
  
  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('Connected to MegaETH Realtime API');
        this.reconnectAttempts = 0;
        resolve(true);
        
        // Resubscribe to all active subscriptions
        this.resubscribe();
      };
      
      this.ws.onclose = () => {
        console.log('Disconnected from MegaETH Realtime API');
        this.attemptReconnect();
        resolve(false);
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        resolve(false);
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle subscription responses
          if (data.method === 'eth_subscription' && data.params?.subscription) {
            const subscription = this.subscriptions.get(data.params.subscription);
            if (subscription) {
              subscription(data.params.result);
            }
          }
          
          // Handle regular responses
          else if (data.id) {
            const subscription = this.subscriptions.get(`response_${data.id}`);
            if (subscription) {
              subscription(data);
              // Remove one-time response handlers
              if (data.result) {
                this.subscriptions.delete(`response_${data.id}`);
              }
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    });
  }
  
  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }
  
  private resubscribe() {
    // Create a list of all active subscriptions to reestablish
    const resubscribePromises: Promise<any>[] = [];
    
    // Keep track of subscription types and their parameters
    const subscriptionTypes = new Map<string, {method: string, params: any, callback: (data: any) => void}>();
    
    // Iterate through subscriptions to find the ones to reestablish
    this.subscriptions.forEach((callback, key) => {
      // Only process subscription IDs, not response IDs
      if (!key.startsWith('response_')) {
        const subType = subscriptionTypes.get(key);
        if (subType) {
          // Resubscribe with the same parameters
          const promise = this.subscribe(
            subType.method,
            subType.params,
            subType.callback
          ).catch(console.error);
          
          resubscribePromises.push(promise);
        }
      }
    });
    
    // Wait for all resubscriptions to complete
    return Promise.all(resubscribePromises);
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  /**
   * Subscribe to swap events from a specific contract
   */
  subscribeToSwapEvents(
    contractAddress: string, 
    callback: (event: any) => void
  ): Promise<string> {
    return this.subscribe(
      'logs',
      {
        address: contractAddress,
        topics: ['0x19b46758d95de0a6a1f5dc1e635421e8e8366557bb95aedc248b69b75dc19b78'], // Swap event topic
        fromBlock: 'pending',
        toBlock: 'pending'
      },
      callback
    );
  }
  
  /**
   * Subscribe to account state changes (balance, storage, etc.)
   */
  subscribeToStateChanges(
    addresses: string[], 
    callback: (stateChange: any) => void
  ): Promise<string> {
    return this.subscribe('stateChange', addresses, callback);
  }
  
  /**
   * Subscribe to mini blocks for transaction confirmations
   */
  subscribeToMiniBlocks(
    callback: (miniBlock: any) => void
  ): Promise<string> {
    return this.subscribe('fragments', null, callback);
  }
  
  /**
   * Track pending transactions and get notified when they're included in a mini block
   */
  trackTransaction(
    txHash: string,
    callback: (status: 'pending' | 'confirmed' | 'failed', receipt?: any) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // First, check if transaction is already in a mini block
      this.checkTransactionStatus(txHash)
        .then(status => {
          if (status !== 'pending') {
            callback(status);
            resolve('immediate');
            return;
          }

          // If pending, subscribe to mini blocks to watch for the transaction
          this.subscribeToMiniBlocks(miniBlock => {
            if (miniBlock && miniBlock.transactions) {
              const tx = miniBlock.transactions.find((tx: any) => 
                tx.hash && tx.hash.toLowerCase() === txHash.toLowerCase()
              );
              
              if (tx) {
                // Transaction found in a mini block
                callback('confirmed', tx);
                this.unsubscribe('immediate').catch(console.error);
              }
            }
          }).then(resolve).catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   * Check the status of a transaction
   */
  private async checkTransactionStatus(txHash: string): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      const id = Math.floor(Math.random() * 10000);
      const payload = {
        jsonrpc: '2.0',
        id,
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      };

      return new Promise((resolve) => {
        const checkReceipt = (data: any) => {
          if (data.result) {
            // Transaction has been processed
            resolve(data.result.status === '0x1' ? 'confirmed' : 'failed');
          } else {
            // Transaction is still pending
            resolve('pending');
          }
        };

        this.subscriptions.set(`response_${id}`, checkReceipt);
        this.ws?.send(JSON.stringify(payload));
      });
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return 'pending';
    }
  }
  
  /**
   * Generic subscribe method
   */
  private subscribe(
    method: string,
    params: any,
    callback: (data: any) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      const id = Math.floor(Math.random() * 10000);
      const subscriptionPayload = {
        jsonrpc: '2.0',
        id,
        method: 'eth_subscribe',
        params: params ? [method, params] : [method]
      };
      
      // Add response handler for the subscription ID
      this.subscriptions.set(`response_${id}`, (data: any) => {
        if (data.result) {
          // Store the callback with the subscription ID
          this.subscriptions.set(data.result, callback);
          resolve(data.result);
        } else if (data.error) {
          reject(new Error(data.error.message));
        }
      });
      
      this.ws.send(JSON.stringify(subscriptionPayload));
    });
  }
  
  /**
   * Unsubscribe from a subscription
   */
  unsubscribe(subscriptionId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      const id = Math.floor(Math.random() * 10000);
      const unsubscribePayload = {
        jsonrpc: '2.0',
        id,
        method: 'eth_unsubscribe',
        params: [subscriptionId]
      };
      
      // Add response handler
      this.subscriptions.set(`response_${id}`, (data: any) => {
        if (data.result) {
          // Remove the subscription
          this.subscriptions.delete(subscriptionId);
          resolve(true);
        } else if (data.error) {
          reject(new Error(data.error.message));
        }
      });
      
      this.ws.send(JSON.stringify(unsubscribePayload));
    });
  }
}

// Create a singleton instance of the Realtime API client
export const realtimeAPI = new MegaEthRealtime();

// Export a hook for using the Realtime API in components
export function useRealtimeAPI() {
  return realtimeAPI;
} 