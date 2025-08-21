// Background script for handling API calls
import {
	fetchExchangeRates,
	getSwapEstimate,
	getExchangeRates as apiGetExchangeRates,
	// type YieldOption
} from '../libs/api';

console.log("background loaded");

import Browser from "webextension-polyfill";

// import cute from "@assets/img/memes/cute-128.png";
// import maxPain from "@assets/img/memes/max-pain-128.png";
// import que from "@assets/img/memes/que-128.png";
// import upOnly from "@assets/img/memes/up-only-128.png";

import { getStorage } from '../libs/helpers';
import { checkDomain } from '../libs/phishingDetector';

// Re-export API functions for background script use
const backgroundFetchExchangeRates = fetchExchangeRates;
const backgroundGetSwapEstimate = getSwapEstimate;
// const backgroundFetchYieldOptions = fetchYieldOptions;

let lastPhishingResult: any = null;

// Execute swap intent via user's wallet
async function getCurrentTab() {
	const queryOptions = { active: true, currentWindow: true };
	const [tab] = await Browser.tabs.query(queryOptions);
	return tab;
}

async function handlePhishingCheck(trigger: string, tab?: Browser.Tabs.Tab) {
	const phishingDetector = await getStorage("local", "settings:phishingDetector", true);
	if (!phishingDetector) {
		// await Browser.action.setIcon({ path: cute });
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
	} catch (error) {
		console.log("handlePhishingCheck error", error);
		isTrusted = false;
		isPhishing = false;
		reason = "Invalid URL";
		phishingResult = { result: false, type: "unknown", extra: "Invalid URL" };
	}

	lastPhishingResult = phishingResult;


	if (isTrusted) {
		// Browser.action.setIcon({ path: upOnly });
		Browser.action.setTitle({ title: reason });
		return;
	}

	if (isPhishing) {
		// Browser.action.setIcon({ path: maxPain });
		Browser.action.setTitle({ title: reason });
	} else {
		// Browser.action.setIcon({ path: que });
		Browser.action.setTitle({ title: reason });
	}
}


let lastCheckKey = "";

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	switch (request.action) {
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

		case 'getPhishingResult':
			sendResponse(lastPhishingResult);
			return true;

		// case 'fetchYieldOptions':
		// 	backgroundFetchYieldOptions().then(sendResponse);
		// 	return true;

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

		case 'optimizeYield':
			// Handle yield optimization request
			// backgroundFetchYieldOptions().then(options => {
			// 	// Find best yield option
			// 	const bestOption = options.reduce((best, current) =>
			// 		current.apy > best.apy ? current : best
			// 	);

			// 	// Open new tab with optimization details
			// 	chrome.tabs.create({
			// 		url: `https://gluex.com/optimize?protocol=${bestOption.protocol}&apy=${bestOption.apy}`
			// 	});
			// });
			break;
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