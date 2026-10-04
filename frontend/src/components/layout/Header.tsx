import { Menu, Wifi } from 'lucide-react'
import type { SystemStatus } from '../../types/sensor'
export function Header({ onMenuClick, status }: { onMenuClick: () => void; status?: SystemStatus }) {
  const liveApi = status?.api === 'connected'
  return <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8"><button onClick={onMenuClick} className="rounded-lg p-2 text-slate-600 lg:hidden" aria-label="Open navigation"><Menu /></button><div className="hidden lg:block"><p className="text-sm font-medium text-slate-900">Plant stress monitoring workspace</p><p className="text-xs text-slate-500">Bangalore Institute of Technology · Architecture preview</p></div><div className="flex items-center gap-3 text-xs text-slate-500"><Wifi className="h-4 w-4" /><span>API {status?.api ?? 'unknown'}</span><span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">{liveApi ? 'API MODE' : 'DEMO MODE'}</span></div></header>
}
