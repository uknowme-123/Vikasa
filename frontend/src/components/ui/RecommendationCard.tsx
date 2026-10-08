import { forwardRef, type HTMLAttributes } from 'react'
import { CheckCircle, AlertTriangle, Info, Leaf, Droplets, Thermometer, Sun, Radio, Zap } from 'lucide-react'
import { Badge } from './Badge'

interface RecommendationCardProps extends HTMLAttributes<HTMLDivElement> {
  ndvi?: number | null
  soilMoisture?: number | null
  temperature?: number | null
  humidity?: number | null
  redReflectance?: number | null
  nirReflectance?: number | null
  calibrated?: boolean
  healthLabel?: string
  className?: string
}

interface Recommendation {
  id: string
  type: 'positive' | 'warning' | 'info'
  title: string
  detail: string
  icon: React.ReactNode
}

function generateRecommendations(
  ndvi?: number | null,
  soilMoisture?: number | null,
  temperature?: number | null,
  humidity?: number | null,
  redReflectance?: number | null,
  nirReflectance?: number | null,
  calibrated?: boolean,
  healthLabel?: string
): Recommendation[] {
  const recs: Recommendation[] = []

  if (calibrated && ndvi != null) {
    if (ndvi >= 0.5) {
      recs.push({
        id: 'ndvi-healthy',
        type: 'positive',
        title: 'Plant condition stable',
        detail: `NDVI of ${ndvi.toFixed(3)} indicates healthy vegetation with strong photosynthetic activity.`,
        icon: <Leaf className="h-4 w-4 text-vikasa-400" />,
      })
    } else if (ndvi >= 0.2) {
      recs.push({
        id: 'ndvi-moderate',
        type: 'warning',
        title: 'Moderate vegetation vigor',
        detail: `NDVI of ${ndvi.toFixed(3)} suggests reduced canopy density or early stress. Monitor progression.`,
        icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
      })
    } else {
      recs.push({
        id: 'ndvi-stressed',
        type: 'warning',
        title: 'Low vegetation index',
        detail: `NDVI of ${ndvi.toFixed(3)} indicates potential stress. Verify with ground truth and check environmental factors.`,
        icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
      })
    }
  } else if (ndvi != null) {
    recs.push({
      id: 'ndvi-uncalibrated',
      type: 'info',
      title: 'NDVI available but uncalibrated',
      detail: 'Raw optical data present but calibrated reflectance required for validated NDVI interpretation.',
      icon: <Radio className="h-4 w-4 text-optical-nir-400" />,
    })
  }

  if (soilMoisture != null) {
    if (soilMoisture < 20) {
      recs.push({
        id: 'soil-dry',
        type: 'warning',
        title: 'Soil moisture critically low',
        detail: `Soil moisture at ${soilMoisture.toFixed(0)}% — below typical wilting point. Irrigation recommended if crop stage permits.`,
        icon: <Droplets className="h-4 w-4 text-red-400" />,
      })
    } else if (soilMoisture < 40) {
      recs.push({
        id: 'soil-low',
        type: 'warning',
        title: 'Soil moisture below optimal',
        detail: `Soil moisture at ${soilMoisture.toFixed(0)}% — monitor for crop water stress, especially during peak evapotranspiration.`,
        icon: <Droplets className="h-4 w-4 text-amber-400" />,
      })
    } else {
      recs.push({
        id: 'soil-adequate',
        type: 'positive',
        title: 'Soil moisture adequate',
        detail: `Soil moisture at ${soilMoisture.toFixed(0)}% — within typical optimal range for most crops.`,
        icon: <Droplets className="h-4 w-4 text-vikasa-400" />,
      })
    }
  }

  if (temperature != null) {
    if (temperature > 35) {
      recs.push({
        id: 'temp-high',
        type: 'warning',
        title: 'High temperature stress risk',
        detail: `Temperature at ${temperature.toFixed(1)}°C — may cause heat stress. Consider shading or increased irrigation.`,
        icon: <Thermometer className="h-4 w-4 text-red-400" />,
      })
    } else if (temperature < 10) {
      recs.push({
        id: 'temp-low',
        type: 'warning',
        title: 'Low temperature risk',
        detail: `Temperature at ${temperature.toFixed(1)}°C — risk of cold stress for sensitive crops.`,
        icon: <Thermometer className="h-4 w-4 text-blue-400" />,
      })
    } else {
      recs.push({
        id: 'temp-optimal',
        type: 'positive',
        title: 'Temperature within optimal range',
        detail: `Temperature at ${temperature.toFixed(1)}°C — favorable for most crop metabolic processes.`,
        icon: <Thermometer className="h-4 w-4 text-vikasa-400" />,
      })
    }
  }

  if (humidity != null) {
    if (humidity > 85) {
      recs.push({
        id: 'humidity-high',
        type: 'warning',
        title: 'High humidity — disease risk',
        detail: `Relative humidity at ${humidity.toFixed(0)}% — favorable for fungal disease development. Ensure air circulation.`,
        icon: <Droplets className="h-4 w-4 text-amber-400" />,
      })
    } else if (humidity < 30) {
      recs.push({
        id: 'humidity-low',
        type: 'info',
        title: 'Low humidity — increased transpiration',
        detail: `Relative humidity at ${humidity.toFixed(0)}% — may increase water demand. Monitor soil moisture closely.`,
        icon: <Sun className="h-4 w-4 text-optical-nir-400" />,
      })
    }
  }

  if (!calibrated && (redReflectance != null || nirReflectance != null)) {
    recs.push({
      id: 'optical-pending',
      type: 'info',
      title: 'Optical calibration pending',
      detail: 'Raw optical counts available. Complete reference measurements to enable calibrated reflectance and NDVI.',
      icon: <Zap className="h-4 w-4 text-optical-nir-400" />,
    })
  }

  if (healthLabel && healthLabel.toLowerCase() === 'healthy') {
    recs.push({
      id: 'health-positive',
      type: 'positive',
      title: 'Plant health status: healthy',
      detail: 'Current indicators align with healthy plant baseline. Continue monitoring.',
      icon: <CheckCircle className="h-4 w-4 text-vikasa-400" />,
    })
  }

  return recs.length > 0 ? recs : [{
    id: 'no-recommendations',
    type: 'info',
    title: 'No recommendations available',
    detail: 'Insufficient sensor data to generate actionable recommendations. Ensure all sensors are reporting and calibration is complete.',
    icon: <Info className="h-4 w-4 text-surface-500" />,
  }]
}

export const RecommendationCard = forwardRef<HTMLDivElement, RecommendationCardProps>(
  ({ className = '', ndvi, soilMoisture, temperature, humidity, redReflectance, nirReflectance, calibrated = false, healthLabel, ...props }, ref) => {
    const recommendations = generateRecommendations(ndvi, soilMoisture, temperature, humidity, redReflectance, nirReflectance, calibrated, healthLabel)

    return (
      <div ref={ref} className={`card-raised ${className}`} {...props}>
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <p className="sensor-label text-vikasa-400/80">RECOMMENDATIONS</p>
              <h2 className="mt-1 text-lg font-semibold text-surface-950">Actionable Insights</h2>
            </div>
            <Badge variant={calibrated ? 'success' : 'warning'}>
              {calibrated ? 'Calibrated data' : 'Limited data'}
            </Badge>
          </div>
        </div>

        <div className="card-body space-y-3">
          {recommendations.map((rec) => (
            <div key={rec.id} className="flex gap-3 p-4 rounded-xl border transition-colors duration-150 hover:border-surface-300/50"
              style={{
                backgroundColor: rec.type === 'positive' ? 'rgb(34 197 94 / 0.08)' :
                  rec.type === 'warning' ? 'rgb(250 204 21 / 0.08)' :
                  'rgb(56 189 248 / 0.08)',
                borderColor: rec.type === 'positive' ? 'rgb(34 197 94 / 0.2)' :
                  rec.type === 'warning' ? 'rgb(250 204 21 / 0.2)' :
                  'rgb(56 189 248 / 0.2)',
              }}
            >
              <div className="flex-shrink-0 mt-0.5">
                {rec.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                    rec.type === 'positive' ? 'text-vikasa-400' :
                    rec.type === 'warning' ? 'text-amber-400' :
                    'text-optical-nir-400'
                  }`}>
                    {rec.type === 'positive' ? '✓ Optimal' : rec.type === 'warning' ? '⚠ Monitor' : 'ℹ Info'}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-medium text-surface-950">{rec.title}</h3>
                <p className="mt-1 text-xs leading-5 text-surface-500">{rec.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
)

RecommendationCard.displayName = 'RecommendationCard'