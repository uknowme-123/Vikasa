import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useStatus } from '../../hooks/useSensorData'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: status } = useStatus()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface-0">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-surface-0/70 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative min-h-screen lg:pl-72">
        <Header onMenuClick={() => setSidebarOpen(true)} status={status} />
        <main className="mx-auto w-full max-w-[1680px] p-4 sm:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}