# MeowVerse - DeFi Security & Token Detection Extension

A Chrome extension that provides real-time phishing detection, token identification, and price monitoring for DeFi and cryptocurrency websites. Built with TypeScript, React, and WebExtension APIs.

## Features

### Core Functionality

- **Phishing Detection**: Real-time domain analysis using curated blacklists, whitelists, and fuzzy matching
- **Token Detection**: Automatic scanning of web pages for cryptocurrency tokens and Ethereum addresses
- **Price Monitoring**: Real-time token prices from multiple APIs (GlueX, CoinGecko fallback)
- **Security Overlays**: Warning banners for suspicious domains and phishing attempts
- **Multi-Source Validation**: Cross-references domains against MetaMask, DeFi Llama, and custom lists

### Technical Features

- **Content Script Integration**: DOM scanning and overlay injection for security warnings
- **Background Script**: Persistent phishing detection and API management
- **Database Caching**: Efficient domain list management with 4-hour refresh cycles
- **API Fallbacks**: Robust error handling with multiple data sources
- **Real-time Updates**: Tab monitoring for navigation and domain changes

## 🛠️ Implementation Details

### Architecture

```
src/
├── App.tsx                 # React popup interface
├── content/
│   └── content.ts         # Content script for page scanning
├── background/
│   └── background.ts      # Background service worker
├── libs/
│   ├── api.ts            # GlueX API integration
│   ├── constants.ts      # Configuration and endpoints
│   ├── db.ts            # Domain database management
│   ├── helpers.ts        # Utility functions
│   ├── phishingDetector.ts # Domain validation logic
│   └── storage.ts        # Browser storage utilities
└── assets/               # Static resources
```

### Key Components

#### Phishing Detection System (`phishingDetector.ts`)

- Multi-source domain validation against:
  - MetaMask security lists (fuzzylist, whitelist, blacklist)
  - DeFi Llama protocol directory
  - Custom domain lists (`safe-urls.json`)
  - TVL-filtered protocol lists (minimum threshold: $1M)
- Fuzzy matching for impersonation detection
- Real-time domain checking on tab updates

#### Content Script (`content.ts`)

- **Token Detection**: Regex-based scanning for:
  - Common token symbols (ETH, BTC, USDC, USDT, DAI, WBTC, UNI, AAVE, COMP, LINK)
  - Ethereum addresses (`0x[a-fA-F0-9]{40}`)
  - Price patterns (`$[\d,]+\.?\d*`)
- **Security Overlays**: Dynamic banner injection for:
  - Phishing warnings with dismiss functionality
  - Token detection notifications
  - Real-time security status updates

#### Background Service (`background.ts`)

- **Tab Monitoring**:
  - `tabs.onUpdated`: Navigation detection
  - `tabs.onActivated`: Tab switching
  - `windows.onFocusChanged`: Window focus changes
- **Message Handling**: Content script communication
- **API Management**: GlueX integration with fallbacks
- **State Persistence**: Per-tab phishing results

#### Database Management (`db.ts`)

- **Caching Strategy**: 4-hour refresh cycles using `Browser.alarms`
- **Data Sources**:
  - DeFi Llama protocols API
  - MetaMask security lists
  - Custom domain configurations
- **Memory Management**: Efficient Set-based storage for O(1) lookups

#### API Integration (`api.ts`)

- **GlueX Services**:
  - Exchange Rates API for token pricing
  - Router API for swap estimates
  - Yield API for APY opportunities
- **Fallback Mechanisms**: Mock data generation for development
- **Error Handling**: Exponential backoff with retry logic

## 🔒 Security Implementation

### Domain Validation Flow

```typescript
// 1. Extract domain from URL
const domain = new URL(url).hostname.replace("www.", "");

// 2. Check against multiple sources
const result = await checkDomain(domain);

// 3. Classify result
switch (result.type) {
  case "allowed": // Whitelisted domain
  case "blocked": // Blacklisted domain
  case "fuzzy": // Suspicious/impersonation
  case "unknown": // Not in database
}
```

### Content Security

- **DOM Access**: Limited to token detection and overlay injection
- **Message Passing**: Secure communication between content and background scripts
- **API Validation**: Input sanitization and rate limiting
- **Storage Isolation**: Extension-specific storage areas

## 🎨 UI/UX Design

### Popup Interface (`App.tsx`)

- **Current Page Analysis**: URL display with security status
- **Token Detection**: Real-time price display with 24h changes
- **Address Monitoring**: Ethereum address detection with price lookup
- **Security Status**: Phishing detection results with refresh capabilities

### Overlay System

- **Phishing Warnings**: Red gradient banners for blocked domains
- **Token Notifications**: Blue gradient banners for detected assets
- **Dismissible UI**: User-controlled banner management
- **Responsive Design**: Adaptive positioning and sizing

## 🔧 Development

### Prerequisites

- Node.js 18+
- TypeScript 5.0+
- Chrome/Chromium browser
- WebExtension polyfill

### Build System

```bash
# Install dependencies
yarn install

# Development mode
yarn dev

# Production build
yarn build

```

### Extension Loading

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Load unpacked extension from `dist/` folder
4. Verify background script initialization

## 📊 Performance Characteristics

### Database Operations

- **Initialization**: ~2-5 seconds for first load
- **Lookup Time**: O(1) for domain validation
- **Memory Usage**: ~2-5MB for domain lists
- **Refresh Cycles**: 4-hour intervals with background alarms

## 🚀 Future Enhancements

- [ ] **Multi-chain Support**: Ethereum and HyperEVM, planning Polygon, BSC, Arbitrum integration
- [ ] **Advanced Phishing**: ML-based URL analysis
- [ ] **Portfolio Tracking**: Wallet balance monitoring
- [ ] **Social Features**: Community-driven domain reporting
- [ ] **API Rate Limiting**: Intelligent request throttling

## ⚠️ Current Limitations

- **Single Chain**: Currently only supports Ethereum mainnet
- **Static Lists**: Domain validation relies on external curated lists
- **No User Input**: Users cannot contribute to domain reputation system

## 🔍 Troubleshooting

### Common Issues

- **Background Script Not Loading**: Check `chrome://extensions/` for errors
- **Token Detection Failing**: Verify content script injection
- **API Errors**: Check network connectivity and API key configuration
- **Database Not Updating**: Verify alarm permissions and storage access

### Debug Mode

```typescript
// Enable verbose logging
console.log("Database state:", {
  allowed: allowedDomainsDb.data.size,
  blocked: blockedDomainsDb.data.size,
  fuzzy: fuzzyDomainsDb.data.length,
});
```

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

- **Issues**: GitHub issue tracker
- **Documentation**: Code comments and inline docs
- **Development**: TypeScript definitions and error messages
