/**
 * Contract addresses and configuration
 */

import { SWAP_ROUTER_ADDRESS, POOL_MANAGER_ADDRESS, POSITION_MANAGER_ADDRESS } from '../constants';
import { SWAP_ROUTER_ABI } from './abis';

// Re-export contract addresses for easier imports
export { SWAP_ROUTER_ADDRESS, POOL_MANAGER_ADDRESS, POSITION_MANAGER_ADDRESS };
export { SWAP_ROUTER_ABI };

// Contract configuration
export const CONTRACT_CONFIG = {
  swapRouter: {
    address: SWAP_ROUTER_ADDRESS,
    abi: SWAP_ROUTER_ABI
  },
  // Add other contracts as needed
}; 