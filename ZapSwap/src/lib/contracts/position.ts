/**
 * Position management functions
 */

import { TransactionResponse } from 'ethers';
import { getAccount } from 'wagmi/actions';
import { getContract } from '../utils/contract';
import { POSITION_MANAGER_ADDRESS } from '../constants';

// Position Manager ABI (partial - just what we need)
const POSITION_MANAGER_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "address", "name": "recipient", "type": "address" },
      { "internalType": "uint128", "name": "amount0Max", "type": "uint128" },
      { "internalType": "uint128", "name": "amount1Max", "type": "uint128" }
    ],
    "name": "collect",
    "outputs": [
      { "internalType": "uint128", "name": "amount0", "type": "uint128" },
      { "internalType": "uint128", "name": "amount1", "type": "uint128" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
      { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
      { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "decreaseLiquidity",
    "outputs": [
      { "internalType": "uint256", "name": "amount0", "type": "uint256" },
      { "internalType": "uint256", "name": "amount1", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "uint256", "name": "amount0Desired", "type": "uint256" },
      { "internalType": "uint256", "name": "amount1Desired", "type": "uint256" },
      { "internalType": "uint256", "name": "amount0Min", "type": "uint256" },
      { "internalType": "uint256", "name": "amount1Min", "type": "uint256" },
      { "internalType": "uint256", "name": "deadline", "type": "uint256" }
    ],
    "name": "increaseLiquidity",
    "outputs": [
      { "internalType": "uint128", "name": "liquidity", "type": "uint128" },
      { "internalType": "uint256", "name": "amount0", "type": "uint256" },
      { "internalType": "uint256", "name": "amount1", "type": "uint256" }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
];

/**
 * Get the position manager contract instance
 */
async function getPositionManagerContract() {
  return getContract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI);
}

/**
 * Collect fees from a liquidity position
 * @param tokenId The ID of the position NFT
 * @param recipient Address to receive the collected fees
 * @param amount0Max Maximum amount of token0 to collect (use type.MaxUint128 for max)
 * @param amount1Max Maximum amount of token1 to collect (use type.MaxUint128 for max)
 */
export async function collectFees(
  tokenId: number,
  recipient?: string,
  amount0Max?: bigint,
  amount1Max?: bigint
): Promise<TransactionResponse> {
  const account = await getAccount();
  if (!account || !account.address) {
    throw new Error('Wallet not connected');
  }

  // Default to max uint128 if not specified
  const maxUint128 = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
  
  const collectParams = {
    tokenId,
    recipient: recipient || account.address,
    amount0Max: amount0Max || maxUint128,
    amount1Max: amount1Max || maxUint128
  };

  const positionManager = await getPositionManagerContract();
  return positionManager.collect(collectParams);
}

/**
 * Decrease liquidity in a position
 * @param tokenId The ID of the position NFT
 * @param liquidity Amount of liquidity to remove
 * @param amount0Min Minimum amount of token0 to receive
 * @param amount1Min Minimum amount of token1 to receive
 * @param deadline Transaction deadline
 */
export async function decreaseLiquidity(
  tokenId: number,
  liquidity: bigint,
  amount0Min: bigint,
  amount1Min: bigint,
  deadline: number = Math.floor(Date.now() / 1000) + 1800 // 30 minutes from now
): Promise<TransactionResponse> {
  const account = await getAccount();
  if (!account || !account.address) {
    throw new Error('Wallet not connected');
  }

  const decreaseLiquidityParams = {
    tokenId,
    liquidity,
    amount0Min,
    amount1Min,
    deadline
  };

  const positionManager = await getPositionManagerContract();
  return positionManager.decreaseLiquidity(decreaseLiquidityParams);
}

/**
 * Increase liquidity in a position
 * @param tokenId The ID of the position NFT
 * @param amount0Desired Desired amount of token0 to add
 * @param amount1Desired Desired amount of token1 to add
 * @param amount0Min Minimum amount of token0 to add
 * @param amount1Min Minimum amount of token1 to add
 * @param deadline Transaction deadline
 */
export async function increaseLiquidity(
  tokenId: number,
  amount0Desired: bigint,
  amount1Desired: bigint,
  amount0Min: bigint,
  amount1Min: bigint,
  deadline: number = Math.floor(Date.now() / 1000) + 1800 // 30 minutes from now
): Promise<TransactionResponse> {
  const account = await getAccount();
  if (!account || !account.address) {
    throw new Error('Wallet not connected');
  }

  const increaseLiquidityParams = {
    tokenId,
    amount0Desired,
    amount1Desired,
    amount0Min,
    amount1Min,
    deadline
  };

  const positionManager = await getPositionManagerContract();
  return positionManager.increaseLiquidity(increaseLiquidityParams);
} 