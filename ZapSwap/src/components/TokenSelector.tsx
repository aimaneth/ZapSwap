'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getTokens, Token } from '@/services/tokenService';

export interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedToken?: Token;
  excludeToken?: Token;
  tokens?: Token[]; // Add optional tokens prop
}

export function TokenSelector({
  isOpen,
  onClose,
  onSelect,
  selectedToken,
  excludeToken,
  tokens: providedTokens
}: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tokens or use provided tokens
  useEffect(() => {
    const loadTokens = async () => {
      setIsLoading(true);
      try {
        // If tokens are provided as props, use them
        if (providedTokens) {
          setTokens(providedTokens);
        } else {
          // Otherwise fetch from service
          const fetchedTokens = await getTokens();
          setTokens(fetchedTokens);
        }
      } catch (error) {
        console.error('Failed to load tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      loadTokens();
    }
  }, [isOpen, providedTokens]);

  // Filter tokens based on search query and excluded token
  const filteredTokens = tokens
    .filter(token => 
      !excludeToken || token.address !== excludeToken.address
    )
    .filter(token =>
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Handle token selection
  const handleSelect = (token: Token) => {
    onSelect(token);
    onClose();
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border/50 backdrop-blur-md max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Select a token</DialogTitle>
        </DialogHeader>
        
        <div className="my-4">
          <Input
            placeholder="Search by name or address"
            value={searchQuery}
            onChange={handleSearchChange}
            className="bg-background-light border-border"
          />
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No tokens found for "{searchQuery}"
          </div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto pr-1">
            {filteredTokens.map(token => (
              <button
                key={token.address}
                onClick={() => handleSelect(token)}
                className={`w-full flex items-center p-3 rounded-lg hover:bg-primary/5 transition-colors ${
                  selectedToken?.address === token.address ? 'bg-primary/10' : ''
                }`}
              >
                <div className="token-logo mr-3">
                  {token.logoURI ? (
                    <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-sm font-medium">{token.symbol.substring(0, 2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-sm text-muted-foreground">{token.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 