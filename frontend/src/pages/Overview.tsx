import { useReadings, usePlantSummaries } from '../hooks/useSensorData'
import { SensorGrid, SensorCard } from '../components/charts/SensorCard'
import { TimeSeriesChart, MultiLineChart } from '../components/charts/TimeSeriesChart'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import type { SensorReadingWithMeta, PlantSummary } from '../types/sensor'
import { Clock, Thermometer, Droplet, Zap, Leaf, TrendingUp } from 'lucide-react'

export function Overview() {
  const { data: readings, isLoading: readingsLoading, error: readingsError } = useReadings()
  const { data: plants, isLoading: plantsLoading } = usePlantSummaries()

  if (readingsLoading || plantsLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading dashboard">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardBody className="h-24" />
          </Card>
        ))}
      </div>
    )
  }

  if (readingsError) {
    return (
      <AlertBanner variant="danger" title="Failed to load data">
        Unable to fetch sensor readings. Please check your connection and try again.
      </AlertBanner>
    )
  }

  const latestReadings = readings ?? []
  const plantSummaries = plants ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Overview</h1>
          <p className="text-neutral-500 mt-1">Real-time plant stress monitoring dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="demo-badge">
            Demo Data
          </Badge>
        </div>
      </div>

      <AlertBanner variant="info" className="text-sm">
        <span className="font-medium">Note:</span> This dashboard displays simulated demonstration data. No actual Vikāsa hardware is connected. Sensor readings, reflectance values, and NDVI calculations are for interface demonstration only.
      </AlertBanner>

      <SensorGrid readings={latestReadings} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-vikasa-600" />
              Environmental Trends (Last 24h)
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <MultiLineChart
              data={latestReadings}
              fields={[
                { key: 'temperature_c', label: 'Temperature (°C)', color: '#dc2626', unit: '°C' },
                { key: 'humidity_pct', label: 'Humidity (%)', color: '#2563eb', unit: '%' },
                { key: 'soil_moisture_pct', label: 'Soil Moisture (%)', color: '#16a34a', unit: '%' },
              ]}
              title=""
              height={300}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Leaf className="h-5 w-5 text-vikasa-600" />
              Plant Status Summary
            </h3>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-4">
              {plantSummaries.map((plant) => (
                <div key={plant.plant_id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-vikasa-100 flex items-center justify-center">
                      <Leaf className="h-5 w-5 text-vikasa-700" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">{plant.plant_id}</p>
                      <p className="text-sm text-neutral-500">{plant.species ?? 'Unknown species'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-sm text-neutral-500">Readings</p>
                      <p className="font-semibold text-neutral-900">{plant.readingCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500">Health</p>
                      <Badge variant={
                        plant.healthLabel === 'healthy' ? 'success' :
                        plant.healthLabel === 'mild' ? 'info' :
                        plant.healthLabel === 'moderate' ? 'warning' :
                        plant.healthLabel === 'severe' ? 'danger' : 'neutral'
                      }>
                        {plant.healthLabel ?? 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {plantSummaries.length === 0 && (
                <p className="text-center text-neutral-500 py-8">No plant data available</p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TimeSeriesChart
          data={latestReadings}
          field="temperature_c"
          title="Temperature"
          unit="°C"
          color="#dc2626"
          height={250}
        />
        <TimeSeriesChart
          data={latestReadings}
          field="humidity_pct"
          title="Humidity"
          unit="%"
          color="#2563eb"
          height={250}
        />
        <TimeSeriesChart
          data={latestReadings}
          field="soil_moisture_pct"
          title="Soil Moisture"
          unit="%"
          color="#16a34a"
          height={250}
        />
      </div>
    </div>
  )
}