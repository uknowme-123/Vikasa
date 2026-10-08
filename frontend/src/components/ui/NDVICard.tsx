import { forwardRef, type HTMLAttributes } from 'react'
import { Leaf } from 'lucide-react'
import { Badge } from './Badge'

interface NDVICardProps extends HTMLAttributes<HTMLDivElement> {
  value: number | null | undefined
  healthScore?: number | null
  healthLabel?: string
  label?: string
  subtitle?: string
  status?: 'healthy' | 'moderate' | 'stressed' | 'critical' | 'unknown'
  calibrated?: boolean
  className?: string
  animate?: boolean
}

const statusConfig = {
  healthy: { label: 'HEALTHY', color: 'text-vikasa-400', bg: 'bg-vikasa-950/30', border: 'border-vikasa-500/20', glow: 'animate-pulse-glow' },
  moderate: { label: 'MODERATE', color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-500/20', glow: '' },
  stressed: { label: 'STRESSED', color: 'text-amber-400', bg: 'bg-amber-950/30', border: 'border-amber-500/20', glow: '' },
  critical: { label: 'CRITICAL', color: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-500/20', glow: 'animate-pulse-glow-red' },
  unknown: { label: 'UNKNOWN', color: 'text-surface-500', bg: 'bg-surface-300/30', border: 'border-surface-400/20', glow: '' },
}

const getNDVIStatus = (value: number | null | undefined): keyof typeof statusConfig => {
  if (value == null) return 'unknown'
  if (value >= 0.5) return 'healthy'
  if (value >= 0.2) return 'moderate'
  return 'stressed'
}

const getHealthLabelStatus = (label?: string): keyof typeof statusConfig | undefined => {
  const normalized = label?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized.includes('critical') || normalized.includes('severe')) return 'critical'
  if (normalized.includes('stress')) return 'stressed'
  if (normalized.includes('moderate')) return 'moderate'
  if (normalized.includes('healthy')) return 'healthy'
  if (normalized === 'unknown') return 'unknown'
  return undefined
}

export const NDVICard = forwardRef<HTMLDivElement, NDVICardProps>(
  ({ className = '', value, healthScore, healthLabel, label = 'NDVI', subtitle, status, calibrated = false, animate = true, ...props }, ref) => {
    const scoreIsValid = healthScore != null && Number.isFinite(healthScore) && healthScore >= 0 && healthScore <= 100
    const displayedScore = scoreIsValid ? healthScore : undefined
    const derivedStatus = status ?? getHealthLabelStatus(healthLabel) ?? getNDVIStatus(value)
    const config = statusConfig[derivedStatus]
    const displayValue = value == null ? '—' : value.toFixed(3)
    const markerAngle = displayedScore === undefined ? undefined : (displayedScore / 100) * 180 - 90

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
            <div className="flex items-center gap-2">
              <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${config.bg} ${config.border} ${config.color}`}>
                {config.label}
              </div>
              {!calibrated && (
                <Badge variant="warning" className="ml-2">UNCALIBRATED</Badge>
              )}
            </div>
          </div>

          <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(250px,0.9fr)]">
            <div>
              <div className="flex items-end gap-3">
                <span className={`sensor-value-xl font-mono tabular-nums ${animate ? 'animate-count-up' : ''}`}>{displayValue}</span>
                <span className="mb-1 font-mono text-sm text-surface-600">NDVI</span>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-surface-600">
                <Leaf className="h-4 w-4 text-vikasa-400" aria-hidden="true" />
                <span>{subtitle ?? 'Based on Red + NIR reflectance'}</span>
              </div>
              {!calibrated && (
                <p className="mt-3 text-xs leading-5 text-amber-400">
                  Calibrated reflectance is required for a valid NDVI assessment.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-surface-300/70 bg-surface-0/40 px-4 pb-4 pt-2 text-center">
              <svg viewBox="0 0 240 120" className="mx-auto w-full max-w-[300px]" role="img" aria-label={`Plant health score ${displayedScore === undefined ? 'unavailable' : `${displayedScore}%`}; classification ${config.label.toLowerCase()}`}>
                <path d="M 30 112 A 90 90 0 0 1 210 112" fill="none" stroke="rgb(53 72 61 / 0.55)" strokeWidth="14" strokeLinecap="round" />
                <path d="M 30 112 A 90 90 0 0 1 75 34" fill="none" stroke="#F87171" strokeWidth="14" strokeLinecap="round" />
                <path d="M 82 27 A 90 90 0 0 1 158 27" fill="none" stroke="#FACC15" strokeWidth="14" strokeLinecap="round" />
                <path d="M 165 34 A 90 90 0 0 1 210 112" fill="none" stroke="#22C55E" strokeWidth="14" strokeLinecap="round" />
                {markerAngle !== undefined && (
                  <>
                    <line x1="120" y1="112" x2="120" y2="43" stroke="#E8EEF4" strokeWidth="3" strokeLinecap="round" transform={`rotate(${markerAngle} 120 112)`} />
                    <circle cx="120" cy="112" r="6" fill="#E8EEF4" />
                  </>
                )}
              </svg>
              <p className={`-mt-5 font-mono text-3xl font-bold tabular-nums ${config.color}`}>
                {displayedScore === undefined ? 'N/A%' : `${displayedScore.toFixed(0)}%`}
              </p>
              <p className="mt-1 text-xs text-surface-600">
                {displayedScore === undefined ? 'Health percentage not provided by data source' : 'Plant health score'}
              </p>
              <div className="mt-4 flex justify-between gap-2 text-[0.6rem] font-semibold uppercase tracking-wide">
                <span className="text-red-400">Critical</span>
                <span className="text-amber-300">Stressed</span>
                <span className="text-vikasa-400">Healthy</span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-vikasa-500/30 to-transparent" aria-hidden="true" />
      </div>
    )
  }
)

NDVICard.displayName = 'NDVICard'