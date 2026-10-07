interface StatusPillProps {
  label: string
  status: 'connected' | 'disconnected' | 'unknown'
  size?: 'sm' | 'md'
}

export function StatusPill({ label, status, size = 'md' }: StatusPillProps) {
  const configs = {
    connected: {
      dot: 'bg-vikasa-400',
      text: 'text-vikasa-300',
      bg: 'bg-vikasa-950/30 border-vikasa-500/20',
      label: 'connected',
    },
    disconnected: {
      dot: 'bg-red-400',
      text: 'text-red-300',
      bg: 'bg-red-950/30 border-red-500/20',
      label: 'disconnected',
    },
    unknown: {
      dot: 'bg-surface-400',
      text: 'text-surface-500',
      bg: 'bg-surface-300 border-surface-400',
      label: 'unknown',
    },
  }

  const config = configs[status]
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[0.70rem] gap-1',
    md: 'px-3 py-1.5 text-xs gap-1.5',
  }

  return (
    <div className={`inline-flex items-center ${config.bg} border rounded-full ${sizeClasses[size]}`}>
      <span className={`relative flex h-1.5 w-1.5 ${config.dot} rounded-full`} aria-hidden="true" />
      <span className={`font-medium ${config.text}`}>{config.label}</span>
      <span className="font-medium uppercase tracking-[0.1em] text-surface-500">{label}</span>
    </div>
  )
}