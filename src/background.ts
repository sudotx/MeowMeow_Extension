// Background script for Chrome extension
// This runs in the background and handles extension lifecycle events

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Handle messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Message received in background:', request);
  
  if (request.action === 'getData') {
    // Example: Handle data requests
    sendResponse({ data: 'Hello from background!' });
  }
  
  return true; // Keep message channel open for async responses
});

export {};
