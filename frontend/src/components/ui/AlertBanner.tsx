import { forwardRef, type HTMLAttributes } from 'react'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

interface AlertBannerProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
  onDismiss?: () => void
  dismissible?: boolean
}

export const AlertBanner = forwardRef<HTMLDivElement, AlertBannerProps>(
  ({ className = '', variant = 'info', title, children, onDismiss, dismissible = false, ...props }, ref) => {
    const variantConfig = {
      info: {
        icon: Info,
        iconClass: 'text-blue-600',
        bgClass: 'bg-blue-50 border-blue-200',
        textClass: 'text-blue-800',
        titleDefault: 'Information',
      },
      success: {
        icon: CheckCircle,
        iconClass: 'text-vikasa-600',
        bgClass: 'bg-vikasa-50 border-vikasa-200',
        textClass: 'text-vikasa-800',
        titleDefault: 'Success',
      },
      warning: {
        icon: AlertTriangle,
        iconClass: 'text-amber-600',
        bgClass: 'bg-amber-50 border-amber-200',
        textClass: 'text-amber-800',
        titleDefault: 'Warning',
      },
      danger: {
        icon: AlertCircle,
        iconClass: 'text-red-600',
        bgClass: 'bg-red-50 border-red-200',
        textClass: 'text-red-800',
        titleDefault: 'Error',
      },
    }

    const config = variantConfig[variant]

    return (
      <div
        ref={ref}
        className={`flex gap-3 rounded-lg border p-4 ${config.bgClass} ${config.textClass} ${className}`}
        role="alert"
        {...props}
      >
        <config.icon className={`flex-shrink-0 h-5 w-5 ${config.iconClass}`} aria-hidden="true" />
        <div className="flex-1">
          {title && <h4 className="text-sm font-medium">{title}</h4>}
          <div className={`text-sm ${title ? 'mt-1' : ''}`}>{children}</div>
        </div>
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 rounded-md p-1 hover:bg-neutral-200 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    )
  }
)

AlertBanner.displayName = 'AlertBanner'