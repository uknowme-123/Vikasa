import { NavLink, useLocation } from 'react-router-dom'
import { Activity, AlertTriangle, Leaf, Radio, Server, TableProperties, Sun } from 'lucide-react'

const navigation = [
  { label: 'Overview', href: '/', icon: Activity },
  { label: 'Plants', href: '/plants', icon: Leaf },
  { label: 'Optical Sensing', href: '/optical', icon: Radio },
  { label: 'Environment', href: '/environment', icon: Sun },
  { label: 'History', href: '/history', icon: TableProperties },
  { label: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { label: 'System', href: '/system', icon: Server },
] as const

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation()

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-surface-300/70 bg-surface-50/95 text-surface-900 shadow-overlay backdrop-blur-xl transition-transform duration-300 ease-out-expo lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-surface-300/60 px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-vikasa-300/20 bg-vikasa-500 shadow-glow-green">
              <span className="text-lg font-bold text-surface-950 tracking-tight">V</span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-vikasa-400" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-surface-950">VIKĀSA</h1>
              <p className="truncate text-[0.65rem] font-medium uppercase tracking-[0.12em] text-surface-600">Plant Intelligence & Optical Sensing</p>
            </div>
          </div>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-1.5 overflow-y-auto px-3 py-5" aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => (
            <NavLink
              key={href}
              to={href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'border-vikasa-500/15 bg-vikasa-500/10 text-vikasa-300 shadow-glow-green'
                    : 'text-surface-700 hover:border-surface-300/70 hover:bg-surface-200/60 hover:text-surface-950'
                }`}
              aria-current={location.pathname === href ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-surface-300/60 p-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-vikasa-500/20 bg-vikasa-950/30 px-3 py-3">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inset-0 rounded-full bg-vikasa-400 animate-pulse" />
              <span className="absolute inset-0 rounded-full bg-vikasa-400" />
            </span>
            <span className="text-xs font-medium text-vikasa-300">LIVE MONITORING</span>
          </div>
          <p className="text-xs leading-relaxed text-surface-600">
            GLYPH C3 sensor node streaming to Flask API.
          </p>
        </div>
      </div>
    </aside>
  )
}