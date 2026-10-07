import { Menu, HelpCircle } from 'lucide-react'
import type { SystemStatus } from '../../types/sensor'
import { ProviderSwitcher } from '../ui/ProviderSwitcher'

interface StatusIndicatorProps {
  label: string
  status: 'connected' | 'disconnected' | 'unknown'
}

function StatusIndicator({ label, status }: StatusIndicatorProps) {
  const configs = {
    connected: {
      dot: 'bg-vikasa-500',
      text: 'text-vikasa-400',
      label: 'connected',
    },
    disconnected: {
      dot: 'bg-red-500',
      text: 'text-red-400',
      label: 'disconnected',
    },
    unknown: {
      dot: 'bg-surface-500',
      text: 'text-surface-500',
      label: 'unknown',
    },
  }

  const config = configs[status]

  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-surface-200/30 px-2.5 py-1.5 transition-colors duration-150">
      <span className={`relative flex h-1.5 w-1.5 ${config.dot} rounded-full`} aria-hidden="true" />
      <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      <span className="text-xs text-surface-500 uppercase tracking-[0.08em]">{label}</span>
    </div>
  )
}

export function Header({ onMenuClick, status }: { onMenuClick: () => void; status?: SystemStatus }) {
  const apiConnected = status?.api === 'connected'

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-surface-300/50 bg-surface-100/90 backdrop-blur-sm px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-200/50 hover:text-surface-100 transition-colors duration-150 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1 min-w-0 lg:hidden">
        <p className="text-sm font-semibold text-surface-950 truncate">Vikāsa</p>
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        <ProviderSwitcher />

        <div className="hidden md:flex items-center gap-2">
          <StatusIndicator label="API" status={status?.api ?? 'unknown'} />
          <StatusIndicator label="ESP32" status={status?.esp32 ?? 'unknown'} />
          <StatusIndicator label="Storage" status={status?.storageHealthy ? 'connected' : 'unknown'} />
        </div>

        <div className="flex items-center gap-2 ml-1 md:ml-3">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-500 hover:bg-surface-200/50 hover:text-surface-100 transition-colors duration-150"
            aria-label="Help and documentation"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 border ${apiConnected ? 'bg-vikasa-950/30 border-vikasa-500/20' : 'bg-amber-950/30 border-amber-500/20'}`}>
            <span className={`relative flex h-2 w-2 rounded-full ${apiConnected ? 'bg-vikasa-500' : 'bg-amber-400'}`} aria-hidden="true" />
            <span className={`text-xs font-semibold ${apiConnected ? 'text-vikasa-300' : 'text-amber-300'}`}>
              {apiConnected ? 'API MODE' : 'DEMO MODE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}