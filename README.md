# MeowVerse - DeFi Companion Extension

A modern Chrome extension that enhances your DeFi experience with real-time token detection, exchange rates, and seamless swap functionality powered by GlueX APIs.

## 🚀 Features

### Core Functionality
- **Token Detection**: Automatically scans web pages for cryptocurrency tokens and displays real-time exchange rates
- **Real-time Exchange Rates**: Fetches live prices from GlueX Exchange Rates API with 24h change indicators
- **One-Click Swaps**: Execute token swaps directly from the extension using GlueX Router API
- **Yield Optimization**: Smart overlay banners suggest better APY opportunities via GlueX Yield API
- **Modern Dark Theme**: Sleek, minimalist UI with adaptive theme support

### Technical Features
- **Content Script Integration**: Detects tokens and injects optimization banners on DeFi-related pages
- **Background Script**: Handles API calls and wallet interactions
- **MetaMask Integration**: Seamless wallet connection for transaction execution
- **Responsive Design**: Mobile-optimized popup interface
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support

## 🛠️ Implementation Details

### Architecture
```
src/
├── App.tsx                 # Main popup UI component
├── content/
│   └── content.ts         # Content script for token detection
├── background/
│   └── background.ts      # Background script for API calls
├── libs/
│   ├── api.ts            # GlueX API integration
│   ├── constants.ts      # Configuration constants
│   └── helpers.ts        # Utility functions
└── assets/               # Icons and static resources
```

### Key Components

#### Token Detection (`content.ts`)
- Scans page content for common token symbols (ETH, BTC, USDC, etc.)
- Extracts Ethereum addresses using regex patterns
- Sends detected tokens to popup for price fetching

#### Exchange Rate Integration (`api.ts`)
- Centralized API client for GlueX services
- Automatic retry logic with exponential backoff
- Mock data fallback for development

#### Swap Interface (`App.tsx`)
- Real-time swap estimates with slippage and gas costs
- MetaMask wallet integration
- Transaction status feedback

#### Overlay Banner System
- Context-aware banner injection on DeFi pages
- Dismissible optimization suggestions
- Direct integration with GlueX Yield API

### API Integration

#### GlueX Exchange Rates API
```typescript
// Fetch real-time prices
const rates = await fetchExchangeRates(['ETH', 'BTC', 'USDC']);
```

#### GlueX Router API
```typescript
// Get swap estimates
const estimate = await getSwapEstimate('ETH', 'USDC', 1.0);

// Execute swaps
const result = await executeSwap({
  fromToken: 'ETH',
  toToken: 'USDC',
  amount: 1.0,
  userAddress: '0x...'
});
```

#### GlueX Yield API
```typescript
// Fetch yield optimization options
const options = await fetchYieldOptions();
```

## 🎨 UI/UX Design

### Design Principles
- **Minimalist**: Clean, uncluttered interface focusing on essential information
- **Dark-First**: Modern dark theme with light mode toggle
- **Responsive**: Adaptive layout for different screen sizes
- **Accessible**: High contrast, keyboard navigation, screen reader support

### Color Scheme
- **Primary**: Blue (#3B82F6) for actions and highlights
- **Background**: Dark gray (#111827) for main surfaces
- **Surface**: Medium gray (#1F2937) for cards and panels
- **Text**: White (#FFFFFF) for primary text, gray (#9CA3AF) for secondary

### Layout Structure
```
┌─────────────────────────┐
│ 🐈‍⬛ MeowVerse    ☀️/🌙 │
├─────────────────────────┤
│ Current Page Info       │
├─────────────────────────┤
│ Detected Tokens         │
│ [Token] [Price] [Swap]  │
├─────────────────────────┤
│ Swap Interface          │
│ [Amount] [Estimate]     │
│ [Execute Swap]          │
├─────────────────────────┤
│ Settings                │
│ [Toggles]               │
└─────────────────────────┘
```

## 🔧 Development

### Prerequisites
- Node.js 16+
- Yarn or npm
- Chrome browser for testing

### Setup
```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Build for production
yarn build
```

### Extension Loading
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist` folder
4. The extension icon should appear in your toolbar

### Testing
- Visit DeFi websites (Uniswap, Aave, etc.) to test token detection
- Check the popup for detected tokens and exchange rates
- Test swap functionality with MetaMask connected

## 🔒 Security Considerations

- API keys are not hardcoded (use environment variables in production)
- Wallet interactions require explicit user consent
- Content scripts only access necessary page data
- All external API calls include proper error handling

## 🚀 Future Enhancements

- [ ] Multi-chain support (Polygon, BSC, etc.)
- [ ] Portfolio tracking and analytics
- [ ] Advanced yield farming strategies
- [ ] Social trading features
- [ ] Mobile app companion

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For questions or support, please open an issue on GitHub or contact the development team.
