# HL Hackathon Chrome Extension

A Chrome extension built with React, TypeScript, and Vite.

## Development

### Prerequisites
- Node.js (v16 or higher)
- Chrome browser

### Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Loading the Extension in Chrome

1. Build the extension:
   ```bash
   npm run build
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" (toggle in the top right)

4. Click "Load unpacked" and select the `dist` folder

5. The extension should now appear in your Chrome toolbar

## Extension Structure

- **Popup**: The main React app that opens when you click the extension icon
- **Content Script**: Runs on web pages and can interact with page content
- **Background Script**: Handles extension lifecycle and background tasks
- **Manifest**: Defines extension permissions and configuration

## Features

- **Fixed 400x600 pixel popup dimensions** - Strictly enforced for consistent UI
- Get current page information (title, URL, domain)
- Example message passing between popup, content script, and background
- Modern React with TypeScript
- Hot reload during development

## Development Tips

- Use `npm run dev` for hot reload during development
- Check the Chrome extension developer tools for debugging
- Content script logs appear in the webpage's console
- Background script logs appear in the extension's service worker console
- Popup logs appear in the popup's developer tools

## Extension Permissions

Currently configured with:
- `activeTab`: Access to the current active tab
- `storage`: Access to Chrome storage APIs

You can modify permissions in `public/manifest.json`.
