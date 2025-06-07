/**
 * Utility functions for calculating optimal liquidity ranges
 */

/**
 * Strategy types for position range calculation
 */
export enum RangeStrategy {
  WIDE = 'wide',       // Wide range for lower risk, lower fees
  MEDIUM = 'medium',   // Medium range for balanced risk/reward
  NARROW = 'narrow',   // Narrow range for higher risk, higher fees
  SPOT = 'spot',       // Very narrow range around current price
  CUSTOM = 'custom'    // Custom range specified by user
}

/**
 * Calculate tick range based on strategy
 * @param currentPrice Current price of the asset
 * @param strategy Range strategy
 * @param customRange Custom range percentage (if strategy is CUSTOM)
 * @param tickSpacing Tick spacing of the pool
 * @returns [lowerTick, upperTick]
 */
export function calculateTickRange(
  currentPrice: number,
  strategy: RangeStrategy,
  customRange: number = 0, // as percentage
  tickSpacing: number = 60 // default to 0.3% fee tier
): [number, number] {
  // Calculate price multipliers based on strategy
  let lowerPriceMultiplier: number;
  let upperPriceMultiplier: number;
  
  switch (strategy) {
    case RangeStrategy.WIDE:
      lowerPriceMultiplier = 0.7;  // -30%
      upperPriceMultiplier = 1.3;  // +30%
      break;
    case RangeStrategy.MEDIUM:
      lowerPriceMultiplier = 0.85; // -15%
      upperPriceMultiplier = 1.15; // +15%
      break;
    case RangeStrategy.NARROW:
      lowerPriceMultiplier = 0.95; // -5%
      upperPriceMultiplier = 1.05; // +5%
      break;
    case RangeStrategy.SPOT:
      lowerPriceMultiplier = 0.99; // -1%
      upperPriceMultiplier = 1.01; // +1%
      break;
    case RangeStrategy.CUSTOM:
      const rangeFactor = customRange / 100;
      lowerPriceMultiplier = 1 - rangeFactor;
      upperPriceMultiplier = 1 + rangeFactor;
      break;
    default:
      lowerPriceMultiplier = 0.85;
      upperPriceMultiplier = 1.15;
  }
  
  // Calculate lower and upper price bounds
  const lowerPrice = currentPrice * lowerPriceMultiplier;
  const upperPrice = currentPrice * upperPriceMultiplier;
  
  // Convert prices to ticks
  const lowerTick = priceToTick(lowerPrice);
  const upperTick = priceToTick(upperPrice);
  
  // Adjust ticks to be valid for the tick spacing
  const adjustedLowerTick = Math.floor(lowerTick / tickSpacing) * tickSpacing;
  const adjustedUpperTick = Math.ceil(upperTick / tickSpacing) * tickSpacing;
  
  return [adjustedLowerTick, adjustedUpperTick];
}

/**
 * Convert a price to a tick index
 * @param price The price to convert
 * @returns The corresponding tick index
 */
export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}

/**
 * Convert a tick index to a price
 * @param tick The tick index to convert
 * @returns The corresponding price
 */
export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

/**
 * Calculate the optimal token amounts for a position
 * @param price Current price
 * @param lowerTick Lower tick of the position
 * @param upperTick Upper tick of the position
 * @param totalValue Total value to invest (in terms of token0)
 * @returns [amount0, amount1] Optimal amounts of each token
 */
export function calculateOptimalAmounts(
  price: number,
  lowerTick: number,
  upperTick: number,
  totalValue: number
): [number, number] {
  const lowerPrice = tickToPrice(lowerTick);
  const upperPrice = tickToPrice(upperTick);
  
  // Calculate L (liquidity) based on the formula
  // For simplicity we use a basic approximation
  const L = totalValue / (2 * Math.sqrt(price));
  
  // Calculate amounts based on L and price range
  const amount0 = L * (Math.sqrt(upperPrice) - Math.sqrt(price)) / (Math.sqrt(price) * Math.sqrt(upperPrice));
  const amount1 = L * (Math.sqrt(price) - Math.sqrt(lowerPrice));
  
  return [amount0, amount1];
}

/**
 * Estimate impermanent loss for a position
 * @param initialPrice Initial price when position was created
 * @param currentPrice Current price
 * @returns Impermanent loss as a percentage
 */
export function estimateImpermanentLoss(initialPrice: number, currentPrice: number): number {
  const priceRatio = currentPrice / initialPrice;
  
  // Calculate impermanent loss using the standard formula
  const impermanentLoss = 2 * Math.sqrt(priceRatio) / (1 + priceRatio) - 1;
  
  return impermanentLoss * 100; // Return as percentage
}

/**
 * Calculate the price impact of a swap
 * @param amountIn Amount being swapped in
 * @param reserveIn Reserve of the input token
 * @param reserveOut Reserve of the output token
 * @returns Price impact as a percentage
 */
export function calculatePriceImpact(
  amountIn: number,
  reserveIn: number,
  reserveOut: number
): number {
  const k = reserveIn * reserveOut;
  const newReserveIn = reserveIn + amountIn;
  const newReserveOut = k / newReserveIn;
  
  const currentPrice = reserveOut / reserveIn;
  const newPrice = newReserveOut / newReserveIn;
  
  const priceImpact = (currentPrice - newPrice) / currentPrice * 100;
  
  return priceImpact;
} 