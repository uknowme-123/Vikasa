import { Menu, Bell, Wifi, WifiOff, Settings, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/Button'
import { ProviderSwitcher } from '../ui/ProviderSwitcher'

interface HeaderProps {
  onMenuClick: () => void
  systemStatus?: {
    api: 'connected' | 'disconnected' | 'unknown'
    esp32: 'connected' | 'disconnected' | 'unknown'
    firebase: 'connected' | 'disconnected' | 'unknown'
  }
}

export function Header({ onMenuClick, systemStatus }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-vikasa-600'
      case 'disconnected':
        return 'text-red-600'
      default:
        return 'text-neutral-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4" />
      default:
        return <Wifi className="h-4 w-4 text-neutral-400" />
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 lg:px-6">
      <Button variant="ghost" size="sm" onClick={onMenuClick} className="lg:hidden" aria-label="Open menu">
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <ProviderSwitcher />

        {systemStatus && (
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              {getStatusIcon(systemStatus.api)}
              <span className={getStatusColor(systemStatus.api)}>API</span>
            </div>
            <div className="flex items-center gap-1.5">
              {getStatusIcon(systemStatus.esp32)}
              <span className={getStatusColor(systemStatus.esp32)}>ESP32</span>
            </div>
            <div className="flex items-center gap-1.5">
              {getStatusIcon(systemStatus.firebase)}
              <span className={getStatusColor(systemStatus.firebase)}>Firebase</span>
            </div>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => setShowUserMenu(!showUserMenu)} aria-label="Notifications">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </Button>

        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowUserMenu(!showUserMenu)} aria-label="User menu">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-vikasa-100 flex items-center justify-center">
                <span className="text-sm font-medium text-vikasa-700">VN</span>
              </div>
              <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            </div>
          </Button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-neutral-200 shadow-lg py-1">
              <div className="px-4 py-2 border-b border-neutral-200">
                <p className="text-sm font-medium text-neutral-900">Team Nexovate</p>
                <p className="text-xs text-neutral-500">Bangalore Institute of Technology</p>
              </div>
              <button className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100">
                <Settings className="h-4 w-4 inline mr-2" />
                Settings
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100">
                Documentation
              </button>
              <hr className="my-1 border-neutral-200" />
              <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}