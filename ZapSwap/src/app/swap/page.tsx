'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { TokenSelector } from '@/components/TokenSelector';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { Button } from '@/components/ui/button';
import { getSwapQuote, executeSwap, subscribeToSwapEvents } from '@/services/swapService';
import { getTokens, getTokenBalance, Token } from '@/services/tokenService';
import { DEFAULT_SLIPPAGE_TOLERANCE, DEFAULT_TRANSACTION_DEADLINE } from '@/lib/constants';
import { MEGAETH_EXPLORER_URL } from '@/lib/constants';
import { realtimeAPI } from '@/lib/megaEthSdk';

export default function SwapPage() {
  // Token state
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [fromTokenBalance, setFromTokenBalance] = useState('0');
  const [toTokenBalance, setToTokenBalance] = useState('0');
  
  // UI state
  const [slippage, setSlippage] = useState(`${DEFAULT_SLIPPAGE_TOLERANCE}`);
  const [priceImpact, setPriceImpact] = useState('0.00');
  const [showSettings, setShowSettings] = useState(false);
  const [isFromTokenOpen, setIsFromTokenOpen] = useState(false);
  const [isToTokenOpen, setIsToTokenOpen] = useState(false);
  const [swapQuote, setSwapQuote] = useState<any>(null);
  
  // Transaction state
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [realtimeSubscriptionId, setRealtimeSubscriptionId] = useState<string | null>(null);
  
  // Wallet connection
  const { 
    isConnected, 
    account, 
    connect, 
    error: walletError 
  } = useWalletConnection();

  // Load available tokens
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const tokens = await getTokens();
        setAvailableTokens(tokens);
        
        // Set default tokens
        if (!fromToken && tokens.length > 0) {
          setFromToken(tokens[0]); // ETH as default
        }
        
        if (!toToken && tokens.length > 1) {
          setToToken(tokens[1]); // WETH as default
        }
      } catch (error) {
        console.error('Failed to load tokens:', error);
      }
    };
    
    loadTokens();
  }, []);
  
  // Load token balances when connected
  useEffect(() => {
    const loadBalances = async () => {
      if (isConnected && account && fromToken && toToken) {
        try {
          const fromBalance = await getTokenBalance(fromToken.address, account);
          const toBalance = await getTokenBalance(toToken.address, account);
          
          setFromTokenBalance(fromBalance);
          setToTokenBalance(toBalance);
        } catch (error) {
          console.error('Failed to load balances:', error);
        }
      }
    };
    
    loadBalances();
  }, [isConnected, account, fromToken, toToken]);

  // Subscribe to swap events for real-time updates
  useEffect(() => {
    const setupSwapListener = async () => {
      if (isConnected && fromToken && toToken) {
        try {
          // Clean up any existing subscription
          if (realtimeSubscriptionId) {
            await realtimeAPI.unsubscribe(realtimeSubscriptionId);
          }
          
          // Subscribe to swap events for our token pair
          const subscriptionId = await subscribeToSwapEvents(
            fromToken.address,
            toToken.address,
            3000, // Default fee tier
            (event) => {
              // When a swap happens, refresh balances and clear states
              loadBalances();
              // Update UI to show the real-time update
              console.log('Swap event received:', event);
            }
          );
          
          setRealtimeSubscriptionId(subscriptionId);
        } catch (error) {
          console.error('Failed to subscribe to swap events:', error);
        }
      }
    };
    
    const loadBalances = async () => {
      if (isConnected && account && fromToken && toToken) {
        try {
          const fromBalance = await getTokenBalance(fromToken.address, account);
          const toBalance = await getTokenBalance(toToken.address, account);
          
          setFromTokenBalance(fromBalance);
          setToTokenBalance(toBalance);
        } catch (error) {
          console.error('Failed to load balances:', error);
        }
      }
    };
    
    setupSwapListener();
    
    // Cleanup on unmount
    return () => {
      if (realtimeSubscriptionId) {
        realtimeAPI.unsubscribe(realtimeSubscriptionId).catch(console.error);
      }
    };
  }, [isConnected, fromToken, toToken, account]);

  // Get swap quote when inputs change
  useEffect(() => {
    const getQuote = async () => {
      if (fromToken && toToken && fromAmount && Number(fromAmount) > 0) {
        try {
          const quote = await getSwapQuote(
            fromToken.address,
            toToken.address,
            fromAmount,
            Number(slippage)
          );
          
          setToAmount(quote.amountOut);
          setPriceImpact(quote.priceImpact);
          setSwapQuote(quote);
        } catch (error) {
          console.error('Failed to get swap quote:', error);
          setToAmount('');
          setPriceImpact('0.00');
          setSwapQuote(null);
        }
      } else {
        setToAmount('');
        setPriceImpact('0.00');
        setSwapQuote(null);
      }
    };
    
    getQuote();
  }, [fromToken, toToken, fromAmount, slippage]);

  const handleFromAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFromAmount(value);
    }
  };

  const handleFromTokenSelect = (token: Token) => {
    if (token.address === toToken?.address) {
      // If same as toToken, swap them
      setToToken(fromToken);
    }
    setFromToken(token);
    setIsFromTokenOpen(false);
  };

  const handleToTokenSelect = (token: Token) => {
    if (token.address === fromToken?.address) {
      // If same as fromToken, swap them
      setFromToken(toToken);
    }
    setToToken(token);
    setIsToTokenOpen(false);
  };

  const switchTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };

  const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSlippage(value);
    }
  };

  // Calculate minimum amount to receive based on slippage
  const getMinimumReceived = () => {
    if (!swapQuote) return '0';
    return swapQuote.minimumAmountOut;
  };

  // Calculate liquidity provider fee
  const getLiquidityProviderFee = () => {
    if (!swapQuote) return '0';
    return swapQuote.fee;
  };

  // Execute the swap
  const handleSwap = async () => {
    if (!isConnected) {
      connect();
      return;
    }
    
    if (!fromToken || !toToken || !fromAmount || !toAmount) {
      return;
    }
    
    setIsSwapping(true);
    setSwapError(null);
    setTxHash(null);
    
    try {
      // Calculate deadline (30 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + DEFAULT_TRANSACTION_DEADLINE * 60;
      
      // Get minimum amount out from quote
      const minAmountOut = getMinimumReceived();
      
      // Execute the swap
      const hash = await executeSwap(
        fromToken.address,
        toToken.address,
        fromAmount,
        minAmountOut,
        account!,
        deadline,
        3000 // Default fee tier (0.3%)
      );
      
      setTxHash(hash);
      
      // Clear input after successful swap
      setFromAmount('');
      setToAmount('');
      
      // Refresh balances
      if (account) {
        const fromBalance = await getTokenBalance(fromToken.address, account);
        const toBalance = await getTokenBalance(toToken.address, account);
        
        setFromTokenBalance(fromBalance);
        setToTokenBalance(toBalance);
      }
    } catch (error) {
      console.error('Swap failed:', error);
      setSwapError(error instanceof Error ? error.message : 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const getButtonText = () => {
    if (!isConnected) {
      return 'Connect Wallet';
    }
    
    if (!fromToken || !toToken) {
      return 'Select tokens';
    }
    
    if (!fromAmount) {
      return 'Enter an amount';
    }
    
    if (Number(fromAmount) > Number(fromTokenBalance)) {
      return 'Insufficient balance';
    }
    
    return 'Swap';
  };

  const getButtonDisabled = () => {
    return !isConnected || 
           !fromToken || 
           !toToken || 
           !fromAmount || 
           Number(fromAmount) <= 0 ||
           Number(fromAmount) > Number(fromTokenBalance) ||
           isSwapping;
  };

  return (
    <>
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-44 pb-20">
        <div className="swap-container max-w-lg w-full mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-foreground">Swap</h1>
            
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
          
          {/* Settings panel */}
          {showSettings && (
            <div className="mb-6 p-4 bg-card/80 rounded-2xl border border-border/50 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-foreground mb-2">Transaction Settings</h3>
              <div>
                <label className="text-sm text-muted-foreground">Slippage Tolerance</label>
                <div className="flex mt-1 space-x-2">
                  {['0.1', '0.5', '1.0'].map((value) => (
                    <button
                      key={value}
                      onClick={() => setSlippage(value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm ${
                        slippage === value 
                          ? 'bg-primary/20 text-primary shadow-glow-sm' 
                          : 'bg-background-light text-muted-foreground hover:bg-primary/10'
                      }`}
                    >
                      {value}%
                    </button>
                  ))}
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={slippage}
                      onChange={handleSlippageChange}
                      className="w-full px-3 py-1.5 pr-7 rounded-full bg-background-light border border-border text-foreground text-sm focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <span className="text-muted-foreground text-sm">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* From token card */}
          <div className="p-4 bg-card/80 rounded-2xl border border-border/50 mb-2 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">From</span>
              {isConnected && fromToken && (
                <span className="text-sm text-muted-foreground">
                  Balance: {fromTokenBalance} {fromToken.symbol}
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={handleFromAmountChange}
                  placeholder="0.00"
                  className="token-amount-input"
                />
              </div>
              
              <button 
                onClick={() => setIsFromTokenOpen(true)}
                className="token-selector shadow-sm hover:shadow-md transition-shadow flex-shrink-0"
              >
                {fromToken ? (
                  <>
                    <div className="token-logo">
                      {fromToken.logoURI ? (
                        <img src={fromToken.logoURI} alt={fromToken.symbol} className="w-6 h-6 rounded-full" />
                      ) : (
                        <span className="text-xs">{fromToken.symbol.substring(0, 2)}</span>
                      )}
                    </div>
                    <span className="font-medium">{fromToken.symbol}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </>
                ) : (
                  <>
                    <span className="font-medium">Select token</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Swap button */}
          <div className="flex justify-center -my-3 z-10 relative">
            <button 
              onClick={switchTokens}
              className="swap-arrow shadow-sm hover:shadow-md bg-card/80 border-border/60"
              disabled={!fromToken || !toToken}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </button>
          </div>
          
          {/* To token card */}
          <div className="p-4 bg-card/80 rounded-2xl border border-border/50 mb-6 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">To</span>
              {isConnected && toToken && (
                <span className="text-sm text-muted-foreground">
                  Balance: {toTokenBalance} {toToken.symbol}
                </span>
              )}
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0.00"
                  className="token-amount-input"
                />
              </div>
              
              <button 
                onClick={() => setIsToTokenOpen(true)}
                className="token-selector shadow-sm hover:shadow-md transition-shadow flex-shrink-0"
              >
                {toToken ? (
                  <>
                    <div className="token-logo">
                      {toToken.logoURI ? (
                        <img src={toToken.logoURI} alt={toToken.symbol} className="w-6 h-6 rounded-full" />
                      ) : (
                        <span className="text-xs">{toToken.symbol.substring(0, 2)}</span>
                      )}
                    </div>
                    <span className="font-medium">{toToken.symbol}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </>
                ) : (
                  <>
                    <span className="font-medium">Select token</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Exchange rate */}
          {fromToken && toToken && fromAmount && toAmount && (
            <div className="p-4 bg-card/80 rounded-2xl border border-border/50 mb-6 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Exchange Rate</span>
                <span className="text-foreground font-medium">
                  1 {fromToken.symbol} = {(Number(toAmount) / Number(fromAmount)).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Price Impact</span>
                <span className={`font-medium ${
                  Number(priceImpact) > 3 ? 'text-destructive' : Number(priceImpact) > 1 ? 'text-warning' : 'text-success'
                }`}>
                  {priceImpact}%
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Minimum Received</span>
                <span className="text-foreground font-medium">
                  {getMinimumReceived()} {toToken.symbol}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Liquidity Provider Fee</span>
                <span className="text-foreground font-medium">
                  {getLiquidityProviderFee()} {fromToken.symbol}
                </span>
              </div>
            </div>
          )}
          
          {/* Transaction error */}
          {swapError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl mb-6 text-sm text-destructive">
              {swapError}
            </div>
          )}
          
          {/* Transaction success */}
          {txHash && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-xl mb-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-success">Transaction submitted</span>
                <a 
                  href={`${MEGAETH_EXPLORER_URL}/tx/${txHash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View on explorer
                </a>
              </div>
            </div>
          )}
          
          {/* Swap button */}
          <button
            onClick={handleSwap}
            disabled={getButtonDisabled()}
            className={`swap-button shadow-glow-sm hover:shadow-glow-md ${
              getButtonDisabled() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isSwapping ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Swapping...
              </div>
            ) : (
              getButtonText()
            )}
          </button>
        </div>
      </main>
      
      <TokenSelector
        isOpen={isFromTokenOpen}
        onClose={() => setIsFromTokenOpen(false)}
        onSelect={handleFromTokenSelect}
        selectedToken={fromToken || undefined}
        excludeToken={toToken || undefined}
        tokens={availableTokens}
      />
      
      <TokenSelector
        isOpen={isToTokenOpen}
        onClose={() => setIsToTokenOpen(false)}
        onSelect={handleToTokenSelect}
        selectedToken={toToken || undefined}
        excludeToken={fromToken || undefined}
        tokens={availableTokens}
      />
      
      <Footer />
    </>
  );
} 