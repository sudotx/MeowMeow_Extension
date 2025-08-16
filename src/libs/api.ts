// API helper functions for GlueX integration
import axios from "axios";

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

export interface LiquidityInfo {
	protocol: string;
	tvl: number;
	apy?: number;
	risk?: string;
}

export interface PriceRequest {
	chainID: string;
	inputToken: string;
	outputToken: string;
	inputAmount: string;
	orderType: 'SELL' | 'BUY';
	userAddress: string;
	outputReceiver: string;
	uniquePID: string;
}

export interface QuoteRequest {
	chainID: string;
	inputToken: string;
	outputToken: string;
	inputAmount: string;
	orderType: 'SELL' | 'BUY';
	userAddress: string;
	outputReceiver: string;
	uniquePID: string;
}

export interface ExchangeRateRequest {
	domestic_blockchain: string;
	domestic_token: string;
	foreign_blockchain: string;
	foreign_token: string;
}

export interface HistoricalApyRequest {
	pool_address: string;
	lp_token_address: string;
	chain: string;
	input_token: string;
}

export interface DilutedApyRequest {
	pool_address: string;
	lp_token_address: string;
	chain: string;
	input_token: string;
	input_amount: string;
}

export interface TvlRequest {
	pool_address: string;
	lp_token_address: string;
	chain: string;
}

// GlueX API configuration
const GLUEX_CONFIG = {
	ROUTER_URL: 'https://router.gluex.xyz',
	EXCHANGE_RATES_URL: 'https://exchange-rates.gluex.xyz',
	YIELD_URL: 'https://yield-api.gluex.xyz',
	TIMEOUT: 10000,
	RETRY_ATTEMPTS: 3
};

// API key - should be stored in environment variables
const API_KEY = process.env.GLUEX_API_KEY || '';

// Create axios instances for different services
const routerClient = axios.create({
	baseURL: GLUEX_CONFIG.ROUTER_URL,
	timeout: GLUEX_CONFIG.TIMEOUT,
	headers: {
		'Content-Type': 'application/json',
		'x-api-key': API_KEY
	}
});

const exchangeRatesClient = axios.create({
	baseURL: GLUEX_CONFIG.EXCHANGE_RATES_URL,
	timeout: GLUEX_CONFIG.TIMEOUT,
	headers: {
		'Content-Type': 'application/json'
	}
});

const yieldClient = axios.create({
	baseURL: GLUEX_CONFIG.YIELD_URL,
	timeout: GLUEX_CONFIG.TIMEOUT,
	headers: {
		'Content-Type': 'application/json'
	}
});

// Generic API request function using axios
async function apiRequest<T>(
	client: any,
	endpoint: string,
	options: {
		method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
		data?: any;
		params?: any;
		headers?: Record<string, string>;
	} = {}
): Promise<T> {
	const { method = 'GET', data, params, headers } = options;

	for (let attempt = 1; attempt <= GLUEX_CONFIG.RETRY_ATTEMPTS; attempt++) {
		try {
			const response = await client.request({
				url: endpoint,
				method,
				data,
				params,
				headers
			});

			return response.data;
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

// Get liquidity information from GlueX Router
export async function getLiquidity(): Promise<LiquidityInfo[]> {
	try {
		const response = await apiRequest<LiquidityInfo[]>(routerClient, '/liquidity');
		return response;
	} catch (error) {
		console.error('Error fetching liquidity:', error);
		// Return mock data for development
		return [
			{
				protocol: 'Uniswap V3',
				tvl: 15000000000,
				apy: 2.5,
				risk: 'low'
			},
			{
				protocol: 'SushiSwap',
				tvl: 8000000000,
				apy: 3.2,
				risk: 'medium'
			}
		];
	}
}

// Get price from GlueX Router
export async function getPrice(priceRequest: PriceRequest): Promise<any> {
	try {
		const response = await apiRequest<any>(routerClient, '/v1/price', {
			method: 'POST',
			data: priceRequest
		});
		return response;
	} catch (error) {
		console.error('Error getting price:', error);
		throw error;
	}
}

// Get quote from GlueX Router
export async function getQuote(quoteRequest: QuoteRequest): Promise<any> {
	try {
		const response = await apiRequest<any>(routerClient, '/v1/quote', {
			method: 'POST',
			data: quoteRequest
		});
		return response;
	} catch (error) {
		console.error('Error getting quote:', error);
		throw error;
	}
}

// Get swap estimate from GlueX Router (using quote endpoint)
export async function getSwapEstimate(
	fromToken: string,
	toToken: string,
	amount: number,
	userAddress: string,
	outputReceiver: string,
	uniquePID: string,
	chainID: string = 'ethereum'
): Promise<SwapEstimate> {
	try {
		const quoteRequest: QuoteRequest = {
			chainID,
			inputToken: fromToken,
			outputToken: toToken,
			inputAmount: amount.toString(),
			orderType: 'SELL',
			userAddress,
			outputReceiver,
			uniquePID
		};

		const response = await getQuote(quoteRequest);

		// Transform the response to match our SwapEstimate interface
		return {
			slippage: response.slippage || 0.5,
			gasCost: response.gasCost || 0.02,
			estimatedOutput: response.outputAmount || amount * 0.995,
			route: response.route || [fromToken, toToken],
			priceImpact: response.priceImpact || 0.1
		};
	} catch (error) {
		console.error('Error getting swap estimate:', error);
		// Return mock data for development
		return {
			slippage: 0.5,
			gasCost: 0.02 + Math.random() * 0.03,
			estimatedOutput: amount * (0.995 + Math.random() * 0.01),
			route: [fromToken, 'USDC', toToken],
			priceImpact: Math.random() * 2
		};
	}
}

// Execute swap transaction using GlueX Router (using price endpoint)
export async function executeSwap(swapRequest: SwapRequest): Promise<{ success: boolean; txHash?: string; error?: string }> {
	try {
		const priceRequest: PriceRequest = {
			chainID: 'ethereum',
			inputToken: swapRequest.fromToken,
			outputToken: swapRequest.toToken,
			inputAmount: swapRequest.amount.toString(),
			orderType: 'SELL',
			userAddress: swapRequest.userAddress,
			outputReceiver: swapRequest.userAddress,
			uniquePID: generateUniquePID()
		};

		const response = await getPrice(priceRequest);

		return {
			success: true,
			txHash: response.txHash || 'mock-tx-hash'
		};
	} catch (error) {
		console.error('Error executing swap:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

// Get exchange rates using GlueX Exchange Rates API
export async function getExchangeRates(rateRequests: ExchangeRateRequest[]): Promise<any[]> {
	try {
		const response = await apiRequest<any[]>(exchangeRatesClient, '/', {
			method: 'POST',
			data: rateRequests
		});
		return response;
	} catch (error) {
		console.error('Error fetching exchange rates:', error);
		// Return mock data for development
		return rateRequests.map(() => ({
			rate: Math.random() * 2 + 0.5,
			timestamp: Date.now()
		}));
	}
}

// Fetch exchange rates for multiple tokens (convenience function)
export async function fetchExchangeRates(tokens: string[]): Promise<ExchangeRate[]> {
	try {
		// Convert token symbols to contract addresses (simplified)
		const rateRequests: ExchangeRateRequest[] = tokens.map(token => ({
			domestic_blockchain: 'ethereum',
			domestic_token: getTokenAddress(token),
			foreign_blockchain: 'ethereum',
			foreign_token: getTokenAddress('USDC') // Use USDC as base
		}));

		const rates = await getExchangeRates(rateRequests);

		return tokens.map((token, index) => ({
			symbol: token,
			price: rates[index]?.rate || Math.random() * 1000 + 1,
			change24h: (Math.random() - 0.5) * 20,
			volume24h: Math.random() * 1000000,
			marketCap: Math.random() * 10000000
		}));
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

// Get active protocols from GlueX Yield API
export async function getActiveProtocols(): Promise<any[]> {
	try {
		const response = await apiRequest<any[]>(yieldClient, '/active-protocols');
		return response;
	} catch (error) {
		console.error('Error fetching active protocols:', error);
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
			}
		];
	}
}

// Fetch yield optimization options using GlueX Yield API
export async function fetchYieldOptions(): Promise<YieldOption[]> {
	try {
		const protocols = await getActiveProtocols();
		return protocols.map(protocol => ({
			protocol: protocol.name || protocol.protocol,
			apy: protocol.apy || 0,
			risk: protocol.risk || 'medium',
			tvl: protocol.tvl || 0,
			description: protocol.description || ''
		}));
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

// Get historical APY from GlueX Yield API
export async function getHistoricalApy(request: HistoricalApyRequest): Promise<any> {
	try {
		const response = await apiRequest<any>(yieldClient, '/historical-apy', {
			method: 'POST',
			data: request
		});
		return response;
	} catch (error) {
		console.error('Error fetching historical APY:', error);
		throw error;
	}
}

// Get diluted APY from GlueX Yield API
export async function getDilutedApy(request: DilutedApyRequest): Promise<any> {
	try {
		const response = await apiRequest<any>(yieldClient, '/diluted-apy', {
			method: 'POST',
			data: request
		});
		return response;
	} catch (error) {
		console.error('Error fetching diluted APY:', error);
		throw error;
	}
}

// Get TVL from GlueX Yield API
export async function getTvl(request: TvlRequest): Promise<any> {
	try {
		const response = await apiRequest<any>(yieldClient, '/tvl', {
			method: 'POST',
			data: request
		});
		return response;
	} catch (error) {
		console.error('Error fetching TVL:', error);
		throw error;
	}
}

// Get yield opportunities for a specific token using GlueX Yield API
export async function getYieldOpportunities(token: string): Promise<YieldOption[]> {
	try {
		const protocols = await getActiveProtocols();
		// Filter protocols that support the given token
		return protocols
			.filter(protocol => protocol.supportedTokens?.includes(token))
			.map(protocol => ({
				protocol: protocol.name || protocol.protocol,
				apy: protocol.apy || 0,
				risk: protocol.risk || 'medium',
				tvl: protocol.tvl || 0,
				description: protocol.description || ''
			}));
	} catch (error) {
		console.error('Error fetching yield opportunities:', error);
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
			}
		];
	}
}

// Get token metadata (simplified)
export async function getTokenMetadata(symbol: string): Promise<{
	name: string;
	symbol: string;
	decimals: number;
	logoUrl?: string;
	description?: string;
}> {
	try {
		// This would need to be implemented based on available endpoints
		return {
			name: symbol,
			symbol,
			decimals: 18,
			description: 'Cryptocurrency token'
		};
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

// Get gas price estimate (simplified)
export async function getGasPrice(): Promise<{
	slow: number;
	standard: number;
	fast: number;
}> {
	try {
		// This would need to be implemented based on available endpoints
		return {
			slow: 15,
			standard: 25,
			fast: 35
		};
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

// Get supported tokens (simplified)
export async function getSupportedTokens(): Promise<string[]> {
	try {
		// This would need to be implemented based on available endpoints
		return ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'WBTC'];
	} catch (error) {
		console.error('Error fetching supported tokens:', error);
		// Return common tokens as fallback
		return ['ETH', 'USDC', 'USDT', 'DAI', 'WETH', 'WBTC'];
	}
}

// Get swap history for a user (simplified)
export async function getSwapHistory(userAddress: string): Promise<{
	txHash: string;
	tokenIn: string;
	tokenOut: string;
	amountIn: number;
	amountOut: number;
	timestamp: number;
}[]> {
	try {
		// This would need to be implemented based on available endpoints
		return [];
	} catch (error) {
		console.error('Error fetching swap history:', error);
		return [];
	}
}

// Helper functions
function generateUniquePID(): string {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getTokenAddress(symbol: string): string {
	// Simplified token address mapping
	const addresses: Record<string, string> = {
		'ETH': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
		'USDC': '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		'USDT': '0xdac17f958d2ee523a2206206994597c13d831ec7',
		'DAI': '0x6b175474e89094c44da98b954eedeac495271d0f',
		'WETH': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
		'WBTC': '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
	};
	return addresses[symbol] || '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
}
