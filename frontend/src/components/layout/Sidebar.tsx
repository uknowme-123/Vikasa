import { NavLink, useLocation } from 'react-router-dom'
import { Activity, AlertTriangle, Database, Leaf, Radio, Server, TableProperties, Waves } from 'lucide-react'

const navigation = [
  { label: 'Overview', href: '/', icon: Activity },
  { label: 'Plants', href: '/plants', icon: Leaf },
  { label: 'Optical Sensing', href: '/optical', icon: Radio },
  { label: 'Environment', href: '/environment', icon: Waves },
  { label: 'History', href: '/history', icon: TableProperties },
  { label: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { label: 'System', href: '/system', icon: Server },
] as const

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation()

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-surface-300 bg-surface-100 text-surface-950 transition-transform duration-300 ease-out-expo lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-label="Main navigation"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-surface-300 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-vikasa-600">
              <span className="text-lg font-bold text-surface-950 tracking-tight">V</span>
              <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-vikasa-400" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-surface-950">Vikāsa</h1>
              <p className="text-[0.70rem] text-surface-500 uppercase tracking-[0.15em]">Plant Intelligence & Optical Sensing</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto" aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => (
            <NavLink
              key={href}
              to={href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-vikasa-500/10 text-vikasa-300 border-l-3 border-vikasa-400 pl-[calc(0.75rem-3px)]'
                    : 'text-surface-500 hover:bg-surface-200/50 hover:text-surface-200'
                }`
              }
              aria-current={location.pathname === href ? 'page' : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-surface-300 p-4">
          <div className="flex items-center gap-2 rounded-full bg-amber-950/30 border border-amber-500/20 px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-amber-400 animate-pulse" />
              <span className="absolute inset-0 rounded-full bg-amber-400" />
            </span>
            <span className="text-xs font-medium text-amber-300">DEMO / SIMULATED DATA</span>
          </div>
          <p className="mt-3 text-[0.70rem] text-surface-500">
            No physical hardware or validated ML result is connected.
          </p>
        </div>
      </div>
    </aside>
  )
}