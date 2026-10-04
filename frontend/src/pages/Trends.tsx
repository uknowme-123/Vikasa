import { useReadings } from '../hooks/useSensorData'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { MultiLineChart } from '../components/charts/TimeSeriesChart'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import type { SensorReadingWithMeta } from '../types/sensor'
import { BarChart, Calendar, Filter } from 'lucide-react'

export function Trends() {
  const { data: readings, isLoading } = useReadings()

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading trends">
        <Card className="animate-pulse"><CardBody className="h-64" /></Card>
        <Card className="animate-pulse"><CardBody className="h-64" /></Card>
        <Card className="animate-pulse"><CardBody className="h-64" /></Card>
      </div>
    )
  }

  const allReadings = readings ?? []

  const environmentalFields = [
    { key: 'temperature_c' as const, label: 'Temperature (°C)', color: '#dc2626', unit: '°C' },
    { key: 'humidity_pct' as const, label: 'Humidity (%)', color: '#2563eb', unit: '%' },
    { key: 'soil_moisture_pct' as const, label: 'Soil Moisture (%)', color: '#16a34a', unit: '%' },
    { key: 'ambient_light_raw' as const, label: 'Ambient Light (ADC)', color: '#7c2d12', unit: 'ADC' },
  ]

  const opticalFields = [
    { key: 'red_raw' as const, label: 'Red Raw (ADC)', color: '#dc2626', unit: 'ADC' },
    { key: 'nir_raw' as const, label: 'NIR Raw (ADC)', color: '#7c2d12', unit: 'ADC' },
    { key: 'red_reflectance' as const, label: 'Red Reflectance (%)', color: '#ef4444', unit: '%' },
    { key: 'nir_reflectance' as const, label: 'NIR Reflectance (%)', color: '#991b1b', unit: '%' },
    { key: 'ndvi' as const, label: 'NDVI', color: '#16a34a', unit: '' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <BarChart className="h-7 w-7 text-vikasa-600" />
            Historical Trends
          </h1>
          <p className="text-neutral-500 mt-1">Time-series visualization of environmental and optical measurements</p>
        </div>
        <Badge variant="warning" className="demo-badge">Demo Data</Badge>
      </div>

      <AlertBanner variant="info" className="text-sm">
        Trends are generated from simulated demonstration data. Historical patterns do not represent actual plant responses or sensor behavior.
      </AlertBanner>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <BarChart className="h-5 w-5 text-vikasa-600" />
              Environmental Parameters
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <MultiLineChart
              data={allReadings}
              fields={environmentalFields}
              title=""
              height={400}
            />
            <p className="text-xs text-neutral-500 mt-3">
              Missing values (gaps in lines) indicate uncalibrated or unavailable measurements. Soil moisture % requires sensor-specific calibration.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <BarChart className="h-5 w-5 text-vikasa-600" />
              Optical Spectroscopy
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <MultiLineChart
              data={allReadings}
              fields={opticalFields}
              title=""
              height={400}
            />
            <p className="text-xs text-neutral-500 mt-3">
              Reflectance and NDVI only appear when calibrated data is available. Raw ADC counts (red_raw, nir_raw) are shown for reference but cannot be used for vegetation index calculation.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-vikasa-600" />
              Data Coverage Summary
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Readings"
                value={allReadings.length}
                icon={<BarChart className="h-5 w-5" />}
              />
              <StatCard
                label="With Calibration"
                value={allReadings.filter((r) => r.red_reflectance !== undefined && r.nir_reflectance !== undefined).length}
                icon={<div className="h-5 w-5 bg-vikasa-100 rounded flex items-center justify-center"><span className="text-xs font-bold text-vikasa-700">✓</span></div>}
              />
              <StatCard
                label="Environmental Only"
                value={allReadings.filter((r) => r.temperature_c !== undefined).length}
                icon={<div className="h-5 w-5 bg-blue-100 rounded flex items-center justify-center"><span className="text-xs font-bold text-blue-700">🌡</span></div>}
              />
              <StatCard
                label="Optical Only"
                value={allReadings.filter((r) => r.red_raw !== undefined).length}
                icon={<div className="h-5 w-5 bg-amber-100 rounded flex items-center justify-center"><span className="text-xs font-bold text-amber-700">☀</span></div>}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="p-4 bg-neutral-50 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-neutral-500">{icon}</span>
        <span className="text-sm font-medium text-neutral-700">{label}</span>
      </div>
      <p className="text-2xl font-bold text-neutral-900 tabular-nums">{value}</p>
    </div>
  )
}