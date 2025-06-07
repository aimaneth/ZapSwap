# ZapSwap - MegaETH DEX

ZapSwap is a decentralized exchange (DEX) built on MegaETH, providing swap and concentrated liquidity functionality with real-time updates.

## Features

### Smart Contract Integration

We've implemented comprehensive smart contract interactions with the following functionality:

1. **Swap Router Functions**
   - `exactInputSingle`: Used for single-hop swaps
   - `exactInput`: Implemented for multi-hop swaps through multiple pools

2. **Position Manager Functions**
   - `mint`: Creating new liquidity positions
   - `increaseLiquidity`: Adding liquidity to existing positions
   - `decreaseLiquidity`: Removing liquidity from positions
   - `collect`: Collecting fees earned from positions

3. **Pool Manager Functions**
   - Reading pool data and positions
   - Optimizing liquidity ranges based on different strategies

### MegaETH Realtime API Integration

Our application fully leverages the MegaETH Realtime API for instant updates:

1. **State Change Subscription**
   - Track account balances in real-time
   - Monitor token balances
   - Update UI instantly when user state changes

2. **Logs Subscription**
   - Subscribe to swap events for real-time price updates
   - Track liquidity events to show position changes

3. **Mini Block Subscription**
   - Monitor transaction confirmation status
   - Show transaction progress without waiting for full confirmation

4. **Transaction Tracking**
   - Track pending transactions
   - Notify users immediately when transactions are included in a mini block

## Technical Implementation

### Liquidity Optimization

We've implemented advanced mathematical utilities to help users optimize their liquidity positions:

- **Range Strategies**: From wide to spot positions based on risk tolerance
- **Impermanent Loss Calculation**: Show potential IL for different price movements
- **Optimal Token Allocation**: Calculate the best token ratios for given price ranges

### Swap Optimization

Our swap router implements:

- **Multi-hop Routing**: Find the most efficient path through multiple pools
- **Price Impact Calculation**: Show users the impact of their trades
- **Slippage Protection**: Ensure trades execute within acceptable ranges

## Getting Started

1. Clone this repository
2. Install dependencies with `npm install`
3. Run the development server with `npm run dev`
4. Connect your wallet to the MegaETH testnet

## Development

### Prerequisites

- Node.js 16+
- An Ethereum wallet (MetaMask, etc.)
- Access to the MegaETH testnet

### Environment Setup

Create a `.env.local` file with:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## License

MIT 