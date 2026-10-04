import { NavLink } from 'react-router-dom'
import { Activity, Bell, Database, Leaf, Radio, Server, TableProperties } from 'lucide-react'

const items = [
  ['Overview', '/', Activity], ['Plant Monitoring', '/plants', Leaf], ['Optical Sensing', '/optical', Radio],
  ['Sensor History', '/history', TableProperties], ['Alerts', '/alerts', Bell], ['Dataset / CSV', '/data', Database], ['System Status', '/status', Server],
] as const
export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return <aside className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-200 bg-slate-950 text-white transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-6 py-6"><p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Team Nexovate</p><h1 className="mt-2 text-2xl font-semibold">Vikāsa</h1><p className="mt-1 text-xs text-slate-400">Plant stress observatory</p></div>
      <nav className="flex-1 space-y-1 px-4 py-5" aria-label="Main navigation">{items.map(([label, href, Icon]) => <NavLink key={href} to={href} onClick={onClose} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${isActive ? 'bg-emerald-400/15 text-emerald-200' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon className="h-5 w-5" />{label}</NavLink>)}</nav>
      <div className="border-t border-white/10 p-4 text-xs text-slate-400"><span className="rounded-full bg-amber-400/15 px-2 py-1 text-amber-200">DEMO DATA</span><p className="mt-3">No physical hardware or Firebase connection is claimed.</p></div>
    </div>
  </aside>
}
