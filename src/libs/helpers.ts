import Browser from "webextension-polyfill";

import type { Prices } from "./constants";
import { PRICES_API } from "./constants";

export const getIsMac = () => /(Mac|iPhone|iPod|iPad)/i.test(navigator?.platform);

export function getReadableValue(value: number) {
	if (typeof value !== "number" || isNaN(value) || value === 0) return "0";

	if (Math.abs(value) < 1000) {
		return value.toPrecision(4);
	}

	// https://crusaders-of-the-lost-idols.fandom.com/wiki/Large_Number_Abbreviations
	// llamao issa fun
	const s = [
		"",
		"k",
		"m",
		"b",
		"t",
		"q",
		"Q",
		"s",
		"S",
		"o",
		"n",
		"d",
		"U",
		"D",
		"T",
		"Qt",
		"Qd",
		"Sd",
		"St",
		"O",
		"N",
	];
	const e = Math.floor(Math.log(value) / Math.log(1000));
	return (value / Math.pow(1000, e)).toFixed(1) + s[e];
}

export function formatPrice(price: number, symbol = "$", ignoreSmol = false) {
	let _price: string;
	if (price < 1 && !ignoreSmol) {
		_price = price.toPrecision(3);
	} else {
		_price = price.toLocaleString("en-US", { maximumFractionDigits: 2 });
	}
	return symbol + _price;
}

export async function getTokenPrice(tokenWithPrefix: string) {
	const res = (await fetch(PRICES_API + "/" + tokenWithPrefix).then((res) => res.json())) as Prices;
	return res.coins[tokenWithPrefix];
}

// This function is duplicated from api.ts to avoid circular dependency issues.
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

export async function getBatchTokenPrices(tokensWithPrefix: string[], useGlueX = false) {
	if (useGlueX) {
		// Use GlueX API for exchange rates
		const { getExchangeRates } = await import('./api');
		const tokens = tokensWithPrefix.map(t => t.replace(/^[a-z]+:/, '')); // Remove prefix like "ethereum:"

		try {
			const rateRequests = tokens.map(token => ({
				domestic_blockchain: 'hyperevm',
				domestic_token: getTokenAddress(token), // BUG FIX: Convert symbol to address
				foreign_blockchain: 'hyperevm',
				foreign_token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' // USDC
			}));

			const rates = await getExchangeRates(rateRequests);

			// Transform to match expected format
			return tokens.reduce((acc, token, index) => {
				acc[`ethereum:${token}`] = {
					price: rates[index]?.rate || 0,
					symbol: token,
					timestamp: Date.now(),
					confidence: 1
				};
				return acc;
			}, {} as any);
		} catch (error) {
			console.error('GlueX API failed, falling back to default API:', error);
		}
	}

	// Fallback to original implementation
	const chunkSize = 20;
	const chunks = [];
	for (let i = 0; i < tokensWithPrefix.length; i += chunkSize) {
		chunks.push(tokensWithPrefix.slice(i, i + chunkSize));
	}

	try {
		const res = await Promise.all(
			chunks.map(async (chunk) => (await fetch(PRICES_API + "/" + chunk.join(",")).then((res) => res.json())) as Prices),
		);
		const coins: {
			[key: string]: {
				price: number;
				symbol: string;
				timestamp: number;
				confidence: number;
			};
		} = res.reduce((acc, cur) => ({ ...acc, ...cur.coins }), {});
		return coins;
	} catch (error) {
		console.error('Error fetching token prices:', error);
		// Return empty result on error
		return {};
	}
}

// render an image to console with given url
export const logImage = (url: string, message = "", size = 20, styles = "") => {
	const _url = Browser.runtime.getURL(url);
	console.log(
		`%c ${message}`,
		`background: url(${_url}) 0 0 no-repeat; padding-left: ${size}px; background-size: ${size}px; font-size: ${size}px; ${styles}`,
	);
};

export const getImageUrl = (url: string) => {
	if (url.startsWith("data:image")) return url;
	if (url.startsWith("https")) return url;
	return Browser.runtime.getURL(url);
};


export function createInlineLlamaIcon(src: string, alt: string, size = 12, className = "mr-1 mCS_img_loaded") {
	const icon = document.createElement("img");
	icon.src = Browser.runtime.getURL(src);
	icon.alt = alt;
	icon.width = size;
	icon.className = className;
	return icon;
}

export const getStorage = async <T>(area: "local" | "sync", key: string, defaultValue?: T): Promise<T | undefined> => {
	const res = await Browser.storage[area].get(key);
	return key in res ? (res[key] as T) : defaultValue;
};

export const setStorage = async <T>(area: "local" | "sync", key: string, value: T): Promise<void> => {
	await Browser.storage[area].set({ [key]: value });
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const debounceTimers = {} as Record<number, NodeJS.Timeout>;
export function debounce(func: Function, delay: number) {
	return function (this: any) {
		const context = this;
		const args = arguments;
		clearTimeout(debounceTimers[delay]);
		debounceTimers[delay] = setTimeout(() => func.apply(context, args), delay);
	};
}