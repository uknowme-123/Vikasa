import { useState, useEffect } from 'react'
import { useSystemStatus } from '../hooks/useSensorData'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import { Button } from '../components/ui/Button'
import { Wifi, WifiOff, Server, Cpu, Database, Shield, AlertTriangle, CheckCircle, RefreshCw, Settings, Zap, MemoryStick } from 'lucide-react'

interface SystemComponent {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  status: 'connected' | 'disconnected' | 'unknown' | 'degraded'
  lastCheck: string | null
  details: Record<string, string>
  endpoint?: string
}

const DEMO_COMPONENTS: SystemComponent[] = [
  {
    id: 'api',
    name: 'Flask API',
    icon: Server,
    status: 'unknown',
    lastCheck: null,
    details: {
      'Base URL': 'http://localhost:5000',
      'Version': '0.1.0 (dev)',
      'Endpoints': '/api/readings, /api/plants, /api/sessions',
      'Auth': 'None (dev mode)',
    },
    endpoint: '/api/health',
  },
  {
    id: 'esp32',
    name: 'ESP32 Device',
    icon: Cpu,
    status: 'unknown',
    lastCheck: null,
    details: {
      'Device ID': 'VIKASA-ESP32-001',
      'Firmware': 'v0.1.0-dev',
      'Connection': 'WiFi (2.4 GHz)',
      'Last Seen': 'Never',
      'Battery': 'N/A (USB powered)',
    },
  },
  {
    id: 'firebase',
    name: 'Firebase Realtime DB',
    icon: Database,
    status: 'unknown',
    lastCheck: null,
    details: {
      'Project': 'vikasa-demo',
      'Region': 'us-central1',
      'Sync Status': 'Not configured',
      'Rules': 'Test mode (insecure)',
    },
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    icon: Shield,
    status: 'unknown',
    lastCheck: null,
    details: {
      'Bot': '@vikasa_alerts_bot',
      'Chat ID': 'Not configured',
      'Alerts Enabled': 'False',
    },
  },
]

export function SystemStatus() {
  const { data: systemStatus, refetch, isLoading } = useSystemStatus()
  const [components, setComponents] = useState<SystemComponent[]>(DEMO_COMPONENTS)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [checking, setChecking] = useState<string | null>(null)

  useEffect(() => {
    if (systemStatus) {
      setComponents((prev) =>
        prev.map((c) => ({
          ...c,
          status: systemStatus[c.id as keyof typeof systemStatus] as SystemComponent['status'],
          lastCheck: systemStatus.lastSync,
        }))
      )
    }
  }, [systemStatus])

  const checkComponent = async (componentId: string) => {
    setChecking(componentId)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setComponents((prev) =>
      prev.map((c) =>
        c.id === componentId
          ? {
              ...c,
              status: ['connected', 'disconnected', 'degraded'][Math.floor(Math.random() * 3)] as SystemComponent['status'],
              lastCheck: new Date().toISOString(),
            }
          : c
      )
    )
    setChecking(null)
    setLastRefreshed(new Date())
  }

  const checkAll = async () => {
    setChecking('all')
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setComponents((prev) =>
      prev.map((c) => ({
        ...c,
        status: ['connected', 'disconnected', 'degraded'][Math.floor(Math.random() * 3)] as SystemComponent['status'],
        lastCheck: new Date().toISOString(),
      }))
    )
    setChecking(null)
    setLastRefreshed(new Date())
    await refetch()
  }

  const getStatusConfig = (status: SystemComponent['status']) => {
    switch (status) {
      case 'connected':
        return { icon: CheckCircle, color: 'text-vikasa-600', bg: 'bg-vikasa-100', label: 'Connected' }
      case 'degraded':
        return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Degraded' }
      case 'disconnected':
        return { icon: WifiOff, color: 'text-red-600', bg: 'bg-red-100', label: 'Disconnected' }
      default:
        return { icon: Wifi, color: 'text-neutral-500', bg: 'bg-neutral-100', label: 'Unknown' }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Zap className="h-7 w-7 text-vikasa-600" />
            System Status
          </h1>
          <p className="text-neutral-500 mt-1">Monitor connectivity and health of all system components</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="warning" className="demo-badge">Demo Mode</Badge>
          <Button onClick={() => void checkAll()} loading={checking === 'all'} variant="primary">
            <RefreshCw className="h-4 w-4" /> Check All
          </Button>
        </div>
      </div>

      <AlertBanner variant="info" className="text-sm">
        <strong>Demo status indicators.</strong> No actual backend services are connected. Click "Check All" to simulate connectivity checks.
        In production, this page would show real-time health from Flask API, ESP32 device, Firebase, and Telegram.
      </AlertBanner>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {components.map((component) => {
          const config = getStatusConfig(component.status)
          const Icon = component.icon
          const StatusIcon = config.icon
          const isChecking = checking === component.id || checking === 'all'

          return (
            <Card key={component.id} className="relative">
              <CardBody className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-neutral-100 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-neutral-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">{component.name}</h3>
                      <Badge variant={
                        component.status === 'connected' ? 'success' :
                        component.status === 'degraded' ? 'warning' :
                        component.status === 'disconnected' ? 'danger' : 'neutral'
                      } className="mt-1">
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void checkComponent(component.id)}
                    loading={isChecking}
                    disabled={isChecking}
                    aria-label={`Check ${component.name} status`}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-200 space-y-2">
                  {Object.entries(component.details).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-neutral-500">{key}</span>
                      <span className="font-medium text-neutral-900 font-mono text-xs">{value}</span>
                    </div>
                  ))}
                  {component.lastCheck && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Last Check</span>
                      <span className="font-medium text-neutral-900 font-mono text-xs">
                        {new Date(component.lastCheck).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {component.endpoint && (
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <Button variant="ghost" size="sm" className="w-full justify-start" disabled>
                        <Settings className="h-4 w-4 mr-1" />
                        Endpoint: {component.endpoint}
                      </Button>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <MemoryStick className="h-5 w-5 text-vikasa-600" />
              System Resources (Simulated)
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-4">
              <ResourceBar label="CPU Usage" value={Math.floor(Math.random() * 30) + 10} unit="%" color="#16a34a" />
              <ResourceBar label="Memory Usage" value={Math.floor(Math.random() * 40) + 30} unit="%" color="#2563eb" />
              <ResourceBar label="Disk Usage" value={Math.floor(Math.random() * 20) + 15} unit="%" color="#7c2d12" />
              <ResourceBar label="Network I/O" value={Math.floor(Math.random() * 100) + 50} unit="KB/s" color="#dc2626" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Shield className="h-5 w-5 text-vikasa-600" />
              Security & Configuration
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-3">
              <ConfigRow label="API Authentication" value="Disabled (dev)" status="warning" />
              <ConfigRow label="HTTPS/TLS" value="Not configured" status="warning" />
              <ConfigRow label="Firebase Rules" value="Test mode (public)" status="danger" />
              <ConfigRow label="Telegram Bot Token" value="Not set" status="danger" />
              <ConfigRow label="CORS Policy" value="Allow all origins" status="warning" />
              <ConfigRow label="Rate Limiting" value="Disabled" status="info" />
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-neutral-900">Recent System Events (Demo)</h3>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-3">
            {[
              { time: '2 min ago', level: 'info', message: 'Dashboard loaded in demo mode' },
              { time: '5 min ago', level: 'warning', message: 'Flask API health check: no response (expected in demo)' },
              { time: '10 min ago', level: 'info', message: 'ESP32 simulator initialized' },
              { time: '15 min ago', level: 'info', message: 'Firebase configuration placeholder loaded' },
              { time: '20 min ago', level: 'info', message: 'Demo data provider registered' },
            ].map((event, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg">
                <div className={`h-2 w-2 rounded-full ${
                  event.level === 'info' ? 'bg-blue-500' :
                  event.level === 'warning' ? 'bg-amber-500' :
                  'bg-red-500'
                }`} />
                <span className="text-sm text-neutral-500">{event.time}</span>
                <span className="text-sm font-medium text-neutral-900">{event.level.toUpperCase()}</span>
                <span className="text-sm text-neutral-700">{event.message}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function ResourceBar({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-neutral-700">{label}</span>
        <span className="font-medium text-neutral-900">{value}{unit}</span>
      </div>
      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function ConfigRow({ label, value, status }: { label: string; value: string; status: 'info' | 'warning' | 'danger' }) {
  const statusConfig = {
    info: { icon: CheckCircle, color: 'text-vikasa-600', bg: 'bg-vikasa-100' },
    warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    danger: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  }
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${config.color}`} />
        <span className="text-sm font-medium text-neutral-700">{label}</span>
      </div>
      <span className={`text-sm font-medium ${config.color} px-2 py-0.5 rounded ${config.bg}`}>{value}</span>
    </div>
  )
}