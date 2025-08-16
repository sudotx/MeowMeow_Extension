// Background script for handling API calls and wallet interactions
import { 
  fetchExchangeRates, 
  getSwapEstimate, 
  executeSwap, 
  fetchYieldOptions,
  type SwapRequest
} from '../libs/api';

// Re-export API functions for background script use
const backgroundFetchExchangeRates = fetchExchangeRates;
const backgroundGetSwapEstimate = getSwapEstimate;
const backgroundFetchYieldOptions = fetchYieldOptions;

// Execute swap intent via user's wallet
async function executeSwapIntent(
  fromToken: string,
  toToken: string,
  amount: number
): Promise<boolean> {
  try {
    // Check if MetaMask is installed
    if (typeof (window as any).ethereum === 'undefined') {
      throw new Error('MetaMask not installed');
    }
    
    // Request account access
    const accounts = await (window as any).ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found');
    }
    
    // Create swap request
    const swapRequest: SwapRequest = {
      fromToken,
      toToken,
      amount,
      userAddress: accounts[0],
      slippageTolerance: 0.5
    };
    
    // Execute swap using API helper
    const result = await executeSwap(swapRequest);
    
    if (result.success) {
      console.log('Swap transaction sent:', result.txHash);
      return true;
    } else {
      console.error('Swap failed:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error executing swap:', error);
    return false;
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  switch (request.action) {
    case 'fetchExchangeRates':
      backgroundFetchExchangeRates(request.tokens).then(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'fetchYieldOptions':
      backgroundFetchYieldOptions().then(sendResponse);
      return true;
      
    case 'getSwapEstimate':
      backgroundGetSwapEstimate(request.fromToken, request.toToken, request.amount)
        .then(sendResponse);
      return true;
      
    case 'executeSwap':
      executeSwapIntent(request.fromToken, request.toToken, request.amount)
        .then(sendResponse);
      return true;
      
    case 'optimizeYield':
      // Handle yield optimization request
      backgroundFetchYieldOptions().then(options => {
        // Find best yield option
        const bestOption = options.reduce((best, current) => 
          current.apy > best.apy ? current : best
        );
        
        // Open new tab with optimization details
        chrome.tabs.create({
          url: `https://gluex.com/optimize?protocol=${bestOption.protocol}&apy=${bestOption.apy}`
        });
      });
      break;
  }
});

// Initialize background script
console.log('MeowVerse extension background script loaded');
