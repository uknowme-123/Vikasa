import { useState } from 'react'
import { usePlantSummaries, usePlantReadings } from '../hooks/useSensorData'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Table, StatusBadge, StressBadge } from '../components/ui/Table'
import { SensorGrid, SensorCard } from '../components/charts/SensorCard'
import { TimeSeriesChart, MultiLineChart } from '../components/charts/TimeSeriesChart'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import type { PlantSummary, SensorReadingWithMeta } from '../types/sensor'
import { Search, Filter, ChevronDown, Leaf, Calendar, Eye } from 'lucide-react'

export function PlantMonitoring() {
  const { data: plants, isLoading } = usePlantSummaries()
  const [selectedPlant, setSelectedPlant] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const { data: plantReadings } = usePlantReadings(selectedPlant)

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading plant data">
        <Card className="animate-pulse"><CardBody className="h-24" /></Card>
        <Card className="animate-pulse"><CardBody className="h-64" /></Card>
      </div>
    )
  }

  const plantList = plants ?? []
  const filteredPlants = plantList.filter(
    (p) => p.plant_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.species?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handlePlantSelect = (plantId: string) => {
    setSelectedPlant(selectedPlant === plantId ? null : plantId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Plant Monitoring</h1>
          <p className="text-neutral-500 mt-1">Track individual plant health and measurement history</p>
        </div>
        <Badge variant="warning" className="demo-badge">Demo Data</Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <Leaf className="h-5 w-5 text-vikasa-600" />
            Registered Plants
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search plants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-64"
                aria-label="Search plants"
              />
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0">
          <Table
            data={filteredPlants}
            columns={[
              { key: 'plant_id', header: 'Plant ID' },
              { key: 'species', header: 'Species' },
              { key: 'readingCount', header: 'Readings', className: 'text-right' },
              { key: 'healthLabel', header: 'Health', render: (_v, row) => <StatusBadge value={row.healthLabel} /> },
              { key: 'stressType', header: 'Stress Type', render: (_v, row) => <StressBadge value={row.stress_type} /> },
              { key: 'lastUpdated', header: 'Last Reading', render: (v) => v ? new Date(v as string).toLocaleString() : '—' },
              {
                key: 'actions',
                header: '',
                render: (_v, row) => (
                  <button
                    onClick={() => handlePlantSelect(row.plant_id)}
                    className="text-vikasa-600 hover:text-vikasa-700 text-sm font-medium flex items-center gap-1"
                    aria-label={selectedPlant === row.plant_id ? 'Collapse details' : 'View details'}
                  >
                    <Eye className="h-4 w-4" />
                    {selectedPlant === row.plant_id ? 'Hide' : 'View'}
                  </button>
                ),
              },
            ]}
            keyExtractor={(row) => row.plant_id}
            emptyMessage="No plants found"
          />
        </CardBody>
      </Card>

      {selectedPlant && (
        <div className="space-y-6 animate-slide-down">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-vikasa-100 flex items-center justify-center">
                  <Leaf className="h-6 w-6 text-vikasa-700" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900">{selectedPlant}</h3>
                  <p className="text-sm text-neutral-500">
                    {plantList.find((p) => p.plant_id === selectedPlant)?.species ?? 'Unknown species'}
                  </p>
                </div>
              </div>
              <Badge variant="warning" className="demo-badge">Demo Data</Badge>
            </CardHeader>
            <CardBody className="pt-0">
              <SensorGrid readings={plantReadings ?? []} plantId={selectedPlant} />

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <TimeSeriesChart
                  data={plantReadings ?? []}
                  field="temperature_c"
                  title="Temperature History"
                  unit="°C"
                  color="#dc2626"
                  height={250}
                />
                <TimeSeriesChart
                  data={plantReadings ?? []}
                  field="humidity_pct"
                  title="Humidity History"
                  unit="%"
                  color="#2563eb"
                  height={250}
                />
                <TimeSeriesChart
                  data={plantReadings ?? []}
                  field="soil_moisture_pct"
                  title="Soil Moisture History"
                  unit="%"
                  color="#16a34a"
                  height={250}
                />
                <TimeSeriesChart
                  data={plantReadings ?? []}
                  field="ambient_light_raw"
                  title="Ambient Light"
                  unit="ADC"
                  color="#7c2d12"
                  height={250}
                />
              </div>

              {plantReadings && plantReadings.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-neutral-900 mb-3">Measurement History</h4>
                  <Table
                    data={plantReadings.slice().reverse()}
                    columns={[
                      { key: 'timestamp', header: 'Timestamp', render: (v) => new Date(v as string).toLocaleString() },
                      { key: 'temperature_c', header: 'Temp (°C)', render: (v) => v !== undefined ? `${v.toFixed(1)}°C` : '—' },
                      { key: 'humidity_pct', header: 'Humidity (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : '—' },
                      { key: 'soil_moisture_pct', header: 'Soil Moisture (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : '—' },
                      { key: 'red_raw', header: 'Red Raw', render: (v) => v !== undefined ? String(v) : '—' },
                      { key: 'nir_raw', header: 'NIR Raw', render: (v) => v !== undefined ? String(v) : '—' },
                      { key: 'red_reflectance', header: 'Red Refl. (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : 'Not calibrated' },
                      { key: 'nir_reflectance', header: 'NIR Refl. (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : 'Not calibrated' },
                      { key: 'ndvi', header: 'NDVI', render: (v) => v !== undefined ? v.toFixed(3) : '—' },
                      { key: 'health_label', header: 'Health', render: (_v, row) => <StatusBadge value={row.health_label} /> },
                      { key: 'notes', header: 'Notes', render: (v) => v as string || '—' },
                    ]}
                    keyExtractor={(row, i) => `${row.plant_id}-${i}`}
                    emptyMessage="No readings for this plant"
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}