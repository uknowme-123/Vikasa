import { useState } from 'react'
import { useReadings } from '../hooks/useSensorData'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Table } from '../components/ui/Table'
import { ReflectanceChart, ReflectanceComparison } from '../components/charts/ReflectanceChart'
import { OpticalSensorCard, SensorGrid, SensorCard } from '../components/charts/SensorCard'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import type { SensorReadingWithMeta } from '../types/sensor'
import { Zap, BarChart, Info, AlertTriangle } from 'lucide-react'

export function OpticalSensing() {
  const { data: readings, isLoading } = useReadings()
  const [selectedReading, setSelectedReading] = useState<SensorReadingWithMeta | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading optical data">
        <Card className="animate-pulse"><CardBody className="h-48" /></Card>
        <Card className="animate-pulse"><CardBody className="h-64" /></Card>
      </div>
    )
  }

  const allReadings = readings ?? []
  const calibratedReadings = allReadings.filter((r) => r.red_reflectance !== undefined && r.nir_reflectance !== undefined)
  const uncalibratedReadings = allReadings.filter((r) => r.red_reflectance === undefined || r.nir_reflectance === undefined)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Zap className="h-7 w-7 text-vikasa-600" />
            Optical Sensing
          </h1>
          <p className="text-neutral-500 mt-1">Red & NIR reflectance, NDVI, and raw sensor data</p>
        </div>
        <Badge variant="warning" className="demo-badge">Demo Data</Badge>
      </div>

      <AlertBanner variant="info" className="text-sm flex items-start gap-3">
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Optical measurement principles</p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
            <li><strong>Raw ADC counts</strong> (red_raw, nir_raw) are uncalibrated sensor readings dependent on circuit gain, integration time, and LED intensity.</li>
            <li><strong>Calibrated reflectance</strong> (red_reflectance, nir_reflectance) requires a reference target of known reflectance measured under identical illumination.</li>
            <li><strong>NDVI</strong> = (NIR − Red) / (NIR + Red) using <em>calibrated reflectance only</em>. Never compute from raw ADC counts.</li>
            <li>Uncalibrated readings display as <span className="font-mono text-neutral-500">Not available</span>, never as zero.</li>
          </ul>
        </div>
      </AlertBanner>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardBody className="p-5 text-center">
            <Zap className="h-12 w-12 text-vikasa-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-900">Calibrated Readings</p>
            <p className="text-3xl font-bold text-vikasa-700 mt-1">{calibratedReadings.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Have reflectance data</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-900">Uncalibrated Readings</p>
            <p className="text-3xl font-bold text-amber-700 mt-1">{uncalibratedReadings.length}</p>
            <p className="text-xs text-neutral-500 mt-1">Raw data only</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-5 text-center">
            <BarChart className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-900">Total Measurements</p>
            <p className="text-3xl font-bold text-neutral-700 mt-1">{allReadings.length}</p>
            <p className="text-xs text-neutral-500 mt-1">In demo dataset</p>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-neutral-900">Reflectance & NDVI Detail</h3>
            </CardHeader>
            <CardBody className="pt-0">
              {selectedReading ? (
                <ReflectanceChart reading={selectedReading} />
              ) : (
                <ReflectanceChart reading={null} />
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-neutral-900">Select Reading</h3>
            </CardHeader>
            <CardBody className="pt-0">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allReadings.length === 0 ? (
                  <p className="text-center text-neutral-500 py-8">No readings available</p>
                ) : (
                  allReadings.map((reading) => {
                    const hasCal = reading.red_reflectance !== undefined && reading.nir_reflectance !== undefined
                    return (
                      <button
                        key={reading.reading_id}
                        onClick={() => setSelectedReading(reading)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedReading?.reading_id === reading.reading_id
                            ? 'border-vikasa-500 bg-vikasa-50'
                            : 'border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-neutral-900">{reading.plant_id}</span>
                          <Badge variant={hasCal ? 'success' : 'warning'} className="text-xs">
                            {hasCal ? 'Calibrated' : 'Raw only'}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          {new Date(reading.timestamp).toLocaleString()}
                        </p>
                        {hasCal && reading.ndvi !== undefined && (
                          <p className="text-xs font-mono text-vikasa-700 mt-1">
                            NDVI: {reading.ndvi.toFixed(3)}
                          </p>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <BarChart className="h-5 w-5 text-vikasa-600" />
              Reflectance Comparison (Calibrated Only)
            </h3>
            <Badge variant="info">{calibratedReadings.length} readings</Badge>
          </CardHeader>
          <CardBody className="pt-0">
            <ReflectanceComparison readings={calibratedReadings} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-neutral-900">Raw ADC Data (All Readings)</h3>
          </CardHeader>
          <CardBody className="pt-0">
            <Table
              data={allReadings.slice().reverse()}
              columns={[
                { key: 'reading_id', header: 'Reading ID', render: (v) => <code className="text-xs">{v as string}</code> },
                { key: 'plant_id', header: 'Plant' },
                { key: 'timestamp', header: 'Time', render: (v) => new Date(v as string).toLocaleTimeString() },
                { key: 'red_raw', header: 'Red Raw', render: (v) => v !== undefined ? String(v) : '—' },
                { key: 'nir_raw', header: 'NIR Raw', render: (v) => v !== undefined ? String(v) : '—' },
                { key: 'red_dark', header: 'Red Dark', render: (v) => v !== undefined ? String(v) : '—' },
                { key: 'nir_dark', header: 'NIR Dark', render: (v) => v !== undefined ? String(v) : '—' },
                { key: 'red_reference', header: 'Red Ref', render: (v) => v !== undefined ? String(v) : '—' },
                { key: 'nir_reference', header: 'NIR Ref', render: (v) => v !== undefined ? String(v) : '—' },
                { key: 'red_reflectance', header: 'Red Refl. (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : 'Not calibrated' },
                { key: 'nir_reflectance', header: 'NIR Refl. (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : 'Not calibrated' },
                { key: 'ndvi', header: 'NDVI', render: (v) => v !== undefined ? v.toFixed(3) : '—' },
              ]}
              keyExtractor={(row, i) => `${row.reading_id}-${i}`}
              emptyMessage="No readings available"
            />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}