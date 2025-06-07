/**
 * ZapSwap Constants
 * 
 * This file contains the constants used throughout the application
 * including contract addresses, fee tiers, and other configuration.
 */

// Contract Addresses for MegaETH Testnet
export const WETH9_ADDRESS = '0xCe5b8977f466421ed8665aEF48769f5E5e2F01cF';
export const POOL_MANAGER_ADDRESS = '0x3eF71b2E3c891d5013B0B458C8C1D810A5c8fDFd';
export const POSITION_MANAGER_ADDRESS = '0x945e31402f7cFf8E52D218C0d8Ad138e811d304a';
export const SWAP_ROUTER_ADDRESS = '0x93C78cD32C8b79C9EFAb7d3a2dfDC90B55c8d9BD';
export const ZAP_TOKEN_ADDRESS = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';

// RPC Endpoints
export const MEGAETH_TESTNET_RPC_URL = 'https://carrot.megaeth.com/rpc';
export const MEGAETH_TESTNET_WS_URL = 'wss://carrot.megaeth.com/ws';

// Fee Tiers
export const FEE_TIERS = [
  { fee: 0.0001, label: '0.01%', value: 10, tickSpacing: 1 },
  { fee: 0.0005, label: '0.05%', value: 50, tickSpacing: 10 },
  { fee: 0.003, label: '0.3%', value: 300, tickSpacing: 60 },
  { fee: 0.01, label: '1%', value: 1000, tickSpacing: 200 }
];

// Default Settings
export const DEFAULT_SLIPPAGE_TOLERANCE = 0.5; // 0.5%
export const DEFAULT_TRANSACTION_DEADLINE = 30; // 30 minutes
export const DEFAULT_FEE_TIER = 300; // 0.3%

// Network
export const MEGAETH_CHAIN_ID = 6342;
export const MEGAETH_EXPLORER_URL = 'https://megaexplorer.xyz';

// Price API endpoints
export const PRICE_API_URL = 'https://api.zapswap.com/prices';

// Realtime API settings
export const REALTIME_API_RETRY_ATTEMPTS = 5;
export const REALTIME_API_RETRY_DELAY = 1500; // ms 