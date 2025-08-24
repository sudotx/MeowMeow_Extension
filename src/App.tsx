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
	addresses: string[];
}

interface ExchangeRate {
	symbol: string;
	price: number;
	change24h: number;
}

interface PhishingResult {
	result: boolean;
	type: "allowed" | "blocked" | "fuzzy" | "unknown";
	extra?: string;
}

function App() {
	const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
	const [_isExtension, setIsExtension] = useState(false);
	const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
	const [phishingResult, setPhishingResult] = useState<PhishingResult | null>(null);
	const [addressPrices, setAddressPrices] = useState<Record<string, number>>({});

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
							if (response.addresses && response.addresses.length > 0) {
								fetchAddressPrices(response.addresses);
							}
						}
					});

					// Get phishing status
					chrome.runtime.sendMessage({ action: 'getPhishingResult' }, (response) => {
						if (chrome.runtime.lastError) {
							console.error('Error getting phishing result:', chrome.runtime.lastError);
							return;
						}
						setPhishingResult(response);
					});
				}
			});
		}
	}, []);

	// Function to refresh phishing results
	const refreshPhishingResult = () => {
		chrome.runtime.sendMessage({ action: 'getPhishingResult' }, (response) => {
			setPhishingResult(response);
		});
	};

	// Function to refresh page info and trigger content script update
	const refreshPageInfo = () => {
		if (typeof chrome !== 'undefined' && chrome.tabs) {
			chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
				if (tabs[0]) {
					// Send message to content script to refresh
					chrome.tabs.sendMessage(tabs[0].id!, { action: 'refreshPhishingCheck' }, (response) => {
						if (response && response.success) {
							// Wait a bit then refresh phishing result
							setTimeout(() => {
								refreshPhishingResult();
							}, 500);
						}
					});

					// Also refresh page info
					chrome.tabs.sendMessage(tabs[0].id!, { action: 'getPageInfo' }, (response) => {
						if (response) {
							setPageInfo(response);
							// Fetch exchange rates for detected tokens
							if (response.tokens && response.tokens.length > 0) {
								fetchExchangeRates(response.tokens.map((t: TokenInfo) => t.symbol));
							}
							if (response.addresses && response.addresses.length > 0) {
								fetchAddressPrices(response.addresses);
							}
						}
					});
				}
			});
		}
	};

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

	const fetchAddressPrices = async (addresses: string[]) => {
		if (typeof chrome !== 'undefined' && chrome.runtime) {
			try {
				const prices = await chrome.runtime.sendMessage({
					action: 'fetchAddressPrices',
					addresses
				});
				setAddressPrices(prices);
			} catch (error) {
				console.error('Error fetching address prices:', error);
			}
		}
	};

	// Get token icon with better styling
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

	const truncateAddress = (address: string) => {
		if (!address) return "";
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	const getPhishingStatus = () => {
		if (!phishingResult) return { text: 'Checking...', color: 'text-gray-400' };

		switch (phishingResult.type) {
			case 'allowed':
				return { text: 'Safe', color: 'text-green-500' };
			case 'blocked':
				return { text: 'Phishing Detected', color: 'text-red-500' };
			case 'fuzzy':
				return { text: 'Suspicious', color: 'text-orange-500' };
			case 'unknown':
			default:
				return { text: 'Unknown', color: 'text-yellow-500' };
		}
	}

	const getPhishingStatusDetails = () => {
		if (!phishingResult) return null;

		switch (phishingResult.type) {
			case 'fuzzy':
				return phishingResult.extra ? `Impersonating ${phishingResult.extra}` : 'Suspicious domain detected';
			case 'blocked':
				return 'This domain is on our blacklist';
			case 'allowed':
				return 'This domain is whitelisted';
			default:
				return 'Domain not in our database';
		}
	}

	return (
		<div className="w-full h-full min-h-[600px] bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden">
			{/* Animated background elements */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
				<div className="absolute top-40 left-40 w-60 h-60 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
			</div>

			{/* Header with glassmorphism effect */}
			<div className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10">
				<div className="flex items-center justify-between p-4">
					<div className="flex items-center space-x-3">
						<div className="relative">
							<div className="text-2xl animate-bounce" style={{ animationDuration: '3s' }}>🛡️</div>
							<div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
						</div>
						<div>
							<h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
								SafeFi
							</h1>
						</div>
					</div>
				</div>
			</div>

			<div className="relative z-10 p-4 space-y-4 overflow-y-auto max-h-[500px]">
				{/* Current Page Info with enhanced glassmorphism */}
				{pageInfo && (
					<div className="backdrop-blur-xl bg-white/10 rounded-2xl p-5 border border-white/20 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:bg-white/15 relative overflow-hidden">
						{/* Subtle gradient overlay for extra emphasis */}
						<div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 pointer-events-none"></div>

						<div className="relative z-10">
							<div className="flex items-center space-x-3 mb-4">
								<div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
									<span className="text-white text-lg">🌐</span>
								</div>
								<h2 className="text-xl font-bold text-white">Current Page</h2>
							</div>
							<div className="space-y-3">
								{/* Enhanced URL display */}
								<div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-blue-400/30 shadow-lg">
									<p className="text-lg text-white font-bold break-all leading-relaxed tracking-wide">
										{pageInfo.url}
									</p>
								</div>
								<div className="space-y-2">
									<div className="flex items-center space-x-2">
										<p className={`text-sm font-mono bg-gray-800/60 px-3 py-2 rounded-lg inline-block ${getPhishingStatus().color} border border-white/10`}>
											{getPhishingStatus().text}
										</p>
										<div className="flex space-x-2">
											<button
												onClick={refreshPhishingResult}
												className="text-sm bg-gray-700/60 px-3 py-2 rounded-lg transition-all duration-200 hover:text-blue-400 hover:bg-blue-500/20 border border-white/10"
												title="Refresh phishing status"
											>
												🔄
											</button>
											<button
												onClick={refreshPageInfo}
												className="text-sm bg-gray-700/60 px-3 py-2 rounded-lg transition-all duration-200 hover:text-green-400 hover:bg-green-500/20 border border-white/10"
												title="Refresh all page data"
											>
												📄
											</button>
										</div>
									</div>
									{getPhishingStatusDetails() && (
										<p className="text-sm text-gray-300 italic bg-gray-800/30 px-3 py-2 rounded-lg border border-white/10">
											{getPhishingStatusDetails()}
										</p>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Detected Addresses */}
				{pageInfo?.addresses && pageInfo.addresses.length > 0 && (
					<div className="space-y-4">
						<div className="flex items-center space-x-3">
							<h2 className="text-lg font-semibold text-white">Detected Addresses</h2>
						</div>
						<div className="grid gap-2">
							{pageInfo.addresses.map((address, index) => {
								const price = addressPrices[address];
								return (
									<div
										key={index}
										className="group backdrop-blur-xl bg-white/5 rounded-xl p-3 border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/10"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-3">
												<div className="relative">
													<div className="text-2xl">
														{getTokenIcon('')}
													</div>
												</div>
												<div>
													<p className="font-bold text-sm text-white">{truncateAddress(address)}</p>
													{price !== undefined && (
														<div className="flex items-center space-x-2">
															<p className="text-sm text-gray-300 font-medium">
																${price.toFixed(2)}
															</p>
														</div>
													)}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}


				{/* Detected Tokens with enhanced cards */}
				{pageInfo?.tokens && pageInfo.tokens.length > 0 && (
					<div className="space-y-4">
						<div className="flex items-center space-x-3">
							<h2 className="text-lg font-semibold text-white">Detected Tokens</h2>
						</div>
						<div className="grid gap-2">
							{pageInfo.tokens.map((token, index) => {
								const rate = exchangeRates.find(r => r.symbol === token.symbol);
								return (
									<div
										key={index}
										className="group backdrop-blur-xl bg-white/5 rounded-xl p-3 border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/10"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-3 min-w-0">
												<div className="relative">
													<div className="text-2xl">
														{getTokenIcon(token.symbol)}
													</div>
												</div>
												<div className="min-w-0">
													<p className="font-bold text-base text-white truncate">{token.symbol}</p>
													{rate && (
														<div className="flex items-center space-x-2">
															<p className="text-sm text-gray-300 font-medium">
																${rate.price.toFixed(2)}
															</p>
															<span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${rate.change24h >= 0
																? 'bg-green-500/20 text-green-400'
																: 'bg-red-500/20 text-red-400'
																}`}>
																{rate.change24h >= 0 ? '↗' : '↘'} {Math.abs(rate.change24h).toFixed(1)}%
															</span>
														</div>
													)}
												</div>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Enhanced Footer */}
				<div className="text-center pt-4">
					<button className="text-xs text-purple-400 hover:text-purple-300 transition-colors duration-300 font-medium">
						Submit a whitelist domain
					</button>
				</div>
			</div>
		</div>
	);
}

export default App