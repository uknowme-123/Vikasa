import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useStatus } from '../../hooks/useSensorData'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
export function Layout() {
  const [open, setOpen] = useState(false)
  const { data: status } = useStatus()
  return <div className="min-h-screen bg-slate-50"><Sidebar isOpen={open} onClose={() => setOpen(false)} /><div className="lg:pl-72"><Header onMenuClick={() => setOpen(true)} status={status} /><main className="mx-auto max-w-[1600px] p-4 lg:p-8"><Outlet /></main></div></div>
}
