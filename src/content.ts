// Content script - runs in the context of web pages
// This script can interact with the DOM of the current page

console.log('Content script loaded');

// Example: Listen for messages from popup or background
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Message received in content script:', request);
  
  if (request.action === 'getPageInfo') {
    const pageInfo = {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname
    };
    sendResponse(pageInfo);
  }
  
  return true;
});

// Example: Send a message to background script
chrome.runtime.sendMessage({ 
  action: 'contentScriptLoaded', 
  url: window.location.href 
});

export {};
