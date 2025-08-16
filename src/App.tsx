import { useEffect, useState } from 'react';
import './App.css';

interface TokenInfo {
  symbol: string;
  address?: string;
  price?: number;
}

interface PageInfo {
  title: string;
  url: string;
  domain: string;
  tokens: TokenInfo[];
}

interface ExchangeRate {
  symbol: string;
  price: number;
  change24h: number;
}

interface SwapEstimate {
  slippage: number;
  gasCost: number;
  estimatedOutput: number;
}

interface Settings {
  detectPhishing: boolean;
  twitter: {
    mitigatePhishing: boolean;
    hideCashTags: boolean;
    hideHashTags: boolean;
    hideQT: boolean;
    hideBotReplies: boolean;
  };
  explorer: {
    enableAddressTags: boolean;
    enableTokenPrices: boolean;
    enableHideScamTransactions: boolean;
  };
}

function App() {
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [_isExtension, setIsExtension] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [swapEstimate, setSwapEstimate] = useState<SwapEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [swapAmount, setSwapAmount] = useState<string>('1');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [settings, setSettings] = useState<Settings>({
    detectPhishing: true,
    twitter: {
      mitigatePhishing: true,
      hideCashTags: true,
      hideHashTags: true,
      hideQT: true,
      hideBotReplies: false,
    },
    explorer: {
      enableAddressTags: true,
      enableTokenPrices: true,
      enableHideScamTransactions: false,
    }
  });

  useEffect(() => {
    // Check if running as Chrome extension
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      setIsExtension(true);
      
      // Get current active tab info
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id!, { action: 'getPageInfo' }, (response) => {
            if (response) {
              setPageInfo(response);
                              // Fetch exchange rates for detected tokens
                if (response.tokens && response.tokens.length > 0) {
                  fetchExchangeRates(response.tokens.map((t: TokenInfo) => t.symbol));
                }
            }
          });
        }
      });
    }
  }, []);

  // Fetch exchange rates from background script
  const fetchExchangeRates = async (tokens: string[]) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        const rates = await chrome.runtime.sendMessage({
          action: 'fetchExchangeRates',
          tokens
        });
        setExchangeRates(rates);
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    }
  };

  // Get swap estimate
  const getSwapEstimate = async (fromToken: string, toToken: string, amount: number) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        const estimate = await chrome.runtime.sendMessage({
          action: 'getSwapEstimate',
          fromToken,
          toToken,
          amount
        });
        setSwapEstimate(estimate);
      } catch (error) {
        console.error('Error getting swap estimate:', error);
      }
    }
  };

  // Execute swap
  const executeSwap = async (fromToken: string, toToken: string, amount: number) => {
    setIsLoading(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const success = await chrome.runtime.sendMessage({
          action: 'executeSwap',
          fromToken,
          toToken,
          amount
        });
        
        if (success) {
          alert('Swap executed successfully!');
        } else {
          alert('Swap failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error executing swap:', error);
      alert('Swap failed. Please check your wallet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle swap amount change
  const handleSwapAmountChange = (amount: string) => {
    setSwapAmount(amount);
    if (selectedToken && amount) {
      getSwapEstimate('ETH', selectedToken, parseFloat(amount));
    }
  };

  // Handle token selection
  const handleTokenSelect = (token: string) => {
    setSelectedToken(token);
    if (swapAmount) {
      getSwapEstimate('ETH', token, parseFloat(swapAmount));
    }
  };

  const toggleSetting = (category: string, setting: string) => {
    setSettings(prev => {
      if (category === '') {
        return {
          ...prev,
          [setting]: !prev[setting as keyof Settings]
        };
      } else {
        const categorySettings = prev[category as keyof Settings] as Record<string, boolean>;
        return {
          ...prev,
          [category]: {
            ...categorySettings,
            [setting]: !categorySettings[setting]
          }
        };
      }
    });
  };

  const ToggleSwitch = ({
    checked,
    onChange
  }: {
    checked: boolean;
    onChange: () => void;
  }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ease-in-out duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );

  // Get token icon (placeholder)
  const getTokenIcon = (symbol: string) => {
    const icons: { [key: string]: string } = {
      'ETH': '🔷',
      'BTC': '🟡',
      'USDC': '🔵',
      'USDT': '🟢',
      'DAI': '🟡',
      'WBTC': '🟠',
      'UNI': '🟣',
      'AAVE': '🔴',
      'COMP': '🔵',
      'LINK': '🔵'
    };
    return icons[symbol] || '🪙';
  };

  return (
    <div className={`w-full h-full min-h-[600px] ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} transition-colors duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🐈‍⬛</div>
          <div>
            <h1 className="text-lg font-bold">MeowVerse</h1>
            <p className="text-sm text-gray-400">DeFi Companion</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Page Info */}
        {pageInfo && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-2">Current Page</h2>
            <p className="text-xs text-gray-400 truncate">{pageInfo.title}</p>
            <p className="text-xs text-gray-400 truncate">{pageInfo.domain}</p>
          </div>
        )}

        {/* Detected Tokens */}
        {pageInfo?.tokens && pageInfo.tokens.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Detected Tokens</h2>
            <div className="space-y-3">
              {pageInfo.tokens.slice(0, 5).map((token, index) => {
                const rate = exchangeRates.find(r => r.symbol === token.symbol);
                return (
                  <div key={index} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getTokenIcon(token.symbol)}</div>
                      <div>
                        <p className="font-semibold">{token.symbol}</p>
                        {rate && (
                          <p className="text-sm text-gray-400">
                            ${rate.price.toFixed(2)}
                            <span className={`ml-2 ${rate.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {rate.change24h >= 0 ? '+' : ''}{rate.change24h.toFixed(2)}%
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleTokenSelect(token.symbol)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Swap
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Swap Interface */}
        {selectedToken && (
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold">Swap ETH → {selectedToken}</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Amount (ETH)
                </label>
                <input
                  type="number"
                  value={swapAmount}
                  onChange={(e) => handleSwapAmountChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                  min="0"
                  step="0.01"
                />
              </div>

              {swapEstimate && (
                <div className="bg-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Estimated Output:</span>
                    <span className="text-white">{swapEstimate.estimatedOutput.toFixed(6)} {selectedToken}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Slippage:</span>
                    <span className="text-yellow-400">{swapEstimate.slippage.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Gas Cost:</span>
                    <span className="text-white">~${swapEstimate.gasCost.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => executeSwap('ETH', selectedToken, parseFloat(swapAmount))}
                disabled={isLoading || !swapAmount || parseFloat(swapAmount) <= 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {isLoading ? 'Processing...' : 'Execute Swap'}
              </button>
            </div>
          </div>
        )}

        {/* Settings Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Settings</h2>
          
          <div className="bg-gray-800 rounded-lg p-4 space-y-4">
            {/* Detect phishing websites */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Detect phishing websites</span>
              <ToggleSwitch
                checked={settings.detectPhishing}
                onChange={() => toggleSetting('', 'detectPhishing')}
              />
            </div>

            {/* Explorer Section */}
            <div>
              <h3 className="font-semibold text-sm mb-2">Explorer</h3>
              <div className="space-y-2 ml-4">
                {Object.entries(settings.explorer).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                    <ToggleSwitch
                      checked={value}
                      onChange={() => toggleSetting('explorer', key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4">
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            Submit a whitelist domain
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
