// Token Service for ZapSwap
// Handles token fetching, balances, and token operations

import { publicClient } from '@/lib/megaEthSdk';
import { WETH9_ADDRESS, ZAP_TOKEN_ADDRESS } from '@/lib/constants';
import { formatUnits, parseUnits } from 'viem';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// These are the actual tokens deployed on MegaETH testnet
const MEGAETH_TOKENS: Token[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/token-logos/eth.png'
  },
  {
    address: WETH9_ADDRESS,
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    decimals: 18,
    logoURI: '/token-logos/eth.png' // Using ETH logo for WETH
  },
  {
    address: ZAP_TOKEN_ADDRESS,
    symbol: 'ZAP',
    name: 'ZapSwap Token',
    decimals: 18,
    logoURI: '/logo.png' // Using ZapSwap logo for ZAP token
  }
];

export async function getTokens(): Promise<Token[]> {
  try {
    // Fetch tokens deployed on MegaETH testnet
    // Note: We could enhance this by fetching metadata from the blockchain
    return MEGAETH_TOKENS;
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return MEGAETH_TOKENS; // Fallback to predefined tokens
  }
}

export async function getTokenBalance(tokenAddress: string, account: string): Promise<string> {
  try {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      // For ETH, get native balance
      const balance = await publicClient.getBalance({ address: account as `0x${string}` });
      return formatUnits(balance, 18);
    } else {
      // For ERC20 tokens
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'owner', type: 'address' }],
            outputs: [{ name: 'balance', type: 'uint256' }],
          },
        ],
        functionName: 'balanceOf',
        args: [account as `0x${string}`],
      });
      
      // Get token decimals
      const decimals = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: [
          {
            name: 'decimals',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{ name: '', type: 'uint8' }],
          },
        ],
        functionName: 'decimals',
      });
      
      return formatUnits(balance as bigint, Number(decimals));
    }
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return '0';
  }
}

export async function formatTokenAmount(amount: string, tokenAddress: string): Promise<string> {
  try {
    const tokens = await getTokens();
    const token = tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    const decimals = token?.decimals || 18;
    
    return formatUnits(parseUnits(amount, decimals), decimals);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return amount;
  }
}

export async function parseTokenAmount(amount: string, tokenAddress: string): Promise<bigint> {
  try {
    const tokens = await getTokens();
    const token = tokens.find(t => t.address.toLowerCase() === tokenAddress.toLowerCase());
    const decimals = token?.decimals || 18;
    
    return parseUnits(amount, decimals);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    return parseUnits('0', 18);
  }
} 