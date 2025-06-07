// Centralized token logos mapping to ensure consistent usage across the app

// Token logo mapping
// Using relative paths from the public/token-logos directory
export const TOKEN_LOGOS: Record<string, string> = {
  // Native tokens
  ETH: '/token-logos/eth.png',
  WETH: '/token-logos/eth.png', // Use ETH logo for WETH
  BTC: '/token-logos/wbtc.png',
  WBTC: '/token-logos/wbtc.png',
  
  // Stablecoins
  USDT: '/token-logos/usdt.png',
  USDC: '/token-logos/usdc.png',
  DAI: '/token-logos/dai.png',
  
  // DeFi tokens
  LINK: '/token-logos/link.png',
  AAVE: '/token-logos/aave.png',
  COMP: '/token-logos/comp.png',
  UNI: '/token-logos/uni.png',
  
  // L1/L2 native tokens
  MATIC: '/token-logos/matic.png', // Polygon
  BNB: '/token-logos/bnb.png',     // Binance Smart Chain
  
  // Project tokens
  ZAP: '/logo.png', // Use ZapSwap logo for ZAP token
};

/**
 * Gets a token logo URL based on token symbol
 * @param symbol Token symbol (e.g., 'ETH', 'USDT')
 * @returns URL to the token logo image
 */
export function getTokenLogo(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  
  // Return the token logo if found
  if (TOKEN_LOGOS[upperSymbol]) {
    return TOKEN_LOGOS[upperSymbol];
  }
  
  // Default placeholder for unknown tokens
  return `/token-logos/unknown.png`;
}

/**
 * Gets a token pair logo array
 * @param token0Symbol First token symbol
 * @param token1Symbol Second token symbol
 * @returns Array of logo URLs [token0Logo, token1Logo]
 */
export function getTokenPairLogos(token0Symbol: string, token1Symbol: string): [string, string] {
  return [
    getTokenLogo(token0Symbol),
    getTokenLogo(token1Symbol)
  ];
} 