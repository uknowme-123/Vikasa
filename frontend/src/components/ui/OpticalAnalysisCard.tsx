import { forwardRef, type HTMLAttributes } from 'react'
import { ArrowRight, Aperture } from 'lucide-react'
import { Badge } from './Badge'

interface OpticalAnalysisCardProps extends HTMLAttributes<HTMLDivElement> {
  redReflectance?: number | null
  nirReflectance?: number | null
  ndvi?: number | null
  redRaw?: number | null
  nirRaw?: number | null
  calibrated?: boolean
  className?: string
}

const formatValue = (value: number | null | undefined, suffix = '', decimals = 2) =>
  value == null ? 'Unavailable' : `${value.toFixed(decimals)}${suffix ? ` ${suffix}` : ''}`

export const OpticalAnalysisCard = forwardRef<HTMLDivElement, OpticalAnalysisCardProps>(
  ({ className = '', redReflectance, nirReflectance, ndvi, redRaw, nirRaw, calibrated = false, ...props }, ref) => {
    const hasReflectance = redReflectance != null && nirReflectance != null

    return (
      <div ref={ref} className={`card-raised ${className}`} {...props}>
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <p className="sensor-label text-optical-nir-400">OPTICAL ANALYSIS</p>
              <h2 className="mt-1 text-lg font-semibold text-surface-950">RED + NIR signal</h2>
            </div>
            <Badge variant={calibrated ? 'success' : 'warning'}>
              {calibrated ? 'Calibrated path available' : 'Calibration required'}
            </Badge>
          </div>
        </div>

        <div className="card-body">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center mb-8">
            <div className="rounded-2xl border border-optical-red-500/25 bg-optical-red-950/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-optical-red-300">RED CHANNEL</span>
                <span className="font-mono text-xs text-optical-red-400">~660 nm</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500">Raw ADC</span>
                  <span className="font-mono text-sm text-surface-950">{formatValue(redRaw, 'ADC', 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500">Reflectance</span>
                  <span className="font-mono text-sm text-surface-950">{formatValue(redReflectance, '%')}</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-surface-500">Reflectance measurement acquired separately</p>
            </div>

            <ArrowRight className="hidden text-surface-500 md:block" aria-hidden="true" />

            <div className="rounded-2xl border border-optical-nir-500/25 bg-optical-nir-950/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-optical-nir-300">NIR CHANNEL</span>
                <span className="font-mono text-xs text-optical-nir-400">~850 nm</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500">Raw ADC</span>
                  <span className="font-mono text-sm text-surface-950">{formatValue(nirRaw, 'ADC', 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500">Reflectance</span>
                  <span className="font-mono text-sm text-surface-950">{formatValue(nirReflectance, '%')}</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-surface-500">Reference and geometry remain part of calibration</p>
            </div>

            <ArrowRight className="hidden text-surface-500 md:block" aria-hidden="true" />

            <div className="rounded-2xl border border-vikasa-500/25 bg-vikasa-950/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-vikasa-300">{calibrated ? 'NDVI' : 'RAW NDVI ESTIMATE'}</span>
                <Aperture className="h-4 w-4 text-vikasa-400" aria-hidden="true" />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500">Plant Signal</span>
                  <span className={`font-mono text-lg font-semibold ${ndvi != null ? 'text-vikasa-400' : 'text-surface-500'}`}>
                    {formatValue(ndvi, 'NDVI', 3)}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-surface-500">{calibrated ? 'Displayed from calibrated reflectance' : 'Estimated from raw ADC counts'}</p>
            </div>
          </div>

          {hasReflectance && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-surface-500">
                <span className="h-px flex-1 bg-surface-300" />
                <span>CALIBRATION BOUNDARY</span>
                <span className="h-px flex-1 bg-surface-300" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-optical-red-500/20 bg-optical-red-950/15 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-optical-red-300">RED Reflectance</span>
                    <span className="font-mono text-sm text-surface-950">{formatValue(redReflectance, '%')}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-optical-nir-500/20 bg-optical-nir-950/15 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-optical-nir-300">NIR Reflectance</span>
                    <span className="font-mono text-sm text-surface-950">{formatValue(nirReflectance, '%')}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-vikasa-500/20 bg-vikasa-950/15 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-vikasa-300">NDVI</span>
                  <span className="font-mono text-sm text-surface-950">{formatValue(ndvi, 'NDVI', 3)}</span>
                </div>
              </div>
              <p className="pt-2 text-xs leading-5 text-surface-500">
                {calibrated ? 'Calibrated reflectance is available for this reading.' : 'Calibrated reflectance unavailable. NDVI is not displayed as valid.'}
              </p>
            </div>
          )}

          {!hasReflectance && (
            <div className="rounded-xl border border-surface-300 bg-surface-0/50 p-4 text-xs leading-5 text-surface-500 text-center">
              Raw ADC counts are not reflectance. The raw NDVI estimate is useful for debugging signal direction, not definitive plant health.
            </div>
          )}
        </div>
      </div>
    )
  }
)

OpticalAnalysisCard.displayName = 'OpticalAnalysisCard'
