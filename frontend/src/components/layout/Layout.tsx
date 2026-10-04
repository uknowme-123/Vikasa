import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useSystemStatus } from '../../hooks/useSensorData'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: systemStatus } = useSystemStatus()

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} systemStatus={systemStatus ?? { api: 'unknown', esp32: 'unknown', firebase: 'unknown' }} />
        <main className="p-4 lg:p-6" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}