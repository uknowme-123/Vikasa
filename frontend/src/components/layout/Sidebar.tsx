import { Menu, X, Sun, Moon, Github } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Button } from '../ui/Button'

const navigation = [
  { name: 'Overview', href: '/', icon: Sun },
  { name: 'Plant Monitoring', href: '/plants', icon: Github },
  { name: 'Optical Sensing', href: '/optical', icon: Github },
  { name: 'Trends', href: '/trends', icon: Github },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'Data Management', href: '/data', icon: Github },
  { name: 'System Status', href: '/status', icon: Github },
]

import { AlertTriangle } from 'lucide-react'

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation()

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-neutral-200 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center px-6 border-b border-neutral-200">
            <h1 className="text-xl font-bold text-vikasa-700">Vikāsa</h1>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" aria-label="Main">
            <ul role="list" className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
                const Icon = item.icon
                return (
                  <li key={item.name}>
                    <NavLink
                      to={item.href}
                      onClick={onClose}
                      className={`sidebar-link flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? 'sidebar-link-active' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      {item.name}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-neutral-200">
            <div className="text-xs text-neutral-500">
              <p className="font-medium">Demo Mode</p>
              <p>Showing simulated data. Connect to Flask API for live readings.</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}