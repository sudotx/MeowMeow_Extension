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
	explorer: {
		enableAddressTags: boolean;
		enableTokenPrices: boolean;
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

	const [settings, setSettings] = useState<Settings>({
		detectPhishing: true,
		explorer: {
			enableAddressTags: true,
			enableTokenPrices: true,
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
			className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${checked ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25' : 'bg-gray-600'
				}`}
		>
			<span
				className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-all duration-300 ease-in-out ${checked ? 'translate-x-6' : 'translate-x-1'
					}`}
			/>
		</button>
	);

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
				<div className="flex items-center justify-between p-6">
					<div className="flex items-center space-x-4">
						<div className="relative">
							<div className="text-2xl animate-bounce" style={{ animationDuration: '3s' }}>🐈‍⬛</div>
							<div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
						</div>
						<div>
							<h1 className="text-sm font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
								MeowVerse
							</h1>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
						<span className="text-xs text-gray-400">Connected</span>
					</div>
				</div>
			</div>

			<div className="relative z-10 p-6 space-y-6 overflow-y-auto max-h-[500px]">
				{/* Current Page Info with glassmorphism */}
				{pageInfo && (
					<div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 shadow-xl">
						<div className="flex items-center space-x-3 mb-3">
							<div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
								<span className="text-white text-sm">🌐</span>
							</div>
							<h2 className="text-lg font-semibold text-white">Current Page</h2>
						</div>
						<div className="space-y-2">
							<p className="text-sm text-gray-200 font-medium truncate">{pageInfo.title}</p>
							<p className="text-xs text-gray-400 font-mono bg-gray-800/50 px-2 py-1 rounded-lg inline-block">
								{pageInfo.domain}
							</p>
						</div>
					</div>
				)}

				{/* Detected Tokens with enhanced cards */}
				{pageInfo?.tokens && pageInfo.tokens.length > 0 && (
					<div className="space-y-4">
						<div className="flex items-center space-x-3">
							<div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
								<span className="text-white text-xs">💎</span>
							</div>
							<h2 className="text-lg font-semibold text-white">Detected Tokens</h2>
						</div>
						<div className="grid gap-4">
							{pageInfo.tokens.slice(0, 5).map((token, index) => {
								const rate = exchangeRates.find(r => r.symbol === token.symbol);
								return (
									<div
										key={index}
										className="group backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:bg-white/10"
									>
										<div className="flex items-center justify-between">
											<div className="flex items-center space-x-4">
												<div className="relative">
													<div className="text-3xl group-hover:scale-110 transition-transform duration-300">
														{getTokenIcon(token.symbol)}
													</div>
													<div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
												</div>
												<div>
													<p className="font-bold text-lg text-white">{token.symbol}</p>
													{rate && (
														<div className="flex items-center space-x-2">
															<p className="text-sm text-gray-300 font-medium">
																${rate.price.toFixed(2)}
															</p>
															<span className={`text-xs px-2 py-1 rounded-full font-medium ${rate.change24h >= 0
																? 'bg-green-500/20 text-green-400 border border-green-500/30'
																: 'bg-red-500/20 text-red-400 border border-red-500/30'
																}`}>
																{rate.change24h >= 0 ? '↗' : '↘'} {Math.abs(rate.change24h).toFixed(2)}%
															</span>
														</div>
													)}
												</div>
											</div>
											<button
												onClick={() => handleTokenSelect(token.symbol)}
												className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
											>
												Swap
											</button>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* Enhanced Swap Interface */}
				{selectedToken && (
					<div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 shadow-xl">
						<div className="flex items-center space-x-3 mb-6">
							<div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
								<span className="text-white text-sm">💱</span>
							</div>
							<h3 className="text-lg font-semibold text-white">Swap ETH → {selectedToken}</h3>
						</div>

						<div className="space-y-6">
							<div>
								<label className="block text-sm font-semibold text-gray-200 mb-3">
									Amount (ETH)
								</label>
								<div className="relative">
									<input
										type="number"
										value={swapAmount}
										onChange={(e) => handleSwapAmountChange(e.target.value)}
										className="w-full px-4 py-4 bg-gray-800/50 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-xl transition-all duration-300"
										placeholder="0.0"
										min="0"
										step="0.01"
									/>
									<div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm font-medium">
										ETH
									</div>
								</div>
							</div>

							{swapEstimate && (
								<div className="backdrop-blur-xl bg-gray-800/30 rounded-xl p-4 border border-white/10 space-y-3">
									<div className="flex justify-between items-center">
										<span className="text-sm text-gray-300 font-medium">Estimated Output:</span>
										<span className="text-white font-bold">{swapEstimate.estimatedOutput.toFixed(6)} {selectedToken}</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm text-gray-300 font-medium">Slippage:</span>
										<span className="text-yellow-400 font-semibold">{swapEstimate.slippage.toFixed(2)}%</span>
									</div>
									<div className="flex justify-between items-center">
										<span className="text-sm text-gray-300 font-medium">Gas Cost:</span>
										<span className="text-white font-semibold">~${swapEstimate.gasCost.toFixed(2)}</span>
									</div>
								</div>
							)}

							<button
								onClick={() => executeSwap('ETH', selectedToken, parseFloat(swapAmount))}
								disabled={isLoading || !swapAmount || parseFloat(swapAmount) <= 0}
								className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-purple-500/25 disabled:transform-none disabled:shadow-none"
							>
								{isLoading ? (
									<div className="flex items-center justify-center space-x-2">
										<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
										<span>Processing...</span>
									</div>
								) : (
									'Execute Swap'
								)}
							</button>
						</div>
					</div>
				)}

				{/* Enhanced Settings Section */}
				<div className="space-y-4">
					<div className="flex items-center space-x-3">
						<h2 className="text-lg font-semibold text-white">Settings</h2>
					</div>

					<div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-white/10 shadow-xl space-y-6">
						{/* Detect phishing websites */}
						<div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-white/5">
							<div>
								<span className="text-xs font-semibold text-white">Detect phishing websites</span>
								<p className="text-xs text-gray-400 mt-1">Protect against malicious sites</p>
							</div>
							<ToggleSwitch
								checked={settings.detectPhishing}
								onChange={() => toggleSetting('', 'detectPhishing')}
							/>
						</div>

						{/* Explorer Section */}
						<div>
							<h3 className="font-semibold text-xs mb-4 text-gray-200 flex items-center space-x-2">
								Explorer Features
							</h3>
							<div className="space-y-3 ml-6">
								{Object.entries(settings.explorer).map(([key, value]) => (
									<div key={key} className="flex items-center justify-between p-3 bg-gray-800/20 rounded-lg border border-white/5">
										<span className="text-xs text-gray-200 font-medium">
											{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
										</span>
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

				{/* Enhanced Footer */}
				<div className="text-center pt-6">
					<button className="text-xs text-purple-400 hover:text-purple-300 transition-colors duration-300 font-medium">
						Submit a whitelist domain
					</button>
				</div>
			</div>
		</div>
	);
}

export default App;
