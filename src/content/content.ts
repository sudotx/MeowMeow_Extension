// Content script for token detection and overlay banner
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

// Token detection patterns
const TOKEN_PATTERNS = {
  // Common token symbols in text
  symbols: /\b(ETH|BTC|USDC|USDT|DAI|WBTC|UNI|AAVE|COMP|LINK|MATIC|AVAX|SOL|ADA|DOT|LTC|BCH|XRP|DOGE|SHIB)\b/gi,
  
  // Ethereum addresses
  addresses: /0x[a-fA-F0-9]{40}/g,
  
  // Common token price patterns
  prices: /\$[\d,]+\.?\d*/g
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
  
  // Extract Ethereum addresses
  const addressMatches = text.match(TOKEN_PATTERNS.addresses);
  if (addressMatches) {
    addressMatches.forEach(address => {
      if (!tokens.find(t => t.address === address)) {
        tokens.push({ symbol: address.slice(0, 6) + '...', address });
      }
    });
  }
  
  return tokens.slice(0, 10); // Limit to 10 tokens
}

// Create overlay banner
function createOverlayBanner() {
  const banner = document.createElement('div');
  banner.id = 'meowverse-banner';
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
        <span style="font-size: 16px;">🐈‍⬛</span>
        <span>Better APY available? Click to optimize via GlueX Yield API</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="meowverse-optimize" style="
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        ">Optimize Yield</button>
        <button id="meowverse-dismiss" style="
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
  document.getElementById('meowverse-dismiss')?.addEventListener('click', () => {
    banner.remove();
  });
  
  document.getElementById('meowverse-optimize')?.addEventListener('click', () => {
    // Send message to background script to handle optimization
    chrome.runtime.sendMessage({ 
      action: 'optimizeYield',
      url: window.location.href 
    });
    banner.remove();
  });
}

// Check if banner should be shown (placeholder logic)
function shouldShowBanner(): boolean {
  // Check if page contains DeFi-related content
  const defiKeywords = ['yield', 'apy', 'stake', 'farm', 'liquidity', 'swap', 'defi'];
  const text = document.body.innerText.toLowerCase();
  return defiKeywords.some(keyword => text.includes(keyword));
}

// Initialize content script
function init() {
  // Detect tokens
  const tokens = detectTokens();
  
  // Get page info
  const pageInfo: PageInfo = {
    title: document.title,
    url: window.location.href,
    domain: window.location.hostname,
    tokens
  };
  
  // Send page info to popup
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'getPageInfo') {
      sendResponse(pageInfo);
    }
  });
  
  // Show banner if conditions are met
  if (shouldShowBanner()) {
    setTimeout(createOverlayBanner, 2000); // Show after 2 seconds
  }
}

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
