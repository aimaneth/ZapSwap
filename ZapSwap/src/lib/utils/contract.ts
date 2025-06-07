/**
 * Contract utility functions
 */

import { ethers } from 'ethers';
import { getWalletClient, getPublicClient } from 'wagmi/actions';
import { MEGAETH_CHAIN_ID } from '../constants';

/**
 * Get a contract instance with read-write capabilities
 * @param address Contract address
 * @param abi Contract ABI
 * @returns Contract instance
 */
export async function getContract(address: string, abi: any) {
  const walletClient = await getWalletClient({ chainId: MEGAETH_CHAIN_ID });
  
  if (!walletClient) {
    throw new Error('Wallet not connected');
  }
  
  // Create a wallet-connected contract instance
  return new ethers.Contract(
    address,
    abi,
    new ethers.BrowserProvider(walletClient)
  );
}

/**
 * Get a read-only contract instance
 * @param address Contract address
 * @param abi Contract ABI
 * @returns Read-only contract instance
 */
export async function getReadOnlyContract(address: string, abi: any) {
  const publicClient = getPublicClient({ chainId: MEGAETH_CHAIN_ID });
  
  if (!publicClient) {
    throw new Error('Provider not available');
  }
  
  // Create a read-only contract instance
  return new ethers.Contract(
    address,
    abi,
    new ethers.JsonRpcProvider(publicClient.transport.url)
  );
} 