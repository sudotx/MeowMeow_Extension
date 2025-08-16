// API helper functions for GlueX integration

export interface ExchangeRate {
  symbol: string;
  price: number;
  change24h: number;
  volume24h?: number;
  marketCap?: number;
}

export interface SwapEstimate {
  slippage: number;
  gasCost: number;
  estimatedOutput: number;
  route?: string[];
  priceImpact?: number;
}

export interface YieldOption {
  protocol: string;
  apy: number;
  risk: 'low' | 'medium' | 'high';
  tvl?: number;
  description?: string;
}

export interface SwapRequest {
  fromToken: string;
  toToken: string;
  amount: number;
  userAddress: string;
  slippageTolerance?: number;
}

// GlueX API configuration
const GLUEX_CONFIG = {
  BASE_URL: 'https://api.gluex.com/v1',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GLUEX_CONFIG.BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  const finalOptions = { ...defaultOptions, ...options };

  for (let attempt = 1; attempt <= GLUEX_CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, finalOptions);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (attempt === GLUEX_CONFIG.RETRY_ATTEMPTS) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('API request failed after all retry attempts');
}

// Fetch exchange rates for multiple tokens
export async function fetchExchangeRates(tokens: string[]): Promise<ExchangeRate[]> {
  try {
    const response = await apiRequest<{ rates: ExchangeRate[] }>(
      `/rates?tokens=${tokens.join(',')}`
    );
    return response.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return mock data for development
    return tokens.map(symbol => ({
      symbol,
      price: Math.random() * 1000 + 1,
      change24h: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 1000000,
      marketCap: Math.random() * 10000000
    }));
  }
}

// Get swap estimate from GlueX Router
export async function getSwapEstimate(
  fromToken: string,
  toToken: string,
  amount: number,
  slippageTolerance: number = 0.5
): Promise<SwapEstimate> {
  try {
    const response = await apiRequest<{ estimate: SwapEstimate }>(
      '/swap/estimate',
      {
        method: 'POST',
        body: JSON.stringify({
          fromToken,
          toToken,
          amount,
          slippageTolerance
        })
      }
    );
    return response.estimate;
  } catch (error) {
    console.error('Error getting swap estimate:', error);
    // Return mock data for development
    return {
      slippage: slippageTolerance,
      gasCost: 0.02 + Math.random() * 0.03,
      estimatedOutput: amount * (0.995 + Math.random() * 0.01),
      route: [fromToken, 'USDC', toToken],
      priceImpact: Math.random() * 2
    };
  }
}

// Execute swap transaction
export async function executeSwap(swapRequest: SwapRequest): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const response = await apiRequest<{ transaction: any; txHash: string }>(
      '/swap/execute',
      {
        method: 'POST',
        body: JSON.stringify(swapRequest)
      }
    );
    
    return {
      success: true,
      txHash: response.txHash
    };
  } catch (error) {
    console.error('Error executing swap:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Fetch yield optimization options
export async function fetchYieldOptions(): Promise<YieldOption[]> {
  try {
    const response = await apiRequest<{ options: YieldOption[] }>('/yield/options');
    return response.options;
  } catch (error) {
    console.error('Error fetching yield options:', error);
    // Return mock data for development
    return [
      {
        protocol: 'Aave',
        apy: 3.2,
        risk: 'low',
        tvl: 15000000000,
        description: 'Leading lending protocol with high liquidity'
      },
      {
        protocol: 'Compound',
        apy: 2.8,
        risk: 'low',
        tvl: 8000000000,
        description: 'Established lending protocol'
      },
      {
        protocol: 'Yearn Finance',
        apy: 8.5,
        risk: 'medium',
        tvl: 3000000000,
        description: 'Automated yield optimization'
      },
      {
        protocol: 'Convex Finance',
        apy: 12.3,
        risk: 'high',
        tvl: 2000000000,
        description: 'High-yield Curve strategies'
      }
    ];
  }
}

// Get token metadata
export async function getTokenMetadata(symbol: string): Promise<{
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
  description?: string;
}> {
  try {
    const response = await apiRequest<{
      name: string;
      symbol: string;
      decimals: number;
      logoUrl?: string;
      description?: string;
    }>(`/tokens/${symbol}`);
    return response;
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    // Return default metadata
    return {
      name: symbol,
      symbol,
      decimals: 18,
      description: 'Cryptocurrency token'
    };
  }
}

// Get gas price estimate
export async function getGasPrice(): Promise<{
  slow: number;
  standard: number;
  fast: number;
}> {
  try {
    const response = await apiRequest<{
      slow: number;
      standard: number;
      fast: number;
    }>('/gas/price');
    return response;
  } catch (error) {
    console.error('Error fetching gas price:', error);
    // Return mock data
    return {
      slow: 15,
      standard: 25,
      fast: 35
    };
  }
}
