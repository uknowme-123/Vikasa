import { forwardRef, type HTMLAttributes } from 'react'
import { Leaf, Thermometer, Droplets, Gauge, Sun, Radio, Aperture } from 'lucide-react'

interface PlantStatusCardProps extends HTMLAttributes<HTMLDivElement> {
  plantId: string
  species?: string
  sessionId?: string
  ndvi?: number | null
  healthLabel?: string
  temperature?: number | null
  humidity?: number | null
  soilMoisture?: number | null
  ambientLight?: number | null
  readingCount?: number
  lastUpdated?: string
  calibrated?: boolean
  className?: string
}

const formatValue = (value: number | null | undefined, unit = '', decimals = 1) =>
  value == null ? 'Unavailable' : `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`

const formatTimestamp = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const healthConfig = {
  healthy: { label: 'Healthy', color: 'text-vikasa-400', bg: 'bg-vikasa-950/30', border: 'border-vikasa-500/20' },
  moderate: { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-500/20' },
  stressed: { label: 'Stressed', color: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-500/20' },
  unknown: { label: 'Unknown', color: 'text-surface-500', bg: 'bg-surface-300/30', border: 'border-surface-400/20' },
}

const getHealthStatus = (healthLabel?: string, ndvi?: number | null): keyof typeof healthConfig => {
  if (healthLabel) {
    const label = healthLabel.toLowerCase()
    if (label.includes('healthy')) return 'healthy'
    if (label.includes('moderate')) return 'moderate'
    if (label.includes('stress') || label.includes('severe')) return 'stressed'
  }
  if (ndvi != null) {
    if (ndvi >= 0.5) return 'healthy'
    if (ndvi >= 0.2) return 'moderate'
    return 'stressed'
  }
  return 'unknown'
}

export const PlantStatusCard = forwardRef<HTMLDivElement, PlantStatusCardProps>(
  ({
    className = '',
    plantId,
    species,
    sessionId,
    ndvi,
    healthLabel,
    temperature,
    humidity,
    soilMoisture,
    ambientLight,
    readingCount,
    lastUpdated,
    calibrated = false,
    ...props
  }, ref) => {
    const healthStatus = getHealthStatus(healthLabel, calibrated ? ndvi : undefined)
    const config = healthConfig[healthStatus]

    return (
      <div ref={ref} className={`card-raised ${className}`} {...props}>
        <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="sensor-label">PLANT STATUS</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="font-mono text-xl font-semibold text-surface-950">{plantId}</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${config.bg} ${config.border} ${config.color}`}>
                {config.label}
              </span>
            </div>
            {species && <p className="mt-2 text-sm text-surface-700">{species} · session {sessionId ?? '—'}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold text-surface-700">LAST UPDATED</p>
              <p className="mt-1 font-mono text-sm text-surface-950">{lastUpdated ? formatTimestamp(lastUpdated) : 'Awaiting reading'}</p>
            </div>
          </div>
        </div>

        <div className="card-body space-y-6">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(180px,0.42fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-vikasa-300">HEALTH SIGNAL</span>
                {ndvi != null && (
                  <span className={`font-mono text-sm ${healthConfig[healthStatus].color}`}>
                    NDVI: {ndvi.toFixed(3)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricItem
                  label={calibrated ? 'NDVI' : 'Raw NDVI Estimate'}
                  value={formatValue(ndvi, 'NDVI', 3)}
                  icon={<Leaf className="h-4 w-4 text-vikasa-400" />}
                  accent="vikasa"
                  available={ndvi != null}
                />
                <MetricItem
                  label="Ambient Light"
                  value={formatValue(ambientLight, 'ADC', 0)}
                  icon={<Sun className="h-4 w-4 text-optical-nir-400" />}
                  accent="nir"
                  available={ambientLight != null}
                />
                <MetricItem
                  label="Readings"
                  value={readingCount !== undefined ? String(readingCount) : '—'}
                  icon={<Radio className="h-4 w-4 text-surface-500" />}
                  accent="neutral"
                  available={readingCount != null}
                />
                <MetricItem
                  label="Calibration"
                  value={calibrated ? 'Available' : 'Unavailable'}
                  icon={<Aperture className="h-4 w-4" />}
                  accent={calibrated ? 'vikasa' : 'neutral'}
                  available={true}
                />
              </div>
            </div>

            <div className="hidden min-w-0 flex-col justify-between rounded-2xl border border-vikasa-500/20 bg-vikasa-950/20 p-5 lg:flex xl:p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-vikasa-300">
                <Leaf className="h-4 w-4" aria-hidden="true" />
                Health Signal
              </div>
              <div className="mt-8">
                <p className="sensor-value-lg font-mono text-surface-950">{ndvi == null ? '—' : ndvi.toFixed(3)}</p>
                <p className="mt-1 text-xs leading-5 text-surface-700">
                  {calibrated ? 'Validated reflectance input' : 'Raw estimate only'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-surface-300/50 pt-6">
            <p className="sensor-label mb-4 text-surface-700">ENVIRONMENTAL CONDITIONS</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricItem
                label="Temperature"
                value={formatValue(temperature, '°C')}
                icon={<Thermometer className="h-4 w-4 text-amber-400" />}
                accent="amber"
                available={temperature != null}
              />
              <MetricItem
                label="Humidity"
                value={formatValue(humidity, '%', 0)}
                icon={<Droplets className="h-4 w-4 text-blue-400" />}
                accent="blue"
                available={humidity != null}
              />
              <MetricItem
                label="Soil Moisture Raw"
                value={formatValue(soilMoisture, 'ADC', 0)}
                icon={<Gauge className="h-4 w-4 text-vikasa-400" />}
                accent="vikasa"
                available={soilMoisture != null}
              />
              <MetricItem
                label="Ambient Light"
                value={formatValue(ambientLight, 'ADC', 0)}
                icon={<Sun className="h-4 w-4 text-optical-nir-400" />}
                accent="nir"
                available={ambientLight != null}
              />
            </div>
          </div>

          {lastUpdated && (
            <div className="border-t border-surface-300/50 pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-surface-700">
              <span>Reading ID: <strong className="font-mono font-normal text-surface-950">{plantId}-{lastUpdated.replace(/[^0-9]/g, '').slice(-6)}</strong></span>
              <span>Session: <strong className="font-mono font-normal text-surface-950">{sessionId ?? '—'}</strong></span>
            </div>
          )}
        </div>
      </div>
    )
  }
)

interface MetricItemProps {
  label: string
  value: string
  icon: React.ReactNode
  accent: 'vikasa' | 'amber' | 'blue' | 'nir' | 'neutral'
  available: boolean
}

function MetricItem({ label, value, icon, accent, available }: MetricItemProps) {
  const accents = {
    vikasa: 'border-vikasa-500/20 bg-vikasa-950/15',
    amber: 'border-amber-500/20 bg-amber-950/15',
    blue: 'border-blue-500/20 bg-blue-950/15',
    nir: 'border-optical-nir-500/20 bg-optical-nir-950/15',
    neutral: 'border-surface-300 bg-surface-0/50',
  }
  return (
    <div className={`rounded-xl border p-4 ${accents[accent]}`}>
      <div className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-surface-700">
        {icon}
        {label}
      </div>
      <p className="mt-3 font-mono text-lg font-semibold text-surface-950">
        {available ? value : <span className="text-surface-500 italic">Unavailable</span>}
      </p>
    </div>
  )
}

PlantStatusCard.displayName = 'PlantStatusCard'
