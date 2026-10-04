import { useState, useEffect } from 'react'
import { Database, Wifi, WifiOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from './Button'
import { Card, CardBody } from './Card'
import { Badge } from './Badge'
import { AlertBanner } from './AlertBanner'
import { getDataProvider, setDataProvider, createFlaskProvider, demoProvider, checkApiHealth } from '../../services/api'

export function ProviderSwitcher() {
  const [apiUrl, setApiUrl] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [apiHealth, setApiHealth] = useState<{ api: string; esp32: string; firebase: string; lastSync: string | null } | null>(null)
  const [checkingHealth, setCheckingHealth] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('vikasa-api-url')
    const demoMode = localStorage.getItem('vikasa-demo-mode')
    if (saved) {
      setApiUrl(saved)
    }
    if (demoMode === 'false') {
      // Already switched to API provider
    }
  }, [])

  const handleConnect = async () => {
    if (!apiUrl.trim()) return
    setIsConnecting(true)
    setConnectionError(null)
    try {
      const provider = await createFlaskProvider(apiUrl.trim())
      setDataProvider(provider)
      localStorage.setItem('vikasa-api-url', apiUrl.trim())
      localStorage.setItem('vikasa-demo-mode', 'false')
      // Check health after connecting
      const health = await checkApiHealth(apiUrl.trim())
      setApiHealth(health)
    } catch (err) {
      setConnectionError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setDataProvider(demoProvider)
    localStorage.removeItem('vikasa-api-url')
    localStorage.setItem('vikasa-demo-mode', 'true')
    setApiUrl('')
    setApiHealth(null)
    setConnectionError(null)
  }

  const handleCheckHealth = async () => {
    if (!apiUrl.trim()) return
    setCheckingHealth(true)
    try {
      const health = await checkApiHealth(apiUrl.trim())
      setApiHealth(health)
    } catch (err) {
      setApiHealth({ api: 'disconnected', esp32: 'unknown', firebase: 'unknown', lastSync: null })
    } finally {
      setCheckingHealth(false)
    }
  }

  const isApiMode = localStorage.getItem('vikasa-demo-mode') === 'false' && apiUrl

  return (
    <div className="relative">
      <Button variant="ghost" size="sm" onClick={() => setShowConfig(!showConfig)} aria-label="API Configuration">
        <Database className="h-5 w-5" />
        <span className="hidden sm:inline">{isApiMode ? 'API Connected' : 'Demo Mode'}</span>
        <span className={`h-2 w-2 rounded-full ${isApiMode ? 'bg-vikasa-500' : 'bg-amber-500'}`} />
      </Button>

      {showConfig && (
        <div className="fixed top-14 right-4 z-50 w-80 bg-white border border-neutral-200 rounded-xl shadow-lg p-4 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900">Data Source</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowConfig(false)}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>

          {isApiMode ? (
            <div className="space-y-3">
              <AlertBanner variant="success" className="text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Connected to Flask API</span>
              </AlertBanner>
              <div className="text-sm text-neutral-600 font-mono truncate">{apiUrl}</div>

              <div className="pt-2 border-t border-neutral-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-neutral-700">System Health</span>
                  <Button variant="ghost" size="sm" onClick={() => void handleCheckHealth()} loading={checkingHealth} disabled={checkingHealth}>
                    <Loader2 className="h-4 w-4" /> Check
                  </Button>
                </div>

                {apiHealth && (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center p-3 bg-neutral-50 rounded-lg">
                      <div>
                        <div className={`text-2xl font-bold ${apiHealth.api === 'connected' ? 'text-vikasa-600' : 'text-red-600'}`}>
                          {apiHealth.api === 'connected' ? '✓' : '✗'}
                        </div>
                        <div className="text-xs text-neutral-500">API</div>
                      </div>
                      <div>
                        <div className={`text-2xl font-bold ${apiHealth.esp32 === 'connected' ? 'text-vikasa-600' : apiHealth.esp32 === 'disconnected' ? 'text-red-600' : 'text-amber-600'}`}>
                          {apiHealth.esp32 === 'connected' ? '✓' : apiHealth.esp32 === 'disconnected' ? '✗' : '?'}
                        </div>
                        <div className="text-xs text-neutral-500">ESP32</div>
                      </div>
                      <div>
                        <div className={`text-2xl font-bold ${apiHealth.firebase === 'connected' ? 'text-vikasa-600' : apiHealth.firebase === 'disconnected' ? 'text-red-600' : 'text-amber-600'}`}>
                          {apiHealth.firebase === 'connected' ? '✓' : apiHealth.firebase === 'disconnected' ? '✗' : '?'}
                        </div>
                        <div className="text-xs text-neutral-500">Firebase</div>
                      </div>
                    </div>

                    {apiHealth.lastSync && (
                      <div className="mt-2 text-xs text-neutral-500">
                        Last sync: {new Date(apiHealth.lastSync).toLocaleString()}
                      </div>
                    )}
                  </>
                )}
              </div>

              <Button variant="danger" size="sm" className="w-full" onClick={() => void handleDisconnect()}>
                <WifiOff className="h-4 w-4 mr-1" /> Disconnect & Use Demo Data
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AlertBanner variant="info" className="text-sm">
                <Wifi className="h-4 w-4" />
                <span>Using simulated demo data. Enter Flask API URL to connect.</span>
              </AlertBanner>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-700">API Base URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  className="input"
                  disabled={isConnecting}
                />
                {connectionError && (
                  <AlertBanner variant="danger" className="text-sm">
                    <XCircle className="h-4 w-4" />
                    {connectionError}
                  </AlertBanner>
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => void handleConnect()}
                loading={isConnecting}
                disabled={!apiUrl.trim() || isConnecting}
              >
                <Wifi className="h-4 w-4 mr-1" /> Connect to API
              </Button>

              <p className="text-xs text-neutral-500 text-center">
                Set VITE_API_BASE_URL in .env.local to persist across reloads
              </p>
            </div>
          )}
        </div>
      )}

      {showConfig && (
        <div className="fixed inset-0 z-40" onClick={() => setShowConfig(false)} aria-hidden="true" />
      )}
    </div>
  )
}