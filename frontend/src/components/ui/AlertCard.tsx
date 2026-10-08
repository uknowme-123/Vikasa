import { forwardRef, type HTMLAttributes } from 'react'
import { ShieldAlert, AlertTriangle, Info, MapPin, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { Badge } from './Badge'

interface AlertCardProps extends HTMLAttributes<HTMLDivElement> {
  alert: {
    id: string
    severity: 'info' | 'warning' | 'critical'
    title: string
    detail: string
    timestamp: string
    plantId?: string
  }
  expanded?: boolean
  onToggle?: () => void
  className?: string
}

const severityConfig = {
  critical: {
    label: 'Critical',
    icon: ShieldAlert,
    iconColor: 'text-red-400',
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-950/15',
    badgeVariant: 'danger' as const,
    glow: 'glow-red',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-950/15',
    badgeVariant: 'warning' as const,
    glow: 'glow-amber',
  },
  info: {
    label: 'Info',
    icon: Info,
    iconColor: 'text-blue-400',
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-950/15',
    badgeVariant: 'info' as const,
    glow: '',
  },
}

export const AlertCard = forwardRef<HTMLDivElement, AlertCardProps>(
  ({ className = '', alert, expanded = false, onToggle, ...props }, ref) => {
    const config = severityConfig[alert.severity]
    const Icon = config.icon

    return (
      <div
        ref={ref}
        className={`border-l-2 px-6 py-5 transition-colors duration-150 ${config.borderColor} ${config.bgColor} ${config.glow} ${className}`}
        {...props}
      >
        <div className="flex items-start gap-4">
          <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Badge variant={config.badgeVariant}>{config.label}</Badge>
              {alert.plantId && (
                <Badge variant="neutral">
                  <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                  {alert.plantId}
                </Badge>
              )}
              <span className="ml-auto text-xs text-surface-500 flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {new Date(alert.timestamp).toLocaleString()}
              </span>
            </div>
            <h3 className="text-base font-semibold text-surface-950 mb-1">{alert.title}</h3>
            {expanded && <p className="mt-1 max-w-3xl text-sm leading-6 text-surface-500">{alert.detail}</p>}
            {!expanded && alert.detail && (
              <p className="mt-1 max-w-3xl text-sm leading-6 text-surface-500 line-clamp-2">{alert.detail}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-surface-500">
              <span><span className="uppercase tracking-wider text-surface-600">What</span> {alert.title}</span>
              <span><span className="uppercase tracking-wider text-surface-600">When</span> {new Date(alert.timestamp).toLocaleString()}</span>
              {alert.plantId && <span><span className="uppercase tracking-wider text-surface-600">Where</span> {alert.plantId}</span>}
            </div>
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                className="mt-4 flex items-center gap-1.5 text-xs font-medium text-vikasa-400 hover:text-vikasa-300 transition-colors"
                aria-expanded={expanded}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    View details
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
)

AlertCard.displayName = 'AlertCard'