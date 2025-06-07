import { TransactionResponse } from 'ethers';
import { getAccount } from 'wagmi/actions';
import { getContract } from '../utils/contract';
import { ERC20_ABI } from '../constants/abis';
import { SWAP_ROUTER_ADDRESS, SWAP_ROUTER_ABI } from '../constants/contracts';

/**
 * Get the swap router contract instance
 */
async function getSwapRouterContract() {
  return getContract(SWAP_ROUTER_ADDRESS, SWAP_ROUTER_ABI);
}

/**
 * Get an ERC20 token contract instance
 */
async function getErc20Contract(tokenAddress: string) {
  return getContract(tokenAddress, ERC20_ABI);
}

/**
 * Execute a multi-hop swap through multiple pools
 * @param tokens Array of token addresses forming the path
 * @param amountIn Input amount
 * @param minAmountOut Minimum amount out
 * @param recipient Recipient address
 * @param deadline Transaction deadline
 */
export async function executeMultiHopSwap(
  tokens: string[],
  amountIn: bigint,
  minAmountOut: bigint,
  recipient: string,
  deadline: number = Math.floor(Date.now() / 1000) + 1800 // 30 minutes from now
): Promise<TransactionResponse> {
  if (!tokens || tokens.length < 2) {
    throw new Error('Multi-hop swap requires at least 2 tokens');
  }

  const account = await getAccount();
  if (!account || !account.address) {
    throw new Error('Wallet not connected');
  }

  // Build the path for multi-hop swap
  // For V3, we need to encode the path with fees between each hop
  const fees = new Array(tokens.length - 1).fill(3000); // Default fee tier (0.3%)
  
  // Encode path for exactInput: tokenIn + fee + tokenOut + fee + ... + lastToken
  const path = encodePath(tokens, fees);
  
  const swapParams = {
    path,
    recipient,
    deadline,
    amountIn,
    amountOutMinimum: minAmountOut
  };

  const swapRouterContract = await getSwapRouterContract();
  
  // Approve the first token for the swap router
  const tokenContract = await getErc20Contract(tokens[0]);
  const allowance = await tokenContract.allowance(account.address, SWAP_ROUTER_ADDRESS);
  
  if (allowance < amountIn) {
    const approveTx = await tokenContract.approve(SWAP_ROUTER_ADDRESS, amountIn);
    await approveTx.wait();
  }
  
  // Execute the multi-hop swap
  return swapRouterContract.exactInput(swapParams);
}

/**
 * Encode a path for a multi-hop swap
 * @param tokens Array of token addresses
 * @param fees Array of fees (matching tokens.length - 1)
 */
function encodePath(tokens: string[], fees: number[]): string {
  if (tokens.length !== fees.length + 1) {
    throw new Error('tokens/fees length mismatch');
  }

  let encoded = '0x';
  for (let i = 0; i < tokens.length - 1; i++) {
    // Strip leading 0x from token addresses
    const tokenIn = tokens[i].startsWith('0x') ? tokens[i].slice(2) : tokens[i];
    // Add the fee as a 3-byte hex value (24 bits)
    const fee = fees[i].toString(16).padStart(6, '0');
    
    encoded += tokenIn + fee;
  }
  
  // Add the final token
  const lastToken = tokens[tokens.length - 1].startsWith('0x') 
    ? tokens[tokens.length - 1].slice(2) 
    : tokens[tokens.length - 1];
  
  encoded += lastToken;
  
  return encoded;
} 