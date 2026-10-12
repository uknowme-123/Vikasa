import { forwardRef, type HTMLAttributes } from 'react'
import { Leaf } from 'lucide-react'

interface NDVICardProps extends HTMLAttributes<HTMLDivElement> {
  value: number | null | undefined
  label?: string
  subtitle?: string
  calibrated?: boolean
  className?: string
  animate?: boolean
}

const statusConfig = {
  healthy: { color: 'text-vikasa-400', glow: 'animate-pulse-glow' },
  unhealthy: { color: 'text-red-400', glow: 'animate-pulse-glow-red' },
  unknown: { color: 'text-surface-500', glow: '' },
}

const getNDVIStatus = (value: number | null | undefined): keyof typeof statusConfig => {
  if (value == null || !Number.isFinite(value)) return 'unknown'
  return value > 0.03 ? 'healthy' : 'unhealthy'
}

export const NDVICard = forwardRef<HTMLDivElement, NDVICardProps>(
  ({ className = '', value, label = 'NDVI', subtitle, calibrated = false, animate = true, ...props }, ref) => {
    const derivedStatus = getNDVIStatus(value)
    const config = statusConfig[derivedStatus]
    const displayValue = value == null ? '—' : value.toFixed(3)
    const healthText = derivedStatus === 'unknown' ? 'UNAVAILABLE' : derivedStatus === 'healthy' ? 'HEALTHY' : 'UNHEALTHY'

    return (
      <div
        ref={ref}
        className={`card-raised relative overflow-hidden ${config.glow} ${className}`}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-vikasa-500/5 via-transparent to-transparent" aria-hidden="true" />
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <p className="sensor-label text-vikasa-400/80 mb-1">PLANT HEALTH</p>
              <h2 className="text-xl lg:text-2xl font-semibold text-surface-950 tracking-tight">{label}</h2>
            </div>
          </div>

          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(250px,0.9fr)]">
            <div>
              <div className="flex items-end gap-3">
                <span className={`text-3xl font-semibold font-mono tabular-nums text-surface-950 ${animate ? 'animate-count-up' : ''}`}>{displayValue}</span>
                <span className="mb-1 font-mono text-sm text-surface-600">{calibrated ? 'NDVI' : 'estimate'}</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-surface-600">
                <Leaf className="h-4 w-4 text-vikasa-400" aria-hidden="true" />
                <span>{subtitle ?? 'Based on Red + NIR reflectance'}</span>
              </div>
            </div>

            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-surface-300/70 bg-surface-0/40 px-4 py-8 text-center">
              <p className={`text-4xl font-bold tracking-wide sm:text-5xl ${config.color}`} aria-live="polite">
                {healthText}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vikasa-500/30 to-transparent" aria-hidden="true" />
      </div>
    )
  }
)

NDVICard.displayName = 'NDVICard'
