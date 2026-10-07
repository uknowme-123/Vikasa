import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useStatus } from '../../hooks/useSensorData'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: status } = useStatus()

  return (
    <div className="min-h-screen bg-surface-0">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <Header onMenuClick={() => setSidebarOpen(true)} status={status} />
        <main className="mx-auto max-w-[1600px] p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}