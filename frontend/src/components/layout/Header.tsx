import { Menu, Wifi, WifiOff, HelpCircle } from 'lucide-react'
import type { SystemStatus } from '../../types/sensor'
import { ProviderSwitcher } from '../ui/ProviderSwitcher'

interface StatusPillProps {
  label: string
  status: 'connected' | 'disconnected' | 'unknown'
}

function StatusPill({ label, status }: StatusPillProps) {
  const configs = {
    connected: {
      dot: 'bg-vikasa-400',
      text: 'text-vikasa-300',
      label: 'connected',
    },
    disconnected: {
      dot: 'bg-red-400',
      text: 'text-red-300',
      label: 'disconnected',
    },
    unknown: {
      dot: 'bg-surface-400',
      text: 'text-surface-500',
      label: 'unknown',
    },
  }

  const config = configs[status]

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-surface-200/50 px-3 py-1.5">
      <span className={`relative flex h-1.5 w-1.5 ${config.dot} rounded-full`} aria-hidden="true" />
      <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      <span className="text-[0.70rem] text-surface-500 uppercase tracking-[0.1em]">{label}</span>
    </div>
  )
}

export function Header({ onMenuClick, status }: { onMenuClick: () => void; status?: SystemStatus }) {
  const apiConnected = status?.api === 'connected'

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-300 bg-surface-100/95 backdrop-blur-sm px-4 lg:px-8">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-surface-500 hover:bg-surface-200/50 hover:text-surface-200 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-950 truncate">Vikāsa</p>
        <p className="text-[0.70rem] text-surface-500 truncate">Plant Intelligence & Optical Sensing</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ProviderSwitcher />

        <div className="hidden sm:flex items-center gap-2">
          <StatusPill label="API" status={status?.api ?? 'unknown'} />
          <StatusPill label="ESP32" status={status?.esp32 ?? 'unknown'} />
          <StatusPill label="Firebase" status={status?.firebase ?? 'unknown'} />
        </div>

        <div className="flex items-center gap-2 ml-2 sm:ml-4">
          <button
            className="rounded-lg p-2 text-surface-500 hover:bg-surface-200/50 hover:text-surface-200 transition-colors"
            aria-label="Help and documentation"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${apiConnected ? 'bg-vikasa-950/50 border border-vikasa-500/20' : 'bg-amber-950/50 border border-amber-500/20'}`}>
            <span className={`relative flex h-1.5 w-1.5 rounded-full ${apiConnected ? 'bg-vikasa-400' : 'bg-amber-400'}`} aria-hidden="true" />
            <span className={`text-xs font-semibold ${apiConnected ? 'text-vikasa-300' : 'text-amber-300'}`}>
              {apiConnected ? 'API MODE' : 'DEMO MODE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}