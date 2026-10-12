import { forwardRef, type HTMLAttributes } from 'react'
import { AlertTriangle, CheckCircle, Info, Minus, Droplets, Thermometer, Leaf, Sun, Radio } from 'lucide-react'
import { Badge } from './Badge'

interface StressAnalysisCardProps extends HTMLAttributes<HTMLDivElement> {
  ndvi?: number | null
  soilMoisture?: number | null
  temperature?: number | null
  humidity?: number | null
  redReflectance?: number | null
  nirReflectance?: number | null
  calibrated?: boolean
  className?: string
}

const formatValue = (value: number | null | undefined, unit = '', decimals = 1) =>
  value == null ? 'Unavailable' : `${value.toFixed(decimals)}${unit ? ` ${unit}` : ''}`

type ThresholdRange = { min: number; max: number }
type IndicatorThreshold = {
  healthy: number | ThresholdRange
  moderate: number | ThresholdRange
}
type IndicatorKey = 'ndvi' | 'soilMoisture' | 'temperature' | 'humidity'

const indicators: {
  key: IndicatorKey
  label: string
  unit: string
  icon: typeof Leaf
  color: string
  bg: string
  border: string
  threshold: IndicatorThreshold
}[] = [
  { key: 'ndvi', label: 'NDVI', unit: 'NDVI', icon: Leaf, color: 'text-vikasa-400', bg: 'bg-vikasa-950/20', border: 'border-vikasa-500/20', threshold: { healthy: 0.5, moderate: 0.2 } },
  { key: 'soilMoisture', label: 'Soil Moisture', unit: '%', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-950/20', border: 'border-blue-500/20', threshold: { healthy: 40, moderate: 20 } },
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer, color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-500/20', threshold: { healthy: { min: 18, max: 30 }, moderate: { min: 10, max: 38 } } },
  { key: 'humidity', label: 'Humidity', unit: '%', icon: Sun, color: 'text-optical-nir-400', bg: 'bg-optical-nir-950/20', border: 'border-optical-nir-500/20', threshold: { healthy: { min: 40, max: 80 }, moderate: { min: 20, max: 90 } } },
]

function assessIndicator(value: number | null | undefined, threshold: IndicatorThreshold): 'healthy' | 'moderate' | 'stressed' | 'unknown' {
  if (value == null) return 'unknown'
  if (typeof threshold.healthy !== 'number' && typeof threshold.moderate !== 'number') {
    if (value >= threshold.healthy.min && value <= threshold.healthy.max) return 'healthy'
    if (value >= threshold.moderate.min && value <= threshold.moderate.max) return 'moderate'
    return 'stressed'
  }
  if (typeof threshold.healthy === 'number' && typeof threshold.moderate === 'number') {
    if (value >= threshold.healthy) return 'healthy'
    if (value >= threshold.moderate) return 'moderate'
  }
  return 'stressed'
}

const statusConfig = {
  healthy: { label: 'Optimal', color: 'text-vikasa-400', icon: CheckCircle },
  moderate: { label: 'Caution', color: 'text-amber-400', icon: AlertTriangle },
  stressed: { label: 'Stress', color: 'text-red-400', icon: AlertTriangle },
  unknown: { label: 'No Data', color: 'text-surface-500', icon: Minus },
}

export const StressAnalysisCard = forwardRef<HTMLDivElement, StressAnalysisCardProps>(
  ({ className = '', ndvi, soilMoisture, temperature, humidity, redReflectance: _redReflectance, nirReflectance: _nirReflectance, calibrated = false, ...props }, ref) => {
    const values = { ndvi, soilMoisture, temperature, humidity }
    const availableCount = Object.values(values).filter(v => v != null).length
    const hasEnoughData = availableCount >= 3

    return (
      <div ref={ref} className={`card-raised ${className}`} {...props}>
        <div className="card-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="sensor-label text-amber-400/80">STRESS ANALYSIS</p>
            <h2 className="mt-1 text-lg font-semibold text-surface-950">Measurable Indicators</h2>
          </div>
          <Badge variant={calibrated ? 'success' : 'warning'}>
            {calibrated ? 'Calibrated data available' : 'Limited data'}
          </Badge>
        </div>

        <div className="card-body space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {indicators.map(({ key, label, unit, icon: Icon, color, bg, border, threshold }) => {
              const value = values[key]
              const status = assessIndicator(value, threshold)
              const config = statusConfig[status]
              return (
                <div key={key} className={`rounded-xl border p-4 ${bg} ${border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} aria-hidden="true" />
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">{label}</span>
                    </div>
                    <span className="font-mono text-sm text-surface-950">{formatValue(value, unit, key === 'ndvi' ? 3 : 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <config.icon className={`h-4 w-4 ${config.color}`} aria-hidden="true" />
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {!hasEnoughData && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-amber-400 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Insufficient data for stress assessment</p>
                  <p className="mt-1 text-xs text-surface-500">
                    Need at least 3 of 4 indicators (NDVI, soil moisture, temperature, humidity).
                    Currently have {availableCount}/4 available.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasEnoughData && !calibrated && (
            <div className="rounded-xl border border-optical-nir-500/20 bg-optical-nir-950/20 p-4">
              <div className="flex items-center gap-3">
                <Radio className="h-5 w-5 text-optical-nir-400 flex-shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-optical-nir-300">Optical calibration pending</p>
                  <p className="mt-1 text-xs text-surface-500">
                    RED/NIR reflectance calibration required for validated NDVI-based stress analysis.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-surface-300/50">
            <p className="text-xs leading-5 text-surface-500">
              <strong className="text-surface-950">Assessment basis:</strong> This analysis uses only measurable sensor data from the current reading.
              No ML model or inferred stress score is applied. Thresholds are general agronomic references, not validated for specific crops.
            </p>
          </div>
        </div>
      </div>
    )
  }
)

StressAnalysisCard.displayName = 'StressAnalysisCard'