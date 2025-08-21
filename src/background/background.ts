// Background script for handling API calls
import {
	getExchangeRates as apiGetExchangeRates,
	fetchExchangeRates,
	getSwapEstimate,
} from '../libs/api';

console.log("background loaded");

import Browser from "webextension-polyfill";

import { getStorage } from '../libs/helpers';
import { checkDomain } from '../libs/phishingDetector';

// Re-export API functions for background script use
const backgroundFetchExchangeRates = fetchExchangeRates;
const backgroundGetSwapEstimate = getSwapEstimate;

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

// Handle messages from content script and popup
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
			backgroundFetchExchangeRates(request.tokens).then(sendResponse);
			return true; // Keep message channel open for async response

		case 'fetchAddressPrices':
			const { addresses } = request;
			const rateRequests = addresses.map((address: string) => ({
				domestic_blockchain: 'ethereum',
				domestic_token: address,
				foreign_blockchain: 'ethereum',
				foreign_token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' // USDC
			}));
			apiGetExchangeRates(rateRequests).then(rates => {
				const prices = addresses.reduce((acc: any, address: string, index: number) => {
					acc[address] = rates[index]?.rate || 0;
					return acc;
				}, {});
				sendResponse(prices);
			}).catch(() => sendResponse({}));
			return true;

		case 'checkDomain':
			// Handle domain check requests from content script
			console.log('Checking domain from content script:', request.domain);
			checkDomain(request.domain).then(result => {
				console.log('Domain check result for', request.domain, ':', result);
				sendResponse(result);
			}).catch(error => {
				console.log('Error checking domain:', error);
				sendResponse({ result: false, type: "unknown" });
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

		case 'getSwapEstimate':
			backgroundGetSwapEstimate(
				request.fromToken,
				request.toToken,
				request.amount,
				request.userAddress || '0x0000000000000000000000000000000000000000',
				request.outputReceiver || request.userAddress || '0x0000000000000000000000000000000000000000',
				request.uniquePID || Math.random().toString(36).substring(2, 15)
			)
				.then(sendResponse);
			return true;
	}
});

// Initialize background script
console.log('MeowVerse extension background script loaded');

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
	
	await handlePhishingCheck('tabUpdate', tab);
});

// monitor tab activations, when the user switches to a different tab that was already open but not active
Browser.tabs.onActivated.addListener(async (onActivatedInfo) => {
	Browser.tabs.sendMessage(onActivatedInfo.tabId, { message: "TabActivated" });
	const tab = await Browser.tabs.get(onActivatedInfo.tabId);
	await handlePhishingCheck('tabActivated', tab);
});

// monitor window focus changes, when the user switches between browser windows
Browser.windows.onFocusChanged.addListener(async (windowId) => {
	if (windowId === Browser.windows.WINDOW_ID_NONE) return; // no window focused
	const tab = await getCurrentTab();
	if (tab && tab.id) {
		Browser.tabs.sendMessage(tab.id, { message: "TabActivated" });
		await handlePhishingCheck('windowFocused', tab);
	}
});

// Clean up phishing results when tabs are closed
Browser.tabs.onRemoved.addListener((tabId) => {
	activeTabPhishingResults.delete(tabId);
});