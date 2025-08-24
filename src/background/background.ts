// Background script for handling API calls

console.log("background loaded");

import Browser from "webextension-polyfill";

import { initialUpdateDone } from '../libs/db';
import { getBatchTokenPrices, getStorage } from '../libs/helpers';
// import { checkDomain } from '../libs/phishingDetector';
import { checkDomain } from "../libs/phishingDetector";

let lastPhishingResult: any = null;
let activeTabPhishingResults = new Map<number, any>();

// Execute swap intent via user's wallet
async function getCurrentTab() {
	const queryOptions = { active: true, currentWindow: true };
	const [tab] = await Browser.tabs.query(queryOptions);
	return tab;
}

async function handlePhishingCheck(trigger: string, tab?: Browser.Tabs.Tab) {
	const phishingDetector = await getStorage("local", "settings:phishingDetector", true);
	if (!phishingDetector) {
		console.log('Phishing detector disabled in settings');
		return;
	}

	let isPhishing = false;
	let isTrusted = false;
	let reason = "Unknown website";
	let phishingResult: any = null;

	try {
		if (!tab)
			tab = await getCurrentTab();

		if (!tab) {
			console.log('Unable to get current tab');
			return;
		}

		const url = tab.url;
		if (!url) {
			console.log('Unable to get url');
			return;
		}

		if (url.startsWith("https://metamask.github.io/phishing-warning")) {
			// already captured and redirected to metamask phishing warning page
			isPhishing = true;
			reason = "Phishing detected by Metamask";
			phishingResult = { result: true, type: "blocked", extra: "Metamask" };
		} else {
			const domain = new URL(url).hostname.replace("www.", "");
			if (!domain) return;

			console.log(`Checking domain for phishing: ${domain} (trigger: ${trigger})`);
			const res = await checkDomain(domain);
			phishingResult = res;
			console.log("Phishing check result", { domain, res, trigger });

			isPhishing = res.result;
			if (isPhishing) {
				switch (res.type) {
					case "blocked":
						reason = "Website is blacklisted";
						break;
					case "fuzzy":
						reason = `Website impersonating ${res.extra}`;
						break;
					default:
						reason = "Suspicious website detected";
				}
			} else {
				switch (res.type) {
					case "allowed":
						isTrusted = true;
						reason = "Website is whitelisted";
						break;
					default:
						reason = "Unknown website";
				}
			}
		}

		// Store result for this tab
		if (tab.id) {
			activeTabPhishingResults.set(tab.id, phishingResult);
		}

	} catch (error) {
		console.log("handlePhishingCheck error", error);
		isTrusted = false;
		isPhishing = false;
		reason = "Invalid URL";
		phishingResult = { result: false, type: "unknown", extra: "Invalid URL" };
	}

	lastPhishingResult = phishingResult;

	// Update browser action title
	if (isTrusted) {
		Browser.action.setTitle({ title: reason });
	} else if (isPhishing) {
		Browser.action.setTitle({ title: reason });
	} else {
		Browser.action.setTitle({ title: reason });
	}

	return phishingResult;
}

let lastCheckKey = "";

// Initialize background script
console.log('MeowVerse extension background script loaded');

// Wait for database to be ready before handling any requests
async function initializeBackground() {
	try {
		// Wait for the database to be fully loaded
		await initialUpdateDone;
		console.log('Database initialized, background script ready');

		// Now we can safely handle requests
		setupMessageHandlers();
	} catch (error) {
		console.error('Failed to initialize background script:', error);
	}
}

// Move message handling to a separate function
function setupMessageHandlers() {
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		console.log('Background script received message:', request.action, 'from:', sender.tab?.url);

		switch (request.action) {
			case 'contentScriptLoaded':
				console.log('Content script loaded for:', request.url, 'with', request.tokens, 'tokens and', request.addresses, 'addresses');
				// Trigger phishing check for this tab
				if (sender.tab) {
					handlePhishingCheck('contentScriptLoaded', sender.tab);
				}
				sendResponse({ success: true });
				break;

			case 'fetchExchangeRates':
				const { tokens } = request;
				// Use the helper function for batch token prices for consistency and fallback
				getBatchTokenPrices(tokens.map((symbol: string) => `ethereum:${symbol}`), true)
					.then(prices => {
						// Transform the prices back to the format expected by the UI (Array<ExchangeRate>)
						const rates = tokens.map((token: string) => {
							const key = `ethereum:${token}`;
							const priceInfo = prices[key];
							return {
								symbol: token,
								price: priceInfo?.price || 0,
								change24h: 0, // This data isn't available from this endpoint
								volume24h: 0,
								marketCap: 0
							};
						});
						sendResponse(rates);
					})
					.catch(error => {
						console.error('Error fetching exchange rates via helper:', error);
						sendResponse([]);
					});
				return true; // Keep message channel open for async response

			case 'fetchAddressPrices':
				const { addresses } = request;
				// Use the helper function for batch token prices
				getBatchTokenPrices(addresses.map((addr: string) => `ethereum:${addr}`), true)
					.then(prices => {
						const priceMap = addresses.reduce((acc: any, address: string) => {
							const key = `ethereum:${address}`;
							acc[address] = prices[key]?.price || 0;
							return acc;
						}, {});
						sendResponse(priceMap);
					})
					.catch(error => {
						console.error('Error fetching address prices:', error);
						sendResponse({});
					});
				return true;

			case 'checkDomain':
				// Handle domain check requests from content script
				console.log('Checking domain from content script:', request.domain);
				checkDomain(request.domain).then(result => {
					console.log('Domain check result for', request.domain, ':', result);
					sendResponse(result);
				}).catch(error => {
					console.error('Error checking domain:', error);
					sendResponse({ result: false, type: "unknown", extra: "Error checking domain" });
				});
				return true;

			case 'getPhishingResult':
				// Return phishing result for specific tab or last known result
				if (sender.tab && activeTabPhishingResults.has(sender.tab.id!)) {
					sendResponse(activeTabPhishingResults.get(sender.tab.id!));
				} else {
					sendResponse(lastPhishingResult);
				}
				return true;
		}
	});
}

// monitor updates to the tab, specifically when the user navigates to a new page (new url)
Browser.tabs.onUpdated.addListener(async (tabId, onUpdatedInfo, tab) => {
	if (onUpdatedInfo.status === "complete" && tab.active) {
		Browser.tabs.sendMessage(tabId, { message: "TabUpdated" });
	}

	if (!tab?.active) return; // only handle active tabs
	const key = `${tab.id}-${tab.url}`;
	if (lastCheckKey === key) {
		return;
	}
	lastCheckKey = key;

	// Clear old phishing result for this tab
	if (tab.id) {
		activeTabPhishingResults.delete(tab.id);
	}

	handlePhishingCheck('tabUpdate', tab);
});

// monitor tab activations, when the user switches to a different tab that was already open but not active
Browser.tabs.onActivated.addListener(async (onActivatedInfo) => {
	Browser.tabs.sendMessage(onActivatedInfo.tabId, { message: "TabActivated" });
	const tab = await Browser.tabs.get(onActivatedInfo.tabId);
	handlePhishingCheck('tabActivated', tab);
});

// monitor window focus changes, when the user switches between browser windows
Browser.windows.onFocusChanged.addListener(async (windowId) => {
	if (windowId === Browser.windows.WINDOW_ID_NONE) return; // no window focused
	const tab = await getCurrentTab();
	if (tab && tab.id) {
		Browser.tabs.sendMessage(tab.id, { message: "TabActivated" });
		handlePhishingCheck('windowFocused', tab);
	}
});

// Clean up phishing results when tabs are closed
Browser.tabs.onRemoved.addListener((tabId) => {
	activeTabPhishingResults.delete(tabId);
});

// Start initialization
initializeBackground();