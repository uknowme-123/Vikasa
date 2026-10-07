import { useState, useEffect } from 'react'
import { Database, Wifi, WifiOff, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from './Button'
import { AlertBanner } from './AlertBanner'
import { setDataProvider, createFlaskProvider, demoProvider } from '../../services/api'
import type { SystemStatus } from '../../types/sensor'

interface HealthResponse {
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy'
    storage_backend: string
    storage_healthy: boolean
  }
  success: boolean
  meta: { timestamp: string; version: string; request_id: string | null }
}

export function ProviderSwitcher() {
  const [apiUrl, setApiUrl] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [apiHealth, setApiHealth] = useState<SystemStatus | null>(null)
  const [checkingHealth, setCheckingHealth] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('vikasa-api-url')
    if (saved) {
      setApiUrl(saved)
    }
  }, [])

  const handleConnect = async () => {
    if (!apiUrl.trim()) return
    setIsConnecting(true)
    setConnectionError(null)
    try {
      const provider = createFlaskProvider(apiUrl.trim())
      setDataProvider(provider)
      localStorage.setItem('vikasa-api-url', apiUrl.trim())
      localStorage.setItem('vikasa-demo-mode', 'false')
      // Check health after connecting
      const response = await fetch(`${apiUrl.trim()}/api/health`)
      if (response.ok) {
        const health = (await response.json()) as HealthResponse
        setApiHealth({
          api: health.data.status === 'healthy' ? 'connected' : 'disconnected',
          esp32: 'unknown',
          storageBackend: health.data.storage_backend,
          storageHealthy: health.data.storage_healthy,
          lastSync: null,
        })
      }
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
      const response = await fetch(`${apiUrl.trim()}/api/health`)
      if (!response.ok) throw new Error('Health check failed')
      const health = (await response.json()) as HealthResponse
      setApiHealth({
        api: health.data.status === 'healthy' ? 'connected' : 'disconnected',
        esp32: 'unknown',
        storageBackend: health.data.storage_backend,
        storageHealthy: health.data.storage_healthy,
        lastSync: null,
      })
    } catch (err) {
      setApiHealth({ api: 'disconnected', esp32: 'unknown', storageBackend: 'unknown', storageHealthy: false, lastSync: null })
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
        <span className={`h-2 w-2 rounded-full ${isApiMode ? 'bg-green-500' : 'bg-amber-500'}`} />
      </Button>

      {showConfig && (
        <div className="fixed top-14 right-4 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-4 animate-slide-down">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Data Source</h3>
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
              <div className="text-sm text-slate-600 font-mono truncate">{apiUrl}</div>

<div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">System Health</span>
                    <Button variant="ghost" size="sm" onClick={() => { void handleCheckHealth(); }} loading={checkingHealth} disabled={checkingHealth}>
                      <Loader2 className="h-4 w-4" /> Check
                    </Button>
                  </div>

                  {apiHealth && (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <div className={`text-2xl font-bold ${apiHealth.api === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                            {apiHealth.api === 'connected' ? '✓' : '✗'}
                          </div>
                          <div className="text-xs text-slate-500">API</div>
                        </div>
                        <div>
                          <div className={`text-2xl font-bold ${apiHealth.esp32 === 'connected' ? 'text-green-600' : apiHealth.esp32 === 'disconnected' ? 'text-red-600' : 'text-amber-600'}`}>
                            {apiHealth.esp32 === 'connected' ? '✓' : apiHealth.esp32 === 'disconnected' ? '✗' : '?'}
                          </div>
                          <div className="text-xs text-slate-500">ESP32</div>
                        </div>
                        <div>
                          <div className={`text-2xl font-bold ${apiHealth.storageHealthy ? 'text-green-600' : 'text-amber-600'}`}>
                            {apiHealth.storageHealthy ? '✓' : '?'}
                          </div>
                          <div className="text-xs text-slate-500">Storage</div>
                        </div>
                      </div>

                      {apiHealth.lastSync && (
                        <div className="mt-2 text-xs text-slate-500">
                          Last sync: {new Date(apiHealth.lastSync).toLocaleString()}
                        </div>
                      )}
                    </>
                  )}
                </div>

              <Button variant="danger" size="sm" className="w-full" onClick={handleDisconnect}>
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
                <label className="block text-sm font-medium text-slate-700">API Base URL</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 w-full"
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
                onClick={() => { void handleConnect(); }}
                loading={isConnecting}
                disabled={!apiUrl.trim() || isConnecting}
              >
                <Wifi className="h-4 w-4 mr-1" /> Connect to API
              </Button>

              <p className="text-xs text-slate-500 text-center">
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