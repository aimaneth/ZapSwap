/**
 * LiquidityService
 * 
 * Service for interacting with the PositionManager and PoolManager contracts
 */

import { publicClient, realtimeAPI } from '@/lib/megaEthSdk';
import { parseTokenAmount } from './tokenService';
import { formatUnits, encodePacked, keccak256, type Hash } from 'viem';
import { POSITION_MANAGER_ADDRESS, POOL_MANAGER_ADDRESS } from '@/lib/constants';
import { getContract } from '@/lib/utils/contract';
import { ERC20_ABI } from '@/lib/constants/abis';

// ABI fragments for the PositionManager
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
          { name: 'tokensOwed0', type: 'uint128' },
          { name: 'tokensOwed1', type: 'uint128' }
        ],
        name: 'position',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }, { name: 'index', type: 'uint256' }],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Pool Manager ABI fragment for getPool
const POOL_MANAGER_ABI = [
  {
    inputs: [
      { name: 'token0', type: 'address' },
      { name: 'token1', type: 'address' },
      { name: 'fee', type: 'uint24' }
    ],
    name: 'getPool',
    outputs: [
      { name: 'liquidity', type: 'uint128' },
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

// Types
export interface LiquidityPosition {
  id: string;
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: string;
  amount0: string;
  amount1: string;
}

export interface Pool {
  id: string;
  token0: string;
  token1: string;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
  volumeUSD24h: string;
  volumeUSD7d: string;
  tvlUSD: string;
  apr: string;
}

export interface AddLiquidityParams {
  token0: string;
  token1: string;
  fee: number;
  tickLower: number;
  tickUpper: number;
  amount0Desired: string;
  amount1Desired: string;
  amount0Min: string;
  amount1Min: string;
  recipient: string;
}

/**
 * Get all pools
 */
export async function getPools(): Promise<Pool[]> {
  try {
    // Get pools created so far - we're limiting to the tokens we have
    const supportedTokenPairs = [
      { token0: '0x0000000000000000000000000000000000000000', token1: '0xCe5b8977f466421ed8665aEF48769f5E5e2F01cF', fee: 3000 },
      { token0: '0xCe5b8977f466421ed8665aEF48769f5E5e2F01cF', token1: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', fee: 3000 }
    ];
    
    const pools = await Promise.all(
      supportedTokenPairs.map(async (pair) => {
        try {
          // Get pool data from the contract
          const poolData = await publicClient.readContract({
            address: POOL_MANAGER_ADDRESS as `0x${string}`,
            abi: POOL_MANAGER_ABI,
            functionName: 'getPool',
            args: [pair.token0, pair.token1, pair.fee]
          });
          
          // Generate a unique ID for the pool
          const id = keccak256(
            encodePacked(
              ['address', 'address', 'uint24'],
              [pair.token0, pair.token1, pair.fee]
            )
          );
          
          // Volume and TVL data would typically come from an indexer or API
          // We're setting defaults for demonstration
          return {
            id,
            token0: pair.token0,
            token1: pair.token1,
            fee: pair.fee,
            liquidity: poolData[0].toString(),
            sqrtPriceX96: poolData[1].toString(),
            tick: Number(poolData[2]),
            volumeUSD24h: '100000',
            volumeUSD7d: '700000',
            tvlUSD: '5000000',
            apr: '10.5'
          };
        } catch (error) {
          console.error(`Error fetching pool for pair ${pair.token0}/${pair.token1}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any null results (pools that don't exist)
    return pools.filter(Boolean) as Pool[];
  } catch (error) {
    console.error('Error getting pools:', error);
    throw error;
  }
}

/**
 * Get user positions
 */
export async function getUserPositions(userAddress: string): Promise<LiquidityPosition[]> {
  try {
    // Get the user's position NFT balance
    const balance = await publicClient.readContract({
      address: POSITION_MANAGER_ADDRESS as `0x${string}`,
      abi: POSITION_MANAGER_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });
    
    const positions: LiquidityPosition[] = [];
    
    // Get each position owned by the user
    for (let i = 0; i < Number(balance); i++) {
      // Get token ID
      const tokenId = await publicClient.readContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'tokenOfOwnerByIndex',
        args: [userAddress, i]
      });
      
      // Get position data
      const positionData = await publicClient.readContract({
        address: POSITION_MANAGER_ADDRESS as `0x${string}`,
        abi: POSITION_MANAGER_ABI,
        functionName: 'positions',
        args: [tokenId]
      });
      
      // Convert to a position object
      positions.push({
        id: tokenId.toString(),
        token0: positionData[0],
        token1: positionData[1],
        fee: Number(positionData[2]),
        tickLower: Number(positionData[3]),
        tickUpper: Number(positionData[4]),
        liquidity: positionData[5].toString(),
        // These would be actual token amounts based on current price
        amount0: '0', // Would calculate based on liquidity and price
        amount1: '0'  // Would calculate based on liquidity and price
      });
    }
    
    return positions;
  } catch (error) {
    console.error('Error getting user positions:', error);
    throw error;
  }
}

/**
 * Add liquidity to a pool
 */
export async function addLiquidity(params: AddLiquidityParams): Promise<{ tokenId: string, liquidity: string, amount0: string, amount1: string }> {
  try {
    // Parse amounts
    const amount0Desired = await parseTokenAmount(params.amount0Desired, params.token0);
    const amount1Desired = await parseTokenAmount(params.amount1Desired, params.token1);
    const amount0Min = await parseTokenAmount(params.amount0Min, params.token0);
    const amount1Min = await parseTokenAmount(params.amount1Min, params.token1);
    
    // Get contract instances
    const positionManager = await getContract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI);
    
    // If token0 is not ETH, approve it for the PositionManager
    if (params.token0 !== '0x0000000000000000000000000000000000000000') {
      const token0Contract = await getContract(params.token0, ERC20_ABI);
      const allowance = await token0Contract.allowance(params.recipient, POSITION_MANAGER_ADDRESS);
      
      if (allowance < amount0Desired) {
        const approveTx = await token0Contract.approve(POSITION_MANAGER_ADDRESS, amount0Desired);
        await approveTx.wait();
      }
    }
    
    // If token1 is not ETH, approve it for the PositionManager
    if (params.token1 !== '0x0000000000000000000000000000000000000000') {
      const token1Contract = await getContract(params.token1, ERC20_ABI);
      const allowance = await token1Contract.allowance(params.recipient, POSITION_MANAGER_ADDRESS);
      
      if (allowance < amount1Desired) {
        const approveTx = await token1Contract.approve(POSITION_MANAGER_ADDRESS, amount1Desired);
        await approveTx.wait();
      }
    }
    
    // Call mint function on Position Manager
    const tx = await positionManager.mint({
      token0: params.token0,
      token1: params.token1,
      fee: params.fee,
      tickLower: params.tickLower,
      tickUpper: params.tickUpper,
      amount0Desired,
      amount1Desired,
      amount0Min,
      amount1Min,
      recipient: params.recipient
    });
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    // Extract results from transaction receipt
    // This is simplified - in a real implementation, you'd parse the mint event
    return {
      tokenId: '1', // Would extract from receipt
      liquidity: '1000000000000000000', // Would extract from receipt
      amount0: formatUnits(amount0Desired, 18),
      amount1: formatUnits(amount1Desired, 18)
    };
  } catch (error) {
    console.error('Error adding liquidity:', error);
    throw error;
  }
}

/**
 * Remove liquidity from a position
 */
export async function removeLiquidity(
  tokenId: string,
  liquidity: string,
  amount0Min: string,
  amount1Min: string,
  deadline: number = Math.floor(Date.now() / 1000) + 1800 // 30 minutes from now
): Promise<{ amount0: string, amount1: string }> {
  try {
    // Parse amounts
    const liquidityBigInt = BigInt(liquidity);
    const amount0MinBigInt = await parseTokenAmount(amount0Min, '0x'); // Token address not needed for parsing here
    const amount1MinBigInt = await parseTokenAmount(amount1Min, '0x');
    
    // Get PositionManager contract
    const positionManager = await getContract(POSITION_MANAGER_ADDRESS, POSITION_MANAGER_ABI);
    
    // Call decreaseLiquidity function
    const tx = await positionManager.decreaseLiquidity({
      tokenId,
      liquidity: liquidityBigInt,
      amount0Min: amount0MinBigInt,
      amount1Min: amount1MinBigInt,
      deadline
    });
    
    // Wait for transaction to be mined
    const receipt = await tx.wait();
    
    // Extract results from transaction receipt
    // This is simplified - in a real implementation, you'd parse the event
    return {
      amount0: amount0Min, // Would extract from receipt
      amount1: amount1Min  // Would extract from receipt
    };
  } catch (error) {
    console.error('Error removing liquidity:', error);
    throw error;
  }
}

/**
 * Convert a tick to a price
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * Convert a price to a tick
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * Subscribe to liquidity events for a specific pool
 */
export async function subscribeToLiquidityEvents(
  token0: string,
  token1: string,
  fee: number,
  callback: (event: any) => void
): Promise<string> {
  try {
    // Create pool key hash
    const poolKeyHash = keccak256(
      encodePacked(
        ['address', 'address', 'uint24'],
        [
          token0 < token1 ? token0 : token1,
          token0 < token1 ? token1 : token0,
          fee
        ]
      )
    );
    
    // Subscribe to mint/burn events
    return await realtimeAPI.subscribeToLiquidityEvents(
      POSITION_MANAGER_ADDRESS,
      (event) => {
        // Filter for our specific pool
        if (event && event.topics && event.topics[1] === poolKeyHash) {
          callback(event);
        }
      }
    );
  } catch (error) {
    console.error('Error subscribing to liquidity events:', error);
    throw error;
  }
} 