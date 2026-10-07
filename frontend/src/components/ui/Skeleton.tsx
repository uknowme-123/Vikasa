import { forwardRef, type HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'title' | 'value' | 'card' | 'circular' | 'rectangular'
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className = '', variant = 'rectangular', ...props }, ref) => {
    const variantClasses = {
      text: 'skeleton-text',
      title: 'skeleton-title',
      value: 'skeleton-value',
      card: 'skeleton h-32 w-full rounded-xl',
      circular: 'skeleton h-10 w-10 rounded-full',
      rectangular: 'skeleton h-4 w-full rounded',
    }

    return (
      <div
        ref={ref}
        className={`${variantClasses[variant]} ${className}`}
        aria-hidden="true"
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

export function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="card-header">
        <Skeleton variant="title" />
        <Skeleton variant="text" className="mt-2 w-1/4" />
      </div>
      <div className="card-body">
        <Skeleton variant="value" />
        <Skeleton variant="text" className="mt-4 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonMetric() {
  return (
    <div className="card animate-pulse">
      <div className="card-body">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="value" className="mt-3" />
        <Skeleton variant="text" className="mt-2 w-1/4" />
      </div>
    </div>
  )
}

export function SkeletonTable(rows = 5) {
  return (
    <div className="table-container animate-pulse">
      <table className="table">
        <thead>
          <tr>
            <th><Skeleton variant="text" className="w-20" /></th>
            <th><Skeleton variant="text" className="w-24" /></th>
            <th><Skeleton variant="text" className="w-16" /></th>
            <th><Skeleton variant="text" className="w-20" /></th>
            <th><Skeleton variant="text" className="w-16" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><Skeleton variant="text" className="w-24" /></td>
              <td><Skeleton variant="text" className="w-20" /></td>
              <td><Skeleton variant="text" className="w-12" /></td>
              <td><Skeleton variant="text" className="w-16" /></td>
              <td><Skeleton variant="text" className="w-12" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}