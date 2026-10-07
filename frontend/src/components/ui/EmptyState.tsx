import { Leaf, Database, AlertTriangle, Wifi, Search, Upload, BarChart2, Settings } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  title: string
  description: string
  icon?: 'leaf' | 'database' | 'alert' | 'wifi' | 'search' | 'upload' | 'chart' | 'settings'
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
}

const icons = {
  leaf: Leaf,
  database: Database,
  alert: AlertTriangle,
  wifi: Wifi,
  search: Search,
  upload: Upload,
  chart: BarChart2,
  settings: Settings,
}

export function EmptyState({
  title,
  description,
  icon = 'database',
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  const Icon = icons[icon]

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-200/50 text-surface-400 mb-6">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold text-surface-950 mb-2">{title}</h3>
      <p className="text-surface-500 max-w-sm mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        {action && (
          <Button
            variant={action.variant ?? 'primary'}
            className="w-full sm:w-auto"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="ghost" className="w-full sm:w-auto" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}

export function EmptyStateInline({ text }: { text: string }) {
  return (
    <p className="py-12 text-center text-sm text-surface-500">{text}</p>
  )
}