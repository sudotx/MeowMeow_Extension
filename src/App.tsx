import { useEffect, useState } from 'react';
import './App.css';

interface PageInfo {
  title: string;
  url: string;
  domain: string;
}

interface Settings {
  detectPhishing: boolean;
  twitter: {
    mitigatePhishing: boolean;
    hideCashTags: boolean;
    hideHashTags: boolean;
    hideQT: boolean;
    hideBotReplies: boolean;
  };
  explorer: {
    enableAddressTags: boolean;
    enableTokenPrices: boolean;
    enableHideScamTransactions: boolean;
  };
}

function App() {
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null)
  const [isExtension, setIsExtension] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    detectPhishing: true,
    twitter: {
      mitigatePhishing: true,
      hideCashTags: true,
      hideHashTags: true,
      hideQT: true,
      hideBotReplies: false,
    },
    explorer: {
      enableAddressTags: true,
      enableTokenPrices: true,
      enableHideScamTransactions: false,
    }
  })

  useEffect(() => {
    // Check if running as Chrome extension
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      setIsExtension(true)
      
      // Get current active tab info
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id!, { action: 'getPageInfo' }, (response) => {
            if (response) {
              setPageInfo(response)
            }
          })
        }
      })
    }
  }, [])

  const handleGetPageInfo = async () => {
    if (isExtension) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id!, { action: 'getPageInfo' }, (response) => {
            if (response) {
              setPageInfo(response)
            }
          })
        }
      })
    }
  }

  const toggleSetting = (category: string, setting: string) => {
    setSettings(prev => {
      if (category === '') {
        // Handle top-level settings
        return {
          ...prev,
          [setting]: !prev[setting as keyof Settings]
        }
      } else {
        // Handle nested settings
        const categorySettings = prev[category as keyof Settings] as Record<string, boolean>
        return {
          ...prev,
          [category]: {
            ...categorySettings,
            [setting]: !categorySettings[setting]
          }
        }
      }
    })
  }

  const ToggleSwitch = ({
    checked,
    onChange
  }: {
    checked: boolean;
    onChange: () => void
  }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ease-in-out duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )

  return (
    <div className="w-full h-full bg-purple-400 p-2 flex flex-col">
      {/* Header with Logo and Title */}
      <div className="text-center mb-2">
        <div className="flex justify-center mb-1">
          {/* Llama Logo - using a simple emoji as placeholder */}
          <div className="text-3xl">🐈‍⬛</div>
        </div>
        <h1 className="text-xl font-bold text-black">MeowVerse</h1>
      </div>

      {/* Settings Panel */}
      <div className="flex-1 bg-gray-300 rounded-lg p-2 shadow-sm">
        {/* Detect phishing websites */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-black flex-grow pr-2">Detect phishing websites</span>
          <div className="flex-shrink-0">
            <ToggleSwitch
              checked={settings.detectPhishing}
              onChange={() => toggleSetting('', 'detectPhishing')}
            />
          </div>
        </div>

        {/* Twitter Section */}
        <div className="mb-2">
          <h3 className="font-bold text-black text-sm mb-1">Twitter</h3>
          <div className="space-y-1 ml-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-black flex-grow pr-2">Mitigate phishing scams</span>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  checked={settings.twitter.mitigatePhishing}
                  onChange={() => toggleSetting('twitter', 'mitigatePhishing')}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-black flex-grow pr-2">Hide cash tags</span>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  checked={settings.twitter.hideCashTags}
                  onChange={() => toggleSetting('twitter', 'hideCashTags')}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-black flex-grow pr-2">Hide hash tags</span>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  checked={settings.twitter.hideHashTags}
                  onChange={() => toggleSetting('twitter', 'hideHashTags')}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-black flex-grow pr-2">Hide QT</span>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  checked={settings.twitter.hideQT}
                  onChange={() => toggleSetting('twitter', 'hideQT')}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-black flex-grow pr-2">Hide Bot replies</span>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  checked={settings.twitter.hideBotReplies}
                  onChange={() => toggleSetting('twitter', 'hideBotReplies')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Explorer Section */}
        <div className="mb-2">
          <h3 className="font-bold text-black text-sm mb-1">Explorer</h3>
          <div className="space-y-1 ml-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-black flex-grow pr-2">Enable address tags</span>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  checked={settings.explorer.enableAddressTags}
                  onChange={() => toggleSetting('explorer', 'enableAddressTags')}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-black flex-grow pr-2">Enable token prices</span>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  checked={settings.explorer.enableTokenPrices}
                  onChange={() => toggleSetting('explorer', 'enableTokenPrices')}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-black flex-grow pr-2">Enable hide scam transactions</span>
              <div className="flex-shrink-0">
                <ToggleSwitch
                  checked={settings.explorer.enableHideScamTransactions}
                  onChange={() => toggleSetting('explorer', 'enableHideScamTransactions')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-2">
        <button className="text-sm text-black hover:text-blue-600 transition-colors">
          Submit a whitelist domain
        </button>
      </div>
    </div>
  )
}

export default App
