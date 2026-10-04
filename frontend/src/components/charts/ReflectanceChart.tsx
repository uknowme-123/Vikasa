import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import { Card, CardBody } from '../ui/Card'
import type { SensorReadingWithMeta } from '../../types/sensor'

interface ReflectanceChartProps {
  reading: SensorReadingWithMeta | null
  title?: string
}

export function ReflectanceChart({ reading, title = 'Reflectance & NDVI' }: ReflectanceChartProps) {
  if (!reading) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center h-64">
          <p className="text-neutral-500">Select a reading to view reflectance data</p>
        </CardBody>
      </Card>
    )
  }

  const hasCalibration = reading.red_reflectance !== undefined && reading.nir_reflectance !== undefined

  if (!hasCalibration) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center justify-center h-64 text-center p-8">
          <svg className="h-12 w-12 text-neutral-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Calibrated Reflectance Unavailable</h3>
          <p className="text-neutral-600 max-w-md">
            This reading contains raw ADC counts but lacks calibrated reflectance values. NDVI and reflectance percentages require a documented calibration procedure using a reference target.
          </p>
          <div className="mt-4 p-4 bg-neutral-50 rounded-lg text-left max-w-md text-sm">
            <p className="font-medium text-neutral-900 mb-2">Available raw data:</p>
            <dl className="space-y-1">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Red (illuminated):</dt>
                <dd className="font-mono text-neutral-900">{reading.red_raw ?? '—'} ADC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">NIR (illuminated):</dt>
                <dd className="font-mono text-neutral-900">{reading.nir_raw ?? '—'} ADC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Red (dark):</dt>
                <dd className="font-mono text-neutral-900">{reading.red_dark ?? '—'} ADC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">NIR (dark):</dt>
                <dd className="font-mono text-neutral-900">{reading.nir_dark ?? '—'} ADC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Red (reference):</dt>
                <dd className="font-mono text-neutral-900">{reading.red_reference ?? '—'} ADC</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">NIR (reference):</dt>
                <dd className="font-mono text-neutral-900">{reading.nir_reference ?? '—'} ADC</dd>
              </div>
            </dl>
          </div>
        </CardBody>
      </Card>
    )
  }

  const chartData = [
    { band: 'Red', reflectance: reading.red_reflectance!, color: '#dc2626' },
    { band: 'NIR', reflectance: reading.nir_reflectance!, color: '#7c2d12' },
  ]

  const ndviValue = reading.ndvi

  return (
    <Card>
      <CardBody>
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">{title}</h3>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" horizontal={false} />
                <XAxis type="number" domain={[0, 'dataMax + 10']} tick={{ fontSize: 11, fill: '#737373' }} axisLine={{ stroke: '#e5e5e5' }} />
                <YAxis type="category" dataKey="band" tick={{ fontSize: 12, fill: '#525252', fontWeight: 500 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Reflectance']}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="reflectance" radius={[0, 4, 4, 0]} maxBarSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col justify-center">
            <div className="text-center p-6 bg-vikasa-50 rounded-xl">
              <p className="text-sm font-medium text-vikasa-700 uppercase tracking-wider mb-1">NDVI</p>
              <p className="text-4xl font-bold text-vikasa-700 tabular-nums">
                {ndviValue !== null && ndviValue !== undefined ? ndviValue.toFixed(3) : '—'}
              </p>
              <p className="text-xs text-vikasa-600 mt-1">
                {(ndviValue !== null && ndviValue !== undefined && ndviValue >= 0.5) && 'Healthy vegetation'}
                {(ndviValue !== null && ndviValue !== undefined && ndviValue >= 0.3 && ndviValue < 0.5) && 'Moderate vegetation'}
                {(ndviValue !== null && ndviValue !== undefined && ndviValue < 0.3) && 'Sparse/stressed vegetation'}
              </p>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Formula:</span>
                <code className="font-mono text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">(NIR - Red) / (NIR + Red)</code>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Red Reflectance:</span>
                <span className="font-mono text-neutral-900">{reading.red_reflectance!.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>NIR Reflectance:</span>
                <span className="font-mono text-neutral-900">{reading.nir_reflectance!.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> NDVI calculated from calibrated reflectance values only. Raw ADC counts (red_raw, nir_raw) are not suitable for direct NDVI computation.
            Calibration requires reference target measurements under identical illumination geometry.
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

interface ReflectanceComparisonProps {
  readings: SensorReadingWithMeta[]
  title?: string
}

export function ReflectanceComparison({ readings, title = 'Reflectance Comparison' }: ReflectanceComparisonProps) {
  const calibratedReadings = readings.filter((r) => r.red_reflectance !== undefined && r.nir_reflectance !== undefined)

  if (calibratedReadings.length === 0) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center h-64">
          <p className="text-neutral-500">No calibrated readings available for comparison</p>
        </CardBody>
      </Card>
    )
  }

  const chartData = calibratedReadings.map((r, i) => ({
    label: `${r.plant_id} (${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
    red: r.red_reflectance!,
    nir: r.nir_reflectance!,
    ndvi: r.ndvi ?? 0,
  }))

  return (
    <Card>
      <CardBody>
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">{title}</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#737373' }}
                axisLine={{ stroke: '#e5e5e5' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                domain={[0, 'dataMax + 10']}
                tickFormatter={(value) => `${value}%`}
                tick={{ fontSize: 11, fill: '#737373' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === 'red' ? 'Red Reflectance' : 'NIR Reflectance']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="red" name="Red Reflectance" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="nir" name="NIR Reflectance" fill="#7c2d12" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}