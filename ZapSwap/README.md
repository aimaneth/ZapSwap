# ZapSwap - Decentralized Exchange on MegaETH

ZapSwap is a decentralized exchange (DEX) built on the MegaETH network. This project implements a Uniswap v4 singleton pool system allowing users to swap tokens, provide liquidity, and earn fees.

## Features

- **Token Swapping**: Easily swap between tokens with automatic price discovery
- **Liquidity Provision**: Add liquidity to earn trading fees
- **Uniswap v4 Integration**: Implements Uniswap v4 singleton pool architecture
- **Ultra-Fast Transactions**: Leverages MegaETH's 10ms mini blocks for near-instant trading
- **Realtime Updates**: Uses MegaETH's Realtime API for immediate transaction feedback
- **Mobile Responsive**: Works across all devices

## Project Structure

```
ZapSwap/
├── src/                    # Frontend source code
│   ├── components/         # Reusable UI components
│   ├── lib/                # Utility functions and SDK integrations
│   ├── hooks/              # React hooks
│   ├── contexts/           # React context providers
│   └── ...
└── ...
```

## Smart Contracts

The project implements Uniswap v4 architecture with the following contracts:

1. **ZapToken (ZAP)**: The governance token of the ZapSwap platform
2. **PoolManager**: The singleton that manages all liquidity positions
3. **Hooks**: Custom hooks for extending functionality
4. **Swap Router**: Facilitates token swaps across pools

All contracts follow the ERC-20 standard and are compatible with the MegaETH testnet.

## Setting Up the Development Environment

### Prerequisites

- Node.js >= 16
- npm or yarn
- MetaMask or other Ethereum-compatible wallet

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/zapswap.git
   cd zapswap
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Connecting to MegaETH Blockchain

ZapSwap connects to the MegaETH blockchain through RainbowKit. Users need to:

1. Install a compatible wallet (MetaMask, Rainbow, etc.)
2. Add the MegaETH network (Chain ID: 6342)
3. Connect their wallet to the ZapSwap application

## Contract Integration

The frontend is designed to interact with existing ZapSwap smart contracts deployed on the MegaETH testnet. Contract addresses are configured in the application's environment settings.

## Integration with MegaETH Realtime API

ZapSwap leverages MegaETH's Realtime API for ultra-fast transaction processing and feedback. The integration is located in `src/lib/megaEthSdk.ts`.

Key features:
- Wallet connection management via RainbowKit
- Realtime transaction updates using WebSocket subscriptions
- Mini block monitoring for instant trade confirmations

## Testing

Run the test suite with:

```bash
npm test
```

## Contributing

We welcome contributions to ZapSwap! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Resources

- [MegaETH Documentation](https://docs.megaeth.com/)
- [MegaETH Realtime API](https://docs.megaeth.com/realtime-api)
- [Uniswap v4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [MegaETH Explorer](https://megaexplorer.xyz)

## Contact

For questions, please reach out to:
- Email: zapswap@example.com
- Discord: [ZapSwap Community](https://discord.gg/zapswap) 