import { Card, CardBody } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { SensorReadingWithMeta } from '../../types/sensor'
import { getDisplayValue } from '../../types/sensor'

interface SensorCardProps {
  label: string
  value: number | null | undefined
  unit?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'stable'
  trendValue?: string
  status?: 'normal' | 'warning' | 'critical'
  className?: string
}

export function SensorCard({
  label,
  value,
  unit = '',
  icon,
  trend,
  trendValue,
  status = 'normal',
  className = '',
}: SensorCardProps) {
  const statusColors = {
    normal: 'text-vikasa-600',
    warning: 'text-amber-600',
    critical: 'text-red-600',
  }

  const statusBgColors = {
    normal: 'bg-vikasa-50',
    warning: 'bg-amber-50',
    critical: 'bg-red-50',
  }

  const displayValue = getDisplayValue(value, unit)

  return (
    <Card className={className}>
      <CardBody className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-500 truncate">{label}</p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl font-semibold tabular-nums ${value === null || value === undefined ? 'text-neutral-400' : statusColors[status]}`}>
                {displayValue}
              </span>
              {trendValue && (
                <Badge variant={status === 'critical' ? 'danger' : status === 'warning' ? 'warning' : 'success'} className="ml-2">
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                </Badge>
              )}
            </div>
          </div>
          {icon && <div className="flex-shrink-0 text-neutral-300">{icon}</div>}
        </div>
      </CardBody>
    </Card>
  )
}

interface SensorGridProps {
  readings: SensorReadingWithMeta[]
  plantId?: string
}

export function SensorGrid({ readings, plantId }: SensorGridProps) {
  const filtered = plantId ? readings.filter((r) => r.plant_id === plantId) : readings
  const latest = filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

  if (!latest) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Temperature', unit: '°C' },
          { label: 'Humidity', unit: '%' },
          { label: 'Soil Moisture', unit: '%' },
          { label: 'Ambient Light', unit: '' },
        ].map((s) => (
          <SensorCard key={s.label} label={s.label} value={null} unit={s.unit} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SensorCard
        label="Temperature"
        value={latest.temperature_c}
        unit="°C"
        status={latest.temperature_c !== null && latest.temperature_c !== undefined && latest.temperature_c > 30 ? 'warning' : 'normal'}
      />
      <SensorCard
        label="Humidity"
        value={latest.humidity_pct}
        unit="%"
        status={latest.humidity_pct !== null && latest.humidity_pct !== undefined && latest.humidity_pct < 40 ? 'warning' : 'normal'}
      />
      <SensorCard
        label="Soil Moisture"
        value={latest.soil_moisture_pct}
        unit="%"
        status={latest.soil_moisture_pct !== null && latest.soil_moisture_pct !== undefined && latest.soil_moisture_pct < 30 ? 'warning' : 'normal'}
      />
      <SensorCard
        label="Ambient Light"
        value={latest.ambient_light_raw}
        unit="ADC"
      />
    </div>
  )
}

export function OpticalSensorCard({ reading }: { reading: SensorReadingWithMeta }) {
  const hasCalibration = reading.red_reflectance !== undefined && reading.nir_reflectance !== undefined

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SensorCard
        label="Red (Raw)"
        value={reading.red_raw}
        unit="ADC"
      />
      <SensorCard
        label="NIR (Raw)"
        value={reading.nir_raw}
        unit="ADC"
      />
      <SensorCard
        label="Red Reflectance"
        value={reading.red_reflectance}
        unit="%"
        status={hasCalibration ? 'normal' : 'normal'}
      />
      <SensorCard
        label="NIR Reflectance"
        value={reading.nir_reflectance}
        unit="%"
        status={hasCalibration ? 'normal' : 'normal'}
      />
      {hasCalibration && (
        <SensorCard
          label="NDVI"
          value={reading.ndvi}
          unit=""
          status={reading.ndvi !== null && reading.ndvi !== undefined && reading.ndvi < 0.3 ? 'warning' : 'normal'}
        />
      )}
      {!hasCalibration && (
        <div className="sm:col-span-2 lg:col-span-2 card p-5">
          <div className="flex items-center gap-3 text-neutral-600">
            <svg className="h-5 w-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium">Calibrated reflectance unavailable</p>
              <p className="text-sm">NDVI requires calibrated reflectance values. Raw ADC counts cannot be used directly.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}