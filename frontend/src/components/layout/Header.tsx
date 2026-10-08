import { HelpCircle, Menu } from 'lucide-react'
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
    <div className="flex items-center gap-2 rounded-full border border-surface-300/70 bg-surface-100/70 px-3 py-2 transition-colors duration-150">
      <span className={`relative flex h-2 w-2 shrink-0 ${config.dot} rounded-full`} aria-hidden="true" />
      <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
      <span className="text-[0.65rem] font-semibold text-surface-600 uppercase tracking-[0.12em]">{label}</span>
    </div>
  )
}

export function Header({ onMenuClick, status }: { onMenuClick: () => void; status?: SystemStatus }) {
  const apiConnected = status?.api === 'connected'

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-surface-300/60 bg-surface-50/85 px-4 shadow-surface backdrop-blur-xl sm:px-6 lg:px-8">
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-surface-300/70 text-surface-700 transition-colors duration-150 hover:border-vikasa-500/30 hover:bg-vikasa-500/10 hover:text-vikasa-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vikasa-500 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex-1 min-w-0 lg:hidden">
        <p className="text-sm font-semibold text-surface-950 truncate">Vikāsa</p>
      </div>

      <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3 lg:gap-4">
        <ProviderSwitcher />

        <div className="hidden items-center gap-2 lg:flex">
          <StatusIndicator label="API" status={status?.api ?? 'unknown'} />
          <StatusIndicator label="GLYPH C3" status={status?.esp32 ?? 'unknown'} />
          <StatusIndicator label="Storage" status={status?.storageHealthy ? 'connected' : 'unknown'} />
        </div>

        <div className="flex items-center gap-2 ml-1 md:ml-3">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-300/70 text-surface-700 transition-colors duration-150 hover:border-vikasa-500/30 hover:bg-vikasa-500/10 hover:text-vikasa-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vikasa-500"
            aria-label="Help and documentation"
          >
            <HelpCircle className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className={`flex items-center gap-2 rounded-full border px-3 py-2 ${apiConnected ? 'bg-vikasa-950/40 border-vikasa-500/25' : 'bg-amber-950/30 border-amber-500/25'}`}>
            <span className={`relative flex h-2 w-2 rounded-full ${apiConnected ? 'bg-vikasa-500 animate-pulse-glow' : 'bg-amber-400'}`} aria-hidden="true" />
            <span className={`text-xs font-semibold ${apiConnected ? 'text-vikasa-300' : 'text-amber-300'}`}>
              {apiConnected ? 'API MODE' : 'DEMO MODE'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}