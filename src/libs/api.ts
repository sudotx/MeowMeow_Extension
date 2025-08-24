// API helper functions for GlueX integration
import axios from "axios";

export interface ExchangeRate {
	symbol: string;
	price: number;
	change24h: number;
	volume24h?: number;
	marketCap?: number;
}

export interface ExchangeRateRequest {
	domestic_blockchain: string;
	domestic_token: string;
	foreign_blockchain: string;
	foreign_token: string;
}

// GlueX API configuration
const GLUEX_CONFIG = {
	EXCHANGE_RATES_URL: 'https://exchange-rates.gluex.xyz',
	TIMEOUT: 10000,
	RETRY_ATTEMPTS: 3
};

// // API key - should be stored in environment variables
// const API_KEY = process.env.GLUEX_API_KEY || '';
// const INTEGRATOR_PID = process.env.INTEGRATOR_PID || ''; // this is the uniquePID parameter in the body of each API request:

// Create axios instances for different services
const exchangeRatesClient = axios.create({
	baseURL: GLUEX_CONFIG.EXCHANGE_RATES_URL,
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
		throw error;
	}
}

// Fetch exchange rates for multiple tokens (convenience function)
export async function fetchExchangeRates(tokens: string[]): Promise<ExchangeRate[]> {
	if (tokens.length === 0) {
		return [];
	}
	try {
		// Convert token symbols to contract addresses (simplified)
		const rateRequests: ExchangeRateRequest[] = tokens.map(token => ({
			domestic_blockchain: 'ethereum',
			domestic_token: getTokenAddress(token),
			foreign_blockchain: 'ethereum',
			foreign_token: getTokenAddress('USDC') // Use USDC as base
		}));

		const rates = await getExchangeRates(rateRequests);

		// Assuming the 'rates' response array matches the order of 'tokens'
		return tokens.map((token, index) => {
			const rateInfo = rates[index];
			return {
				symbol: token,
				price: rateInfo?.rate || 0,
				// The GlueX Exchange Rates API doesn't provide these fields in the documented response.
				// Defaulting to 0.
				change24h: rateInfo?.change24h || 0,
				volume24h: rateInfo?.volume24h || 0,
				marketCap: rateInfo?.marketCap || 0
			};
		});
	} catch (error) {
		console.error('Error fetching exchange rates:', error);
		// Return an empty array or a partially failed state
		// For now, returning an empty array on failure.
		return [];
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
export async function getSwapHistory(_userAddress: string): Promise<{
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
