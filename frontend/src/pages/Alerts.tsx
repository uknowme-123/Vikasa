import { useState } from 'react'
import { useReadings, usePlantSummaries } from '../hooks/useSensorData'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Table } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import type { SensorReadingWithMeta, PlantSummary } from '../types/sensor'
import { AlertTriangle, Bell, CheckCircle, X, Filter, ChevronDown } from 'lucide-react'

interface Alert {
  id: string
  type: 'threshold' | 'connectivity' | 'calibration' | 'data_quality'
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  plantId?: string
  timestamp: string
  acknowledged: boolean
}

const DEMO_ALERTS: Alert[] = [
  {
    id: 'ALERT-001',
    type: 'threshold',
    severity: 'critical',
    title: 'Soil Moisture Critical',
    message: 'PLANT-002 soil moisture dropped below 30% threshold (current: 24.1%)',
    plantId: 'PLANT-002',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'ALERT-002',
    type: 'threshold',
    severity: 'warning',
    title: 'High Temperature',
    message: 'PLANT-004 temperature exceeded 30°C (current: 31.2°C)',
    plantId: 'PLANT-004',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'ALERT-003',
    type: 'calibration',
    severity: 'info',
    title: 'Calibration Required',
    message: 'PLANT-002 optical sensors have uncalibrated reflectance. NDVI unavailable.',
    plantId: 'PLANT-002',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    acknowledged: true,
  },
  {
    id: 'ALERT-004',
    type: 'connectivity',
    severity: 'warning',
    title: 'ESP32 Connection Lost',
    message: 'No data received from ESP32 device for 15 minutes. Last packet: 2026-10-04T08:30:00Z',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    acknowledged: false,
  },
  {
    id: 'ALERT-005',
    type: 'data_quality',
    severity: 'info',
    title: 'Missing Environmental Data',
    message: 'PLANT-003 has no optical sensor readings. Environmental sensors only.',
    plantId: 'PLANT-003',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    acknowledged: true,
  },
]

export function Alerts() {
  const { data: readings } = useReadings()
  const { data: plants } = usePlantSummaries()
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [filterType, setFilterType] = useState<'all' | 'threshold' | 'connectivity' | 'calibration' | 'data_quality'>('all')
  const [showAcknowledged, setShowAcknowledged] = useState(true)

  const filteredAlerts = DEMO_ALERTS.filter((alert) => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false
    if (filterType !== 'all' && alert.type !== filterType) return false
    if (!showAcknowledged && alert.acknowledged) return false
    return true
  })

  const criticalCount = DEMO_ALERTS.filter((a) => a.severity === 'critical' && !a.acknowledged).length
  const warningCount = DEMO_ALERTS.filter((a) => a.severity === 'warning' && !a.acknowledged).length

  const getSeverityBadge = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical': return <Badge variant="danger">{severity}</Badge>
      case 'warning': return <Badge variant="warning">{severity}</Badge>
      default: return <Badge variant="info">{severity}</Badge>
    }
  }

  const getTypeBadge = (type: Alert['type']) => {
    const labels = {
      threshold: 'Threshold',
      connectivity: 'Connectivity',
      calibration: 'Calibration',
      data_quality: 'Data Quality',
    }
    return <Badge variant="neutral">{labels[type]}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <AlertTriangle className="h-7 w-7 text-red-600" />
            Alerts & Notifications
          </h1>
          <p className="text-neutral-500 mt-1">System alerts, threshold breaches, and operational notifications</p>
        </div>
        <Badge variant="warning" className="demo-badge">Demo Data</Badge>
      </div>

      <AlertBanner variant="info" className="text-sm">
        <strong>Demo alerts shown.</strong> In production, alerts would be generated from real-time sensor thresholds, ESP32 connectivity monitoring, Firebase sync status, and data validation rules.
      </AlertBanner>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody className="p-5 text-center">
            <AlertTriangle className="h-10 w-10 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-900">Critical (Unacked)</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{criticalCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-900">Warnings (Unacked)</p>
            <p className="text-3xl font-bold text-amber-600 mt-1">{warningCount}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5 text-center">
            <Bell className="h-10 w-10 text-vikasa-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-900">Total Alerts</p>
            <p className="text-3xl font-bold text-neutral-700 mt-1">{DEMO_ALERTS.length}</p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-vikasa-600" />
            Alert History
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-500" />
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
                className="input py-1.5 text-sm w-auto"
                aria-label="Filter by severity"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="input py-1.5 text-sm w-auto"
              aria-label="Filter by type"
            >
              <option value="all">All Types</option>
              <option value="threshold">Threshold</option>
              <option value="connectivity">Connectivity</option>
              <option value="calibration">Calibration</option>
              <option value="data_quality">Data Quality</option>
            </select>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="rounded border-neutral-300 text-vikasa-600 focus:ring-vikasa-500"
              />
              Show acknowledged
            </label>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <Table
            data={filteredAlerts}
            columns={[
              { key: 'timestamp', header: 'Time', render: (v) => new Date(v as string).toLocaleString() },
              { key: 'severity', header: 'Severity', render: (_v, row) => getSeverityBadge(row.severity) },
              { key: 'type', header: 'Type', render: (_v, row) => getTypeBadge(row.type) },
              { key: 'title', header: 'Title' },
              { key: 'message', header: 'Message' },
              { key: 'plantId', header: 'Plant', render: (v) => v as string || '—' },
              {
                key: 'acknowledged',
                header: 'Status',
                render: (_v, row) => row.acknowledged ? (
                  <span className="flex items-center gap-1 text-vikasa-600"><CheckCircle className="h-4 w-4" /> Acknowledged</span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" /> Active</span>
                )
              },
              {
                key: 'actions',
                header: '',
                render: (_v, row) => !row.acknowledged && (
                  <button
                    className="text-vikasa-600 hover:text-vikasa-700 text-sm font-medium"
                    onClick={() => alert(`Acknowledged ${row.id} - demo action`)}
                  >
                    Acknowledge
                  </button>
                ),
              },
            ]}
            keyExtractor={(row) => row.id}
            emptyMessage="No alerts match current filters"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-neutral-900">Threshold Configuration (Demo)</h3>
        </CardHeader>
        <CardBody className="pt-0">
          <Table
            data={[
              { parameter: 'Soil Moisture', min: '30%', max: '—', unit: '%', action: 'Alert if below minimum' },
              { parameter: 'Temperature', min: '—', max: '30°C', unit: '°C', action: 'Alert if above maximum' },
              { parameter: 'Humidity', min: '40%', max: '80%', unit: '%', action: 'Alert if outside range' },
              { parameter: 'NDVI', min: '0.3', max: '—', unit: '', action: 'Alert if below minimum (stress indicator)' },
            ]}
            columns={[
              { key: 'parameter', header: 'Parameter' },
              { key: 'min', header: 'Min Threshold' },
              { key: 'max', header: 'Max Threshold' },
              { key: 'unit', header: 'Unit' },
              { key: 'action', header: 'Alert Action' },
            ]}
            keyExtractor={(row, i) => `threshold-${i}`}
            emptyMessage="No thresholds configured"
          />
        </CardBody>
      </Card>
    </div>
  )
}