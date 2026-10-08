import { forwardRef, type HTMLAttributes } from 'react'
interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  value?: number | null
  unit?: string
  precision?: number
  trend?: (number | null)[]
  iconColor?: 'green' | 'red' | 'blue' | 'amber' | 'violet'
  icon?: React.ReactNode
  status?: 'healthy' | 'warning' | 'critical' | 'unknown'
}

const iconColorClasses = {
  green: 'bg-vikasa-950/30 text-vikasa-400 border-vikasa-500/20',
  red: 'bg-optical-red-950/30 text-optical-red-400 border-optical-red-500/20',
  blue: 'bg-blue-950/30 text-blue-400 border-blue-500/20',
  amber: 'bg-amber-950/30 text-amber-400 border-amber-500/20',
  violet: 'bg-optical-nir-950/30 text-optical-nir-400 border-optical-nir-500/20',
}

const statusClasses = {
  healthy: 'text-vikasa-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  unknown: 'text-surface-500',
}

const fmt = (value?: number | null, unit = '', precision = 1) =>
  value == null ? '—' : `${value.toFixed(precision)}${unit ? ` ${unit}` : ''}`

const Sparkline = ({ data, color = 'currentColor' }: { data?: (number | null)[]; color?: string }) => {
  const points = data?.filter((point): point is number => typeof point === 'number' && Number.isFinite(point))
  if (!points || points.length < 2) return null
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1

  return (
    <svg className="h-12 w-full" viewBox="0 0 100 30" aria-hidden="true">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={points
          .map((point, i) => {
            const x = (i / (points.length - 1)) * 100
            const y = 30 - ((point - min) / range) * 28 - 1
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
          })
          .join(' ')}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={points
          .map((point, i) => {
            const x = (i / (points.length - 1)) * 100
            const y = 30 - ((point - min) / range) * 28 - 1
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
          })
          .join(' ')}
        stroke="url(#sparkline-gradient)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
    </svg>
  )
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className = '', label, value, unit = '', precision = 1, trend, iconColor = 'green', icon, status, ...props }, ref) => {
    const iconBg = iconColorClasses[iconColor] || iconColorClasses.green
    const statusColor = statusClasses[status || 'unknown']

    return (
      <div ref={ref} className={`card-raised ${className}`} {...props}>
        <div className="card-body">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="sensor-label">{label}</p>
              <p className="mt-2 sensor-value font-mono">
                {fmt(value, unit, precision)}
              </p>
              {trend && trend.length >= 2 && (
                <div className="mt-3">
                  <Sparkline data={trend} color={iconColor === 'red' ? '#ef4444' : iconColor === 'blue' ? '#3b82f6' : iconColor === 'violet' ? '#818cf8' : iconColor === 'amber' ? '#fbbf24' : '#34d399'} />
                </div>
              )}
            </div>
            <div className="flex-shrink-0 ml-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${iconBg}`}>
                {icon ? (
                  <span className="h-5 w-5" style={{ color: 'currentColor' }}>{icon}</span>
                ) : (
                  <span className="h-5 w-5" style={{ color: 'currentColor' }} />
                )}
              </div>
            </div>
          </div>
          {status && (
            <div className="mt-4 pt-3 border-t border-surface-300 flex items-center justify-between">
              <span className="text-xs text-surface-500">Status</span>
              <span className={`text-sm font-medium ${statusColor}`}>
                {status === 'healthy' ? 'Healthy' : status === 'warning' ? 'Warning' : status === 'critical' ? 'Critical' : 'Unknown'}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }
)

MetricCard.displayName = 'MetricCard'