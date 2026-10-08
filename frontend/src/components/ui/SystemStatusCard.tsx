import { forwardRef, type HTMLAttributes } from 'react'
import { CheckCircle, Clock } from 'lucide-react'
import { Badge } from './Badge'

interface SystemStatusCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  detail: string
  status: 'connected' | 'disconnected' | 'unknown'
  icon: React.ReactNode
  className?: string
}

const statusConfig = {
  connected: { dot: 'bg-vikasa-500', text: 'text-vikasa-400', label: 'connected' },
  disconnected: { dot: 'bg-red-500', text: 'text-red-400', label: 'disconnected' },
  unknown: { dot: 'bg-surface-500', text: 'text-surface-500', label: 'unknown' },
}

export const SystemStatusCard = forwardRef<HTMLDivElement, SystemStatusCardProps>(
  ({ className = '', label, detail, status, icon, ...props }, ref) => {
    return (
      <div ref={ref} className={`card-raised ${className}`} {...props}>
        <div className="card-body">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="sensor-label">{label}</p>
              <p className="mt-2 text-sm text-surface-500">{detail}</p>
            </div>
            <span className="shrink-0 text-surface-500">{icon}</span>
          </div>
          <div className="mt-5">
            <StatusPill label="status" status={status} size="sm" />
          </div>
        </div>
      </div>
    )
  }
)

interface PipelineNodeProps extends HTMLAttributes<HTMLDivElement> {
  label: string
  detail: string
  status: 'connected' | 'disconnected' | 'unknown'
  icon: React.ReactNode
  future?: boolean
}

export const PipelineNode = forwardRef<HTMLDivElement, PipelineNodeProps>(
  ({ className = '', label, detail, status, icon, future = false, ...props }, ref) => {
    return (
      <div ref={ref} className={`min-w-0 flex-1 rounded-2xl border border-surface-300 bg-surface-100 p-4 ${className}`} {...props}>
        <div className="flex items-start justify-between gap-3">
          <span className="text-surface-500">{icon}</span>
          {future ? (
            <Badge variant="warning">Planned</Badge>
          ) : (
            <StatusPill label="status" status={status} size="sm" />
          )}
        </div>
        <p className="mt-4 text-sm font-semibold text-surface-950">{label}</p>
        <p className="mt-1 text-xs leading-5 text-surface-500">
          {future ? detail : status === 'unknown' ? 'Status unavailable' : detail}
        </p>
      </div>
    )
  }
)

interface ReadinessItemProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  detail: string
  pending?: boolean
}

export const ReadinessItem = forwardRef<HTMLDivElement, ReadinessItemProps>(
  ({ className = '', title, detail, pending = false, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex items-start gap-3 ${className}`} {...props}>
        <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          pending ? 'bg-amber-950/40 text-amber-400' : 'bg-vikasa-950/40 text-vikasa-400'
        }`}>
          {pending ? <Clock className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
        </span>
        <div>
          <p className="text-sm font-medium text-surface-950">{title}</p>
          <p className="mt-1 text-xs leading-5 text-surface-500">{detail}</p>
        </div>
      </div>
    )
  }
)

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  label: string
  status: 'connected' | 'disconnected' | 'unknown'
  size?: 'sm' | 'md'
}

const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(
  ({ className = '', label, status, size = 'md', ...props }, ref) => {
    const config = statusConfig[status]
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses[size]} font-medium ${className}`}
        {...props}
      >
        <span className={`relative flex h-1.5 w-1.5 ${config.dot} rounded-full`} aria-hidden="true" />
        <span className={config.text}>{config.label}</span>
        <span className="text-xs text-surface-500 uppercase tracking-[0.08em]">{label}</span>
      </span>
    )
  }
)

StatusPill.displayName = 'StatusPill'

SystemStatusCard.displayName = 'SystemStatusCard'
PipelineNode.displayName = 'PipelineNode'
ReadinessItem.displayName = 'ReadinessItem'