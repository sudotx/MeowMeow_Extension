// Content script for token detection and overlay banner
// Content script - runs in the context of web pages
// This script can interact with the DOM of the current page

console.log('Content script loaded');


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

// Token detection patterns
const TOKEN_PATTERNS = {
	// Common token symbols in text
	symbols: /\b(ETH|BTC|USDC|USDT|DAI|WBTC|UNI|AAVE|COMP|LINK|MATIC|AVAX|SOL|ADA|DOT|LTC|BCH|XRP|DOGE|SHIB)\b/gi,

	// Ethereum addresses
	addresses: /0x[a-fA-F0-9]{40}/g,
};

// Detect tokens on the current page
function detectTokens(): TokenInfo[] {
	const tokens: TokenInfo[] = [];
	const text = document.body.innerText;

	// Extract token symbols
	const symbolMatches = text.match(TOKEN_PATTERNS.symbols);
	if (symbolMatches) {
		symbolMatches.forEach(symbol => {
			if (!tokens.find(t => t.symbol === symbol.toUpperCase())) {
				tokens.push({ symbol: symbol.toUpperCase() });
			}
		});
	}

	return tokens.slice(0, 10); // Limit to 10 tokens
}

function detectAddresses(): string[] {
	const text = document.body.innerText;
	const addressMatches = text.match(TOKEN_PATTERNS.addresses);
	if (addressMatches) {
		return [...new Set(addressMatches)]; // Return unique addresses
	}
	return [];
}

// Add this function to actively check the current domain
async function checkCurrentDomain() {
	const domain = window.location.hostname.replace("www.", "");
	if (!domain) return;

	try {
		// Send message to background script to check domain
		chrome.runtime.sendMessage({
			action: 'checkDomain',
			domain: domain
		}, (response) => {
			if (chrome.runtime.lastError) {
				console.log('Error checking domain:', chrome.runtime.lastError);
				return;
			}

			if (response && response.result) {
				// Show warning banner for phishing sites
				showPhishingWarning(response);
			}
		});
	} catch (error) {
		console.log('Error checking domain:', error);
	}
}

// Add phishing warning banner
function showPhishingWarning(phishingResult: any) {
	// Remove existing warning if present
	const existingWarning = document.getElementById('phishing-warning');
	if (existingWarning) {
		existingWarning.remove();
	}

	const warningBanner = document.createElement('div');
	warningBanner.id = 'phishing-warning';
	warningBanner.innerHTML = `
		<div style="
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
			color: white;
			padding: 12px 16px;
			z-index: 999999;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			text-align: center;
			font-weight: bold;
			box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
		">
			⚠️ WARNING: This site may be phishing! ${phishingResult.type === 'fuzzy' ? `Impersonating ${phishingResult.extra}` : 'Proceed with caution.'}
			<button id="phishing-dismiss" style="
				background: rgba(255,255,255,0.2);
				border: 1px solid rgba(255,255,255,0.3);
				color: white;
				margin-left: 12px;
				padding: 4px 8px;
				border-radius: 4px;
				cursor: pointer;
				font-size: 12px;
				transition: all 0.2s;
			">Dismiss</button>
		</div>
	`;

	document.body.appendChild(warningBanner);

	// Add dismiss functionality
	document.getElementById('phishing-dismiss')?.addEventListener('click', () => {
		warningBanner.remove();
	});
}

// Create overlay banner for asset detection
function createAssetDetectionBanner() {
	// Remove existing banner if present
	const existingBanner = document.getElementById('safefi-banner');
	if (existingBanner) {
		existingBanner.remove();
	}

	const banner = document.createElement('div');
	banner.id = 'safefi-banner';
	banner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">🛡️</span>
        <span>SafeFi has detected crypto assets on this page.</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="safefi-dismiss" style="
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">×</button>
      </div>
    </div>
  `;

	document.body.appendChild(banner);

	// Add event listeners
	document.getElementById('safefi-dismiss')?.addEventListener('click', () => {
		banner.remove();
	});
}

// Check if banner should be shown
function shouldShowBanner(tokens: TokenInfo[], addresses: string[]): boolean {
	return tokens.length > 0 || addresses.length > 0;
}

// Handle messages from popup and background script
function setupMessageListener() {
	chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
		console.log('Content script received message:', request);

		switch (request.action) {
			case 'getPageInfo':
				// Get page info
				const pageInfo: PageInfo = {
					title: document.title,
					url: window.location.href,
					domain: window.location.hostname,
					tokens: detectTokens(),
					addresses: detectAddresses()
				};
				sendResponse(pageInfo);
				break;

			case 'refreshPhishingCheck':
				// Re-check domain for phishing
				checkCurrentDomain();
				sendResponse({ success: true });
				break;

			case 'TabUpdated':
			case 'TabActivated':
				// Re-check domain when tab is updated or activated
				setTimeout(checkCurrentDomain, 1000);
				break;

			default:
				console.log('Unknown action received:', request.action);
		}
	});
}

// Initialize content script
function init() {
	console.log('Initializing content script for:', window.location.href);

	// Setup message listener
	setupMessageListener();

	// Detect tokens and addresses
	const tokens = detectTokens();
	const addresses = detectAddresses();

	// Send page info to background script
	chrome.runtime.sendMessage({
		action: 'contentScriptLoaded',
		url: window.location.href,
		domain: window.location.hostname,
		tokens: tokens.length,
		addresses: addresses.length
	});

	// Check domain for phishing immediately
	checkCurrentDomain();

	// Show banner if conditions are met
	if (shouldShowBanner(tokens, addresses)) {
		setTimeout(createAssetDetectionBanner, 2000); // Show after 2 seconds
	}
}

// Run initialization
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', init);
} else {
	init();
}

export { };