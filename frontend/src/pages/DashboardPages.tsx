import { useState } from 'react'
import { Activity, AlertTriangle, Bell, CheckCircle2, Clock3, Cpu, Database, Droplets, FileText, Gauge, Info, Leaf, Radio, Search, ShieldAlert, Sun, Thermometer, Upload, Waves, WifiOff } from 'lucide-react'
import { useAlerts, usePlants, useReadings, useStatus } from '../hooks/useSensorData'
import { getDataProvider } from '../services/api'
import { displayValue, getRawNDVIEstimate, hasCalibratedReflectance, type AlertItem, type CSVValidationResult, type SensorReadingWithMeta } from '../types/sensor'
import { AlertBanner } from '../components/ui/AlertBanner'
import { Badge } from '../components/ui/Badge'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { MetricCard } from '../components/ui/MetricCard'
import { StatusPill } from '../components/ui/StatusPill'
import { NDVICard } from '../components/ui/NDVICard'
import { OpticalAnalysisCard } from '../components/ui/OpticalAnalysisCard'
import { PlantStatusCard } from '../components/ui/PlantStatusCard'
import { StressAnalysisCard } from '../components/ui/StressAnalysisCard'
import { RecommendationCard } from '../components/ui/RecommendationCard'
import { AlertCard } from '../components/ui/AlertCard'

const latest = (items: SensorReadingWithMeta[]) => [...items].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]
function DemoNotice() { return <AlertBanner variant="warning" title="DEMO DATA">Simulated values are shown for interface demonstration only. No physical hardware, Firebase project, or validated ML result is connected.</AlertBanner> }
function statusBadge(value?: string | null) { return <Badge variant={value === 'healthy' || value === 'connected' ? 'success' : value === 'severe' || value === 'disconnected' ? 'danger' : value === 'unknown' ? 'neutral' : 'warning'}>{value ?? 'Not available'}</Badge> }
function overviewStatus(value: 'connected' | 'disconnected' | 'unknown' | undefined) {
  return value ?? 'unknown'
}
export function Overview() {
  const { data: readings = [], isLoading, error } = useReadings()
  const { data: plants = [] } = usePlants()
  const { data: alerts = [] } = useAlerts()
  const { data: systemStatus } = useStatus()
  const providerMode = getDataProvider().mode
  const item = latest(readings)
  const calibrated = item ? hasCalibratedReflectance(item) : false
  const ndvi = calibrated ? item?.ndvi : getRawNDVIEstimate(item)

  if (isLoading) return <Loading title="Loading overview" />
  if (error) return <ErrorState />

  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-4 border-b border-surface-300/60 pb-5 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vikasa-400">Plant intelligence / overview</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-950 sm:text-4xl">Plant overview</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-600">A clear view of plant health, optical response, and growing conditions.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={providerMode === 'demo' ? 'warning' : 'info'}>{providerMode === 'demo' ? 'Demo data' : 'API data'}</Badge>
        <StatusPill label="API" status={overviewStatus(systemStatus?.api)} size="sm" />
        <StatusPill label="GLYPH C3" status={overviewStatus(systemStatus?.esp32)} size="sm" />
      </div>
    </div>

    {providerMode === 'demo' && <DemoNotice />}

    <section aria-label="Plant health" className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
      <NDVICard
        value={ndvi}
        label={calibrated ? 'Plant Health' : 'Raw NDVI Estimate'}
        subtitle={calibrated ? undefined : 'Estimated from raw RED + NIR ADC counts'}
        calibrated={calibrated}
        className="min-h-[300px] border-vikasa-500/20 shadow-glow-green"
      />
      <div className="card flex flex-col justify-between">
        <div className="card-header">
          <p className="sensor-label text-vikasa-400">LATEST READING</p>
          <h2 className="mt-1 text-lg font-semibold text-surface-950">Measurement context</h2>
        </div>
        <div className="card-body space-y-5">
          <div>
            <p className="sensor-label">Plant</p>
            <p className="mt-1 font-mono text-xl font-semibold text-surface-950">{item?.plant_id ?? 'Unavailable'}</p>
            <p className="mt-1 text-sm text-surface-600">{item?.species ?? 'Species unavailable'}</p>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-surface-300/60 pt-4">
            <span className="text-sm text-surface-600">Health classification</span>
            {statusBadge(item?.health_label)}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-surface-300/60 pt-4 text-xs text-surface-600">
            <span>{readings.length} available reading{readings.length === 1 ? '' : 's'}</span>
            <span className="text-right">{item ? new Date(item.timestamp).toLocaleString() : 'Awaiting reading'}</span>
          </div>
        </div>
      </div>
    </section>

    <section aria-labelledby="environment-heading" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="sensor-label text-surface-600">GROWING CONDITIONS</p>
          <h2 id="environment-heading" className="mt-1 text-lg font-semibold text-surface-950">Environment</h2>
        </div>
        <span className="text-xs text-surface-600">Latest sensor values</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Temperature" value={item?.temperature_c} unit="°C" precision={1} iconColor="amber" icon={<Thermometer className="h-5 w-5" />} />
        <MetricCard label="Humidity" value={item?.humidity_pct} unit="%" precision={0} iconColor="blue" icon={<Droplets className="h-5 w-5" />} />
        <MetricCard label="Soil moisture raw" value={item?.soil_moisture_raw} unit="ADC" precision={0} iconColor="green" icon={<Gauge className="h-5 w-5" />} />
        <MetricCard label="Ambient light" value={item?.ambient_light_raw} unit="ADC" precision={0} iconColor="violet" icon={<Sun className="h-5 w-5" />} />
      </div>
    </section>

    <section aria-label="Optical sensing and plant status" className="grid gap-5 2xl:grid-cols-2">
      <OpticalAnalysisCard
        redReflectance={item?.red_reflectance}
        nirReflectance={item?.nir_reflectance}
        redRaw={item?.red_raw}
        nirRaw={item?.nir_raw}
        ndvi={ndvi}
        calibrated={calibrated}
      />
      {item ? (
        <PlantStatusCard
          plantId={item.plant_id}
          species={item.species}
          sessionId={item.session_id}
          ndvi={ndvi}
          healthLabel={item.health_label}
          temperature={item.temperature_c}
          humidity={item.humidity_pct}
          soilMoisture={item.soil_moisture_raw}
          ambientLight={item.ambient_light_raw}
          readingCount={plants.find((plant) => plant.plant_id === item.plant_id)?.readingCount}
          lastUpdated={item.timestamp}
          calibrated={calibrated}
        />
      ) : <Empty text="Plant status will appear when a sensor reading is available." />}
    </section>

    <section aria-label="Plant condition analysis" className="grid gap-5 2xl:grid-cols-2">
      <StressAnalysisCard
        ndvi={ndvi}
        soilMoisture={item?.soil_moisture_pct}
        temperature={item?.temperature_c}
        humidity={item?.humidity_pct}
        redReflectance={item?.red_reflectance}
        nirReflectance={item?.nir_reflectance}
        calibrated={calibrated}
      />
      {item ? (
        <RecommendationCard
          ndvi={ndvi}
          soilMoisture={item.soil_moisture_pct}
          temperature={item.temperature_c}
          humidity={item.humidity_pct}
          redReflectance={item.red_reflectance}
          nirReflectance={item.nir_reflectance}
          calibrated={calibrated}
          healthLabel={item.health_label}
        />
      ) : <Empty text="Recommendations require a sensor reading." />}
    </section>

    <section aria-labelledby="overview-alerts" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="sensor-label text-surface-600">MONITORING</p>
          <h2 id="overview-alerts" className="mt-1 text-lg font-semibold text-surface-950">Recent alerts</h2>
        </div>
        <span className="text-xs text-surface-600">{alerts.length} available</span>
      </div>
      {alerts.length ? (
        <div className="space-y-3">
          {alerts.slice(0, 3).map((alert) => <AlertCard key={alert.id} alert={alert} />)}
        </div>
      ) : <Empty text="No alerts available." />}
    </section>
  </div>
}
export function PlantMonitoring() {
  const { data: plants = [], isLoading, error } = usePlants()
  const { data: readings = [], isLoading: readingsLoading } = useReadings()
  const [selected, setSelected] = useState('')
  const selectedPlant = plants.find((plant) => plant.plant_id === selected)
  const plantReadings = readings.filter((item) => item.plant_id === selected)
  const selectedReading = latest(plantReadings)
  const selectedCalibrated = selectedReading ? hasCalibratedReflectance(selectedReading) : false
  const selectedNdvi = selectedCalibrated ? selectedReading?.ndvi : getRawNDVIEstimate(selectedReading)
  const pageTimestamp = selectedReading ? new Date(selectedReading.timestamp).toLocaleString() : plants.find((plant) => plant.lastUpdated)?.lastUpdated ? new Date(plants.find((plant) => plant.lastUpdated)?.lastUpdated ?? '').toLocaleString() : 'Awaiting plant reading'
  const providerMode = getDataProvider().mode

  if (error) return <ErrorState />

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vikasa-400">Plant monitoring</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-950 sm:text-4xl">Plants</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">Review plant-level records and available measurements without inferring unsupported health classifications.</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        <span>{pageTimestamp}</span>
      </div>
    </div>

    <DemoNotice />

    <Card variant="raised">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="sensor-label">Plant registry</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Available plants</h2></div>
        <Badge variant={providerMode === 'demo' ? 'warning' : 'info'}>{providerMode === 'demo' ? 'Demo data' : 'API data'}</Badge>
      </CardHeader>
      <CardBody>
        {isLoading ? <Loading title="Loading plants" /> : plants.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {plants.map((plant) => {
            const active = plant.plant_id === selected
            const plantLatest = latest(readings.filter((reading) => reading.plant_id === plant.plant_id))
            return <button key={plant.plant_id} type="button" onClick={() => setSelected(plant.plant_id)} className={`rounded-xl border p-4 text-left transition-colors ${active ? 'border-vikasa-400 bg-vikasa-950/20 shadow-[inset_3px_0_0_rgb(52_211_153)]' : 'border-surface-300 bg-surface-0/50 hover:border-vikasa-500/50 hover:bg-surface-0'}`} aria-pressed={active}>
              <div className="flex items-start justify-between gap-3"><span className="font-mono text-base font-semibold text-surface-950">{plant.plant_id}</span>{statusBadge(plant.healthLabel)}</div>
              <p className="mt-2 text-sm text-surface-500">{plant.species ?? 'Species unavailable'}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-surface-500"><span>{plant.readingCount} reading(s)</span><span>{plantLatest ? new Date(plantLatest.timestamp).toLocaleDateString() : plant.lastUpdated ? new Date(plant.lastUpdated).toLocaleDateString() : 'No timestamp'}</span></div>
            </button>
          })}
        </div> : <Empty text="No plants available." />}
      </CardBody>
    </Card>

    {selected && <section className="space-y-6" aria-label="Selected plant details">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="sensor-label">Selected plant</p><h2 className="mt-1 font-mono text-2xl font-semibold text-surface-950">{selected}</h2><p className="mt-1 text-sm text-surface-500">{selectedPlant?.species ?? 'Species unavailable'}</p></div>
          {selectedPlant && statusBadge(selectedPlant.healthLabel)}
        </CardHeader>
        <CardBody>
          {readingsLoading ? <Loading title="Loading selected plant" /> : selectedReading ? <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PlantValue label="Reading count" value={String(selectedPlant?.readingCount ?? plantReadings.length)} />
              <PlantValue label="Latest reading" value={new Date(selectedReading.timestamp).toLocaleString()} />
              <PlantValue label="Health status" value={selectedPlant?.healthLabel ?? selectedReading.health_label ?? 'Health status unavailable'} />
              <PlantValue label="Session" value={selectedReading.session_id} />
            </div>
            <div className="border-t border-surface-300 pt-5">
              <div className="grid gap-6 lg:grid-cols-2">
                <div><p className="sensor-label">Latest optical summary</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><PlantValue label="RED raw" value={selectedReading.red_raw == null ? 'Not available' : `${selectedReading.red_raw.toFixed(0)} ADC`} accent="red" /><PlantValue label="NIR raw" value={selectedReading.nir_raw == null ? 'Not available' : `${selectedReading.nir_raw.toFixed(0)} ADC`} accent="nir" /><PlantValue label={selectedCalibrated ? 'NDVI' : 'Raw NDVI Estimate'} value={selectedNdvi == null ? 'Not available' : selectedNdvi.toFixed(3)} accent="green" /></div><p className="mt-3 text-xs text-surface-500">{selectedCalibrated ? 'Calibrated reflectance available.' : 'Raw estimate only; calibrated NDVI requires reflectance.'}</p></div>
                <div><p className="sensor-label">Latest environment summary</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><PlantValue label="Temperature" value={selectedReading.temperature_c == null ? 'Not available' : `${selectedReading.temperature_c.toFixed(1)} °C`} /><PlantValue label="Humidity" value={selectedReading.humidity_pct == null ? 'Not available' : `${selectedReading.humidity_pct.toFixed(0)} %`} /><PlantValue label="Soil moisture raw" value={selectedReading.soil_moisture_raw == null ? 'Not available' : `${selectedReading.soil_moisture_raw.toFixed(0)} ADC`} /><PlantValue label="Ambient light raw" value={selectedReading.ambient_light_raw == null ? 'Not available' : `${selectedReading.ambient_light_raw.toFixed(0)} ADC`} /></div></div>
              </div>
            </div>
          </div> : <Empty text="No readings available for this plant." />}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between"><div><p className="sensor-label">Reading history</p><h2 className="mt-1 text-lg font-semibold text-surface-950">{selected} records</h2></div><span className="text-xs text-surface-500">{plantReadings.length} reading{plantReadings.length === 1 ? '' : 's'}</span></CardHeader>
        <CardBody><ReadingTable readings={plantReadings} /></CardBody>
      </Card>
    </section>}
  </div>
}
export function OpticalSensing() {
  const { data: readings = [], isLoading, error } = useReadings()
  const item = latest(readings)
  const calibrated = item ? hasCalibratedReflectance(item) : false
  const ndvi = calibrated ? item?.ndvi : getRawNDVIEstimate(item)
  const redReflectance = item?.red_reflectance
  const nirReflectance = item?.nir_reflectance
  const latestTimestamp = item ? new Date(item.timestamp).toLocaleString() : 'Awaiting optical reading'

  if (isLoading) return <Loading title="Loading optical sensing" />
  if (error) return <ErrorState />

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-optical-nir-400">Spectroscopy / signal chain</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-950 sm:text-4xl">Optical Sensing</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">Separate RED and NIR responses, preserve raw acquisition, and show derived plant signals only after calibration.</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <Radio className="h-4 w-4" aria-hidden="true" />
        <span>{latestTimestamp}</span>
      </div>
    </div>

    <DemoNotice />

    <Card variant="raised">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="sensor-label">Signal workflow</p>
          <h2 className="mt-1 text-lg font-semibold text-surface-950">RED + NIR → reflectance → NDVI</h2>
        </div>
        <Badge variant={calibrated ? 'success' : 'warning'}>{calibrated ? 'Calibrated path available' : 'Calibration required'}</Badge>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
          <div className="rounded-xl border border-optical-red-500/25 bg-optical-red-950/20 p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-optical-red-300">RED</span><span className="font-mono text-xs text-optical-red-400">~660 nm</span></div>
            <p className="mt-4 text-sm text-surface-500">Reflectance measurement</p>
            <p className="mt-2 text-xs text-surface-500">Raw signal acquired separately from NIR.</p>
          </div>
          <span className="hidden text-surface-500 md:block" aria-hidden="true">→</span>
          <div className="rounded-xl border border-optical-nir-500/25 bg-optical-nir-950/20 p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-optical-nir-300">NIR</span><span className="font-mono text-xs text-optical-nir-400">~850 nm</span></div>
            <p className="mt-4 text-sm text-surface-500">Reflectance measurement</p>
            <p className="mt-2 text-xs text-surface-500">Reference and geometry remain part of calibration.</p>
          </div>
          <span className="hidden text-surface-500 md:block" aria-hidden="true">→</span>
          <div className="rounded-xl border border-vikasa-500/25 bg-vikasa-950/20 p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-vikasa-300">NDVI</span><Waves className="h-4 w-4 text-vikasa-400" aria-hidden="true" /></div>
            <p className="mt-4 text-sm text-surface-500">Plant condition signal</p>
            <p className="mt-2 text-xs text-surface-500">Displayed only from calibrated reflectance.</p>
          </div>
        </div>
      </CardBody>
    </Card>

    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]" aria-label="Latest optical reading">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div><p className="sensor-label">Latest optical record</p><h2 className="mt-1 text-lg font-semibold text-surface-950">{item ? item.plant_id : 'No optical record'}</h2></div>
          {item && <span className="font-mono text-xs text-surface-500">{item.reading_id}</span>}
        </CardHeader>
        <CardBody>
          {item ? <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <OpticalMetric label="RED raw signal" value={item.red_raw} />
              <OpticalMetric label="NIR raw signal" value={item.nir_raw} />
            </div>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-surface-500"><span className="h-px flex-1 bg-surface-300" /> Calibration boundary <span className="h-px flex-1 bg-surface-300" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <OpticalMetric label="RED reflectance" value={item.red_reflectance} suffix="%" />
              <OpticalMetric label="NIR reflectance" value={item.nir_reflectance} suffix="%" />
            </div>
            <div className="rounded-xl border border-surface-300 bg-surface-0/50 p-4 text-xs leading-5 text-surface-500">RAW SIGNAL → calibration → reflectance → NDVI. Raw ADC counts are not reflectance and are never used directly for NDVI.</div>
          </div> : <Empty text="No optical records available." />}
        </CardBody>
      </Card>

      <Card variant="raised">
        <CardHeader><div className="flex items-center justify-between"><div><p className="sensor-label">Derived signal</p><h2 className="mt-1 text-lg font-semibold text-surface-950">{calibrated ? 'NDVI' : 'Raw NDVI Estimate'}</h2></div><Leaf className="h-5 w-5 text-vikasa-400" aria-hidden="true" /></div></CardHeader>
        <CardBody>
          <div className="rounded-xl border border-vikasa-500/25 bg-vikasa-950/20 p-5">
            <p className="font-mono text-4xl font-semibold text-surface-950">{ndvi == null ? '—' : ndvi.toFixed(3)}</p>
            <p className="mt-2 text-sm text-vikasa-300">{calibrated ? 'Calibrated reflectance available' : 'Estimated from raw RED + NIR ADC counts'}</p>
          </div>
          <div className="mt-5 flex items-center justify-between border-b border-surface-300 pb-3"><span className="text-sm text-surface-500">Calibration state</span><Badge variant={calibrated ? 'success' : 'warning'}>{calibrated ? 'Calibrated' : item ? 'Calibration required' : 'Unknown'}</Badge></div>
          <p className="mt-4 text-xs leading-5 text-surface-500">{calibrated ? 'NDVI is shown from calibrated RED and NIR reflectance values.' : 'This is not calibrated NDVI and should not be treated as a definitive plant-health measurement.'}</p>
        </CardBody>
      </Card>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <Card>
        <CardHeader><div className="flex items-center justify-between"><div><p className="sensor-label">Calibrated comparison</p><h2 className="mt-1 text-lg font-semibold text-surface-950">RED vs NIR reflectance</h2></div><Badge variant={calibrated ? 'success' : 'neutral'}>{calibrated ? 'Available' : 'Not available'}</Badge></div></CardHeader>
        <CardBody>
          {calibrated ? <div className="space-y-5">
            <ReflectanceBar label="RED" value={redReflectance} color="red" />
            <ReflectanceBar label="NIR" value={nirReflectance} color="nir" />
            <p className="text-xs text-surface-500">Comparison uses only the latest available calibrated reading; no additional values are inferred.</p>
          </div> : <Empty text="Reflectance comparison unavailable — calibrated values required." />}
        </CardBody>
      </Card>
      <Card>
        <CardHeader><p className="sensor-label">Measurement chain</p><h2 className="mt-1 text-lg font-semibold text-surface-950">How Vikāsa reads light</h2></CardHeader>
        <CardBody><div className="space-y-3 text-sm text-surface-500"><p><span className="font-medium text-surface-950">LED illumination</span> → leaf reflection</p><p><span className="font-medium text-surface-950">Photodiode sensing</span> → ADC acquisition</p><p><span className="font-medium text-surface-950">Calibration</span> → reflectance estimation</p><p><span className="font-medium text-surface-950">Reflectance pair</span> → NDVI when valid</p></div></CardBody>
      </Card>
    </section>

    <Card>
      <CardHeader className="flex items-center justify-between"><div><p className="sensor-label">Optical history</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Recorded signal values</h2></div><span className="text-xs text-surface-500">{readings.length} reading{readings.length === 1 ? '' : 's'}</span></CardHeader>
      <CardBody><ReadingTable readings={readings} optical /></CardBody>
    </Card>
  </div>
}
function ReflectanceBar({ label, value, color }: { label: string; value?: number | null; color: 'red' | 'nir' }) {
  const fill = value == null ? 0 : Math.min(Math.max(value, 0), 100)
  const accent = color === 'red' ? 'bg-optical-red-500' : 'bg-optical-nir-500'
  const text = color === 'red' ? 'text-optical-red-300' : 'text-optical-nir-300'
  return <div>
    <div className="mb-2 flex items-center justify-between text-sm"><span className={`font-medium ${text}`}>{label}</span><span className="font-mono text-surface-950">{value == null ? 'Not available' : `${value.toFixed(2)} %`}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-surface-300"><div className={`h-full rounded-full ${accent}`} style={{ width: `${fill}%` }} /></div>
  </div>
}
export function SensorHistory() {
  const { data: readings = [], isLoading, error } = useReadings()
  const [showOptical, setShowOptical] = useState(true)
  const item = latest(readings)
  const plantCount = new Set(readings.map((reading) => reading.plant_id)).size
  const providerMode = getDataProvider().mode
  const latestTimestamp = item ? new Date(item.timestamp).toLocaleString() : 'Awaiting sensor reading'

  if (isLoading) return <Loading title="Loading sensor history" />
  if (error) return <ErrorState />

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vikasa-400">Sensor data</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-950 sm:text-4xl">History</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">Recorded measurements across plants and sessions, with unavailable and uncalibrated values preserved as-is.</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        <span>{latestTimestamp}</span>
      </div>
    </div>

    <DemoNotice />

    <section aria-label="History summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <HistorySummary label="Readings loaded" value={readings.length ? String(readings.length) : 'Not available'} detail="Current provider result" icon={<Database className="h-4 w-4 text-vikasa-400" />} />
      <HistorySummary label="Plants represented" value={readings.length ? String(plantCount) : 'Not available'} detail="Unique plant IDs" icon={<Leaf className="h-4 w-4 text-vikasa-400" />} />
      <HistorySummary label="Latest timestamp" value={item ? new Date(item.timestamp).toLocaleDateString() : 'Not available'} detail={item ? new Date(item.timestamp).toLocaleTimeString() : 'No reading available'} icon={<Clock3 className="h-4 w-4 text-surface-500" />} />
      <HistorySummary label="Data mode" value={providerMode === 'demo' ? 'Demo / simulated' : 'API'} detail="Provider source" icon={<Radio className="h-4 w-4 text-optical-nir-400" />} />
    </section>

    <Card variant="raised">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="sensor-label">Measurement log</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Recorded sensor readings</h2><p className="mt-1 text-xs text-surface-500">Scroll within the table on narrow screens to preserve data readability.</p></div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Table display controls">
          <span className="text-xs uppercase tracking-[0.14em] text-surface-500">Columns</span>
          <button type="button" onClick={() => setShowOptical((visible) => !visible)} aria-pressed={showOptical} className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${showOptical ? 'border-vikasa-500/40 bg-vikasa-950/30 text-vikasa-300' : 'border-surface-300 bg-surface-0 text-surface-500 hover:text-surface-950'}`}>
            {showOptical ? 'Optical visible' : 'Show optical'}
          </button>
          <span className="rounded-lg border border-surface-300 bg-surface-0 px-3 py-2 text-xs text-surface-500">Environmental visible</span>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="overflow-x-auto px-3 pb-3 sm:px-6 sm:pb-6">
          <div className="min-w-[680px] pt-2">
            <ReadingTable readings={readings} optical={showOptical} />
          </div>
        </div>
        <div className="border-t border-surface-300 px-6 py-3 text-xs leading-5 text-surface-500">Raw RED/NIR columns are ADC counts. NDVI is shown only when the reading contains both calibrated reflectance values.</div>
      </CardBody>
    </Card>
  </div>
}
export function Environment() {
  const { data: readings = [], isLoading, error } = useReadings()
  const { data: systemStatus } = useStatus()
  const item = latest(readings)
  const providerMode = getDataProvider().mode
  const latestTimestamp = item ? new Date(item.timestamp).toLocaleString() : 'Awaiting environmental reading'
  const temperatureTrend = environmentalTrend(readings, 'temperature_c')
  const humidityTrend = environmentalTrend(readings, 'humidity_pct')
  const moistureTrend = environmentalTrend(readings, 'soil_moisture_raw')

  if (isLoading) return <Loading title="Loading environment" />
  if (error) return <ErrorState />

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vikasa-400">Environmental monitoring</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-950 sm:text-4xl">Environment</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">Conditions surrounding the monitored plant, reported from the available sensor reading fields.</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        <span>{latestTimestamp}</span>
      </div>
    </div>

    <DemoNotice />

    <section aria-labelledby="environment-metrics" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id="environment-metrics" className="text-sm font-semibold uppercase tracking-[0.18em] text-surface-500">Current measurements</h2>
        <span className="text-xs text-surface-500">{readings.length} available reading{readings.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Temperature" value={item?.temperature_c} unit="°C" trend={temperatureTrend} iconColor="amber" icon={<Thermometer className="h-5 w-5" />} />
        <MetricCard label="Humidity" value={item?.humidity_pct} unit="%" trend={humidityTrend} iconColor="blue" icon={<Droplets className="h-5 w-5" />} />
        <MetricCard label="Soil moisture raw" value={item?.soil_moisture_raw} unit="ADC" trend={moistureTrend} iconColor="green" icon={<Gauge className="h-5 w-5" />} />
        <MetricCard label="Ambient light" value={item?.ambient_light_raw} unit="ADC" iconColor="violet" icon={<Sun className="h-5 w-5" />} />
      </div>
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]" aria-label="Current environmental conditions">
      <Card variant="raised">
        <CardHeader className="flex items-center justify-between">
          <div><p className="sensor-label">Latest reading</p><h2 className="mt-1 text-lg font-semibold text-surface-950">{item ? item.plant_id : 'No current conditions'}</h2></div>
          <Badge variant={providerMode === 'demo' ? 'warning' : 'info'}>{providerMode === 'demo' ? 'Demo data' : 'API data'}</Badge>
        </CardHeader>
        <CardBody>
          {item ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ConditionValue label="Temperature" value={item.temperature_c} unit="°C" icon={<Thermometer className="h-4 w-4 text-amber-400" />} />
            <ConditionValue label="Humidity" value={item.humidity_pct} unit="%" icon={<Droplets className="h-4 w-4 text-blue-400" />} />
            <ConditionValue label="Soil moisture raw" value={item.soil_moisture_raw} unit="ADC" icon={<Leaf className="h-4 w-4 text-vikasa-400" />} />
            <ConditionValue label="Ambient light" value={item.ambient_light_raw} unit="ADC" icon={<Sun className="h-4 w-4 text-optical-nir-400" />} />
          </div> : <Empty text="No sensor readings available yet." />}
          {item && <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-surface-300 pt-4 text-xs text-surface-500"><span>Reading ID: <strong className="font-mono font-normal text-surface-950">{item.reading_id}</strong></span><span>Session: <strong className="font-mono font-normal text-surface-950">{item.session_id}</strong></span><span>{latestTimestamp}</span></div>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><p className="sensor-label">Sensor status</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Data availability</h2></CardHeader>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-surface-500"><Database className="h-4 w-4" /> API</span><StatusPill label="provider" status={systemStatus?.api ?? 'unknown'} size="sm" /></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-surface-500"><Thermometer className="h-4 w-4" /> Environmental sensors</span><StatusPill label="individual status unavailable" status="unknown" size="sm" /></div>
          <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-surface-500"><Radio className="h-4 w-4" /> Data mode</span><Badge variant={providerMode === 'demo' ? 'warning' : 'info'}>{providerMode === 'demo' ? 'Demo / simulated' : 'API'}</Badge></div>
          <p className="border-t border-surface-300 pt-4 text-xs leading-5 text-surface-500">Individual environmental sensor connectivity is not reported by the current provider.</p>
        </CardBody>
      </Card>
    </section>

    <Card>
      <CardHeader className="flex items-center justify-between"><div><p className="sensor-label">Available history</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Environmental trends</h2></div><Activity className="h-5 w-5 text-surface-500" aria-hidden="true" /></CardHeader>
      <CardBody className="grid gap-3 md:grid-cols-3">
        <EnvironmentalTrend readings={readings} field="temperature_c" label="Temperature" unit="°C" color="#fbbf24" />
        <EnvironmentalTrend readings={readings} field="humidity_pct" label="Humidity" unit="%" color="#60a5fa" />
        <EnvironmentalTrend readings={readings} field="soil_moisture_raw" label="Soil moisture raw" unit="ADC" color="#34d399" />
      </CardBody>
    </Card>
  </div>
}
function AlertSummary({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: React.ReactNode; tone: string }) {
  return <div className="rounded-xl border border-surface-300 bg-surface-100 p-4">
    <div className="flex items-center justify-between gap-3"><p className="sensor-label">{label}</p><span className={tone}>{icon}</span></div>
    <p className="mt-3 font-mono text-2xl font-semibold text-surface-950">{value}</p>
    <p className="mt-1 text-xs text-surface-500">{detail}</p>
  </div>
}
export function Alerts() {
  const { data: alerts = [], isLoading, error } = useAlerts()
  const providerMode = getDataProvider().mode
  const latestAlert = [...alerts].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))[0]
  const criticalCount = alerts.filter((alert) => alert.severity === 'critical').length
  const warningCount = alerts.filter((alert) => alert.severity === 'warning').length
  const infoCount = alerts.filter((alert) => alert.severity === 'info').length

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vikasa-400">Alert center</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-950 sm:text-4xl">Alerts</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">Review operational notices emitted by the selected data provider. Alerts are presented as records, not as new threshold or ML conclusions.</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        <span>{latestAlert ? `Latest alert ${new Date(latestAlert.timestamp).toLocaleString()}` : 'No alert timestamp available'}</span>
      </div>
    </div>

    {providerMode === 'demo' && <DemoNotice />}

    {error ? <ErrorState /> : <><section aria-labelledby="alert-summary" className="space-y-3">
      <div className="flex items-center justify-between"><h2 id="alert-summary" className="text-sm font-semibold uppercase tracking-[0.18em] text-surface-500">Loaded alert summary</h2><Badge variant={providerMode === 'demo' ? 'warning' : 'info'}>{providerMode === 'demo' ? 'Demo / simulated' : 'API data'}</Badge></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AlertSummary label="Total alerts" value={alerts.length} detail="Current provider result" icon={<Bell className="h-4 w-4" />} tone="text-vikasa-400" />
        <AlertSummary label="Critical" value={criticalCount} detail="Severity: critical" icon={<ShieldAlert className="h-4 w-4" />} tone="text-red-400" />
        <AlertSummary label="Warnings" value={warningCount} detail="Severity: warning" icon={<AlertTriangle className="h-4 w-4" />} tone="text-amber-400" />
        <AlertSummary label="Informational" value={infoCount} detail="Severity: info" icon={<Info className="h-4 w-4" />} tone="text-blue-400" />
      </div>
    </section>

    <Card variant="raised">
      <CardHeader className="flex items-center justify-between gap-4">
        <div><p className="sensor-label">Operational feed</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Alert stream</h2><p className="mt-1 text-xs text-surface-500">Severity, event context, timestamp, and plant association from the existing alert provider.</p></div>
        <Bell className="h-5 w-5 shrink-0 text-surface-500" aria-hidden="true" />
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? <div className="p-6"><Loading title="Loading alerts" /></div> : alerts.length ? <div className="divide-y divide-surface-300">{alerts.map((alert) => <AlertRow key={alert.id} alert={alert} expanded />)}</div> : <div className="p-6"><Empty text="No alerts are currently available." /></div>}
      </CardBody>
    </Card>

    <Card>
      <CardBody className="flex gap-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-surface-500" aria-hidden="true" />
        <p className="text-xs leading-5 text-surface-500">Alert generation remains outside this page. The future pipeline is sensor reading → backend rule evaluation → alert creation → dashboard and Telegram delivery.</p>
      </CardBody>
    </Card>
    </>}
  </div>
}
function DatasetMetric({ label, value, detail, icon, tone = 'text-surface-500' }: { label: string; value: string; detail: string; icon: React.ReactNode; tone?: string }) {
  return <div className="rounded-xl border border-surface-300 bg-surface-100 p-4"><div className="flex items-center justify-between gap-3"><p className="sensor-label">{label}</p><span className={tone}>{icon}</span></div><p className="mt-3 font-mono text-xl font-semibold text-surface-950">{value}</p><p className="mt-1 text-xs text-surface-500">{detail}</p></div>
}
export function DatasetInspector() {
  const [result, setResult] = useState<CSVValidationResult | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const inspect = (file?: File) => {
    if (!file) return
    setFileName(file.name)
    void getDataProvider().validateCSV(file).then(setResult)
  }
  const missingCells = result ? Object.values(result.missingValues).reduce((sum, value) => sum + value, 0) : 0
  const issues = result ? [...result.errors, ...result.warnings] : []
  const providerMode = getDataProvider().mode

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vikasa-400">Data inspector</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-950 sm:text-4xl">Dataset Inspector</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">Validate imported sensor CSV structure and review provenance before any dataset is considered for analysis.</p>
      </div>
      <Badge variant={providerMode === 'demo' ? 'warning' : 'info'}>{providerMode === 'demo' ? 'DEMO PROVIDER' : 'API PROVIDER'}</Badge>
    </div>

    {providerMode === 'demo' && <DemoNotice />}

    <Card variant="raised">
      <CardHeader className="flex items-start justify-between gap-4">
        <div><p className="sensor-label">Import workflow</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Upload a CSV for inspection</h2><p className="mt-1 text-xs leading-5 text-surface-500">Only comma-separated sensor datasets are supported. Files are parsed in-browser and remain separate from demo/API readings.</p></div>
        <Upload className="h-5 w-5 shrink-0 text-surface-500" aria-hidden="true" />
      </CardHeader>
      <CardBody>
        <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-vikasa-500/40 bg-vikasa-950/10 px-6 py-10 text-center transition-colors hover:border-vikasa-400 hover:bg-vikasa-950/20 focus-within:ring-2 focus-within:ring-vikasa-400">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-vikasa-500/30 bg-vikasa-950/30 text-vikasa-400"><Upload className="h-5 w-5" aria-hidden="true" /></span>
          <span className="mt-4 text-sm font-semibold text-surface-950">{fileName ?? 'Select a CSV file'}</span>
          <span className="mt-1 text-xs text-surface-500">{fileName ? 'Select another file to run validation again.' : 'Choose a sensor CSV to inspect its structure and provenance.'}</span>
          <span className="mt-4 rounded-lg border border-vikasa-500/30 px-3 py-2 text-xs font-medium text-vikasa-300">Choose CSV</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => inspect(event.target.files?.[0])} />
        </label>
        {fileName && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-surface-500"><span>Current file: <strong className="font-mono font-normal text-surface-950">{fileName}</strong></span>{result && <Badge variant={result.valid ? 'success' : 'danger'}>{result.valid ? 'Valid structure' : 'Invalid structure'}</Badge>}</div>}
      </CardBody>
    </Card>

    {!result ? <Card><EmptyState title="No dataset inspected" description="Select a CSV file above to begin structural validation. No sample records are loaded automatically." icon="upload" /></Card> : <><section aria-labelledby="validation-summary" className="space-y-3">
      <div className="flex items-center justify-between"><h2 id="validation-summary" className="text-sm font-semibold uppercase tracking-[0.18em] text-surface-500">Validation summary</h2><Badge variant={result.valid ? 'success' : 'danger'}>{result.valid ? 'Valid' : 'Invalid'}</Badge></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <DatasetMetric label="Validation" value={result.valid ? 'Valid' : 'Invalid'} detail="Schema structure only" icon={result.valid ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} tone={result.valid ? 'text-vikasa-400' : 'text-red-400'} />
        <DatasetMetric label="Rows detected" value={String(result.rowCount)} detail="Data rows in file" icon={<FileText className="h-4 w-4" />} />
        <DatasetMetric label="Columns detected" value={String(result.columns.length)} detail="Header fields found" icon={<Database className="h-4 w-4" />} />
        <DatasetMetric label="Missing cells" value={String(missingCells)} detail="Blank values counted" icon={<AlertTriangle className="h-4 w-4" />} tone={missingCells ? 'text-amber-400' : 'text-vikasa-400'} />
        <DatasetMetric label="Preview rows" value={String(result.preview.length)} detail="Parsed preview available" icon={<Search className="h-4 w-4" />} />
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" aria-label="Dataset quality and provenance">
      <Card>
        <CardHeader><p className="sensor-label">Data quality</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Validation findings</h2></CardHeader>
        <CardBody>{issues.length ? <div className="space-y-3">{issues.map((issue, index) => <AlertBanner key={`${issue}-${index}`} variant={result.errors.includes(issue) ? 'danger' : 'warning'} title={result.errors.includes(issue) ? 'Error' : 'Warning'}>{issue}</AlertBanner>)}</div> : <AlertBanner variant="success" title="No validation findings">The file passed the available structural checks. This does not establish scientific validity or measurement accuracy.</AlertBanner>}</CardBody>
      </Card>
      <Card>
        <CardHeader><p className="sensor-label">Provenance review</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Warnings and metadata</h2></CardHeader>
        <CardBody className="space-y-4"><div className="flex items-center justify-between gap-3"><span className="text-sm text-surface-500">Missing required columns</span><Badge variant={result.missingColumns.length ? 'danger' : 'success'}>{result.missingColumns.length ? String(result.missingColumns.length) : 'None'}</Badge></div><div className="flex items-center justify-between gap-3"><span className="text-sm text-surface-500">Extra columns</span><Badge variant={result.extraColumns.length ? 'warning' : 'success'}>{result.extraColumns.length ? String(result.extraColumns.length) : 'None'}</Badge></div><p className="border-t border-surface-300 pt-4 text-xs leading-5 text-surface-500">Successful parsing is not a claim that the dataset has verified provenance, calibration, or research validity.</p></CardBody>
      </Card>
    </section>

    <Card>
      <CardHeader className="flex items-center justify-between gap-4"><div><p className="sensor-label">Parsed preview</p><h2 className="mt-1 text-lg font-semibold text-surface-950">CSV records</h2><p className="mt-1 text-xs text-surface-500">Only rows parsed by the existing validator are shown.</p></div><Badge variant={result.preview.length ? 'info' : 'neutral'}>{result.preview.length ? `${result.preview.length} preview rows` : 'No preview rows'}</Badge></CardHeader>
      <CardBody className="p-0">{result.preview.length ? <div className="overflow-x-auto"><div className="min-w-[760px] p-2"><ReadingTable readings={result.preview} optical /></div></div> : <EmptyState title="No preview rows available" description="The validator did not produce parsed preview records for this file." icon="search" />}</CardBody>
    </Card>

    <Card><CardHeader><h2 className="text-lg font-semibold text-surface-950">Dataset handling policy</h2></CardHeader><CardBody><p className="text-sm leading-6 text-surface-500">Uploaded CSV files are inspected in-browser and remain separate from demo/API readings. No uploaded dataset is treated as real hardware output, and this page does not train models or claim accuracy.</p></CardBody></Card>
    </>}
  </div>
}
function SystemStatusCard({ label, detail, status, icon }: { label: string; detail: string; status: 'connected' | 'disconnected' | 'unknown'; icon: React.ReactNode }) {
  return <Card><CardBody><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="sensor-label">{label}</p><p className="mt-2 text-sm text-surface-500">{detail}</p></div><span className="shrink-0 text-surface-500">{icon}</span></div><div className="mt-5"><StatusPill label="status" status={status} size="sm" /></div></CardBody></Card>
}
function PipelineNode({ label, detail, status, icon, future = false }: { label: string; detail: string; status: 'connected' | 'disconnected' | 'unknown'; icon: React.ReactNode; future?: boolean }) {
  return <div className="min-w-0 flex-1 rounded-xl border border-surface-300 bg-surface-100 p-4"><div className="flex items-start justify-between gap-3"><span className="text-surface-500">{icon}</span>{future ? <Badge variant="warning">Planned</Badge> : <StatusPill label="status" status={status} size="sm" />}</div><p className="mt-4 text-sm font-semibold text-surface-950">{label}</p><p className="mt-1 text-xs leading-5 text-surface-500">{future ? detail : status === 'unknown' ? 'Status unavailable' : detail}</p></div>
}
function ReadinessItem({ title, detail, pending = false }: { title: string; detail: string; pending?: boolean }) {
  return <div className="flex items-start gap-3"><span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${pending ? 'bg-amber-950/40 text-amber-400' : 'bg-vikasa-950/40 text-vikasa-400'}`}>{pending ? <Clock3 className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}</span><div><p className="text-sm font-medium text-surface-950">{title}</p><p className="mt-1 text-xs leading-5 text-surface-500">{detail}</p></div></div>
}
export function SystemStatusPage() {
  const { data: status, isLoading, error } = useStatus()
  const providerMode = getDataProvider().mode
  const apiStatus = isLoading ? 'unknown' : status?.api ?? 'unknown'
  const esp32Status = isLoading ? 'unknown' : status?.esp32 ?? 'unknown'
  const databaseStatus = isLoading ? 'unknown' : status?.storageHealthy ? 'connected' : 'unknown'

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-vikasa-400">System</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-surface-950 sm:text-4xl">System Status</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-surface-500">Inspect the current provider, device, and storage boundaries without implying physical deployment or unverified connectivity.</p>
      </div>
      <Badge variant={providerMode === 'demo' ? 'warning' : 'info'}>{providerMode === 'demo' ? 'DEMO / SIMULATED DATA' : 'API provider'}</Badge>
    </div>

    {providerMode === 'demo' && <DemoNotice />}
    {error ? <ErrorState /> : <><section aria-labelledby="system-overview" className="space-y-3">
      <div className="flex items-center justify-between"><h2 id="system-overview" className="text-sm font-semibold uppercase tracking-[0.18em] text-surface-500">System overview</h2><span className="text-xs text-surface-500">Current provider status</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SystemStatusCard label="Flask API" detail="Dashboard data provider" status={apiStatus} icon={<Database className="h-5 w-5" />} />
        <SystemStatusCard label="ESP32" detail="Physical device boundary" status={esp32Status} icon={<Cpu className="h-5 w-5" />} />
        <SystemStatusCard label="Database / storage" detail={status?.storageBackend ? `Active provider: ${status.storageBackend}` : 'Storage provider status'} status={databaseStatus} icon={<Database className="h-5 w-5" />} />
        <Card><CardBody><div className="flex items-start justify-between gap-4"><div><p className="sensor-label">Data mode</p><p className="mt-2 text-sm text-surface-500">{providerMode === 'demo' ? 'Simulated provider output' : 'Selected API provider'}</p></div><Radio className="h-5 w-5 shrink-0 text-surface-500" /></div><div className="mt-5"><Badge variant={providerMode === 'demo' ? 'warning' : 'info'}>{providerMode === 'demo' ? 'Demo' : 'API'}</Badge></div></CardBody></Card>
      </div>
    </section>

    <Card variant="raised">
      <CardHeader><p className="sensor-label">Connection path</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Vikāsa data pipeline</h2><p className="mt-1 text-xs leading-5 text-surface-500">Only the statuses reported by the existing provider are shown. Wi-Fi and dashboard transport are not independently reported.</p></CardHeader>
      <CardBody><div className="grid gap-3 md:grid-cols-5 md:items-center">
        <PipelineNode label="ESP32" detail="Device status from provider" status={esp32Status} icon={<Cpu className="h-5 w-5" />} />
        <div className="hidden text-center text-surface-500 md:block" aria-hidden="true">↓</div>
        <PipelineNode label="Wi-Fi" detail="Status unavailable" status="unknown" icon={<WifiOff className="h-5 w-5" />} />
        <div className="hidden text-center text-surface-500 md:block" aria-hidden="true">↓</div>
        <PipelineNode label="Flask API" detail="Provider/API boundary" status={apiStatus} icon={<Waves className="h-5 w-5" />} />
      </div><div className="my-3 hidden justify-center text-surface-500 md:flex" aria-hidden="true">↓</div><div className="grid gap-3 md:grid-cols-2">
        <PipelineNode label="Database / storage" detail="Firebase status field; migration is not implemented" status={databaseStatus} icon={<Database className="h-5 w-5" />} />
        <PipelineNode label="Dashboard" detail="Current interface consuming the selected provider" status={apiStatus} icon={<Activity className="h-5 w-5" />} />
      </div></CardBody>
    </Card>

    <section className="grid gap-6 lg:grid-cols-2" aria-label="Integration readiness">
      <Card><CardHeader><p className="sensor-label">Implemented boundary</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Ready / available</h2></CardHeader><CardBody className="space-y-5"><ReadinessItem title="Flask API provider boundary" detail="The frontend can use VITE_API_BASE_URL when configured." /><ReadinessItem title="Provider status reporting" detail="API, ESP32, and Firebase values are displayed from the existing status response." /><ReadinessItem title="Demo provider" detail="Demo readings and status remain clearly labeled as simulated." /></CardBody></Card>
      <Card><CardHeader><p className="sensor-label">Verification queue</p><h2 className="mt-1 text-lg font-semibold text-surface-950">Pending / not verified</h2></CardHeader><CardBody className="space-y-5"><ReadinessItem title="ESP32 physical connection" detail="No physical device connection is assumed in demo mode." pending /><ReadinessItem title="Firebase deployment connection" detail="Firebase is not claimed as connected; configure it only through backend environment settings." pending /><ReadinessItem title="Supabase and Telegram" detail="Planned future integrations; no migration or alert delivery is implemented here." pending /></CardBody></Card>
    </section>

    <Card><CardBody className="flex gap-3"><Info className="mt-0.5 h-4 w-4 shrink-0 text-surface-500" aria-hidden="true" /><p className="text-xs leading-5 text-surface-500"><strong className="font-medium text-surface-950">Future architecture:</strong> ESP32 → Flask → Supabase → Dashboard → Telegram. Supabase and Telegram are shown as planned targets only; the current implementation retains its existing Firebase naming and status data.</p></CardBody></Card>
    </>}
  </div>
}
export { SystemStatusPage as SystemStatus }
function environmentalTrend(readings: SensorReadingWithMeta[], field: 'temperature_c' | 'humidity_pct' | 'soil_moisture_pct' | 'soil_moisture_raw') {
  return readings
    .filter((reading) => typeof reading[field] === 'number')
    .slice()
    .reverse()
    .map((reading) => Number(reading[field]))
}
function ConditionValue({ label, value, unit, icon }: { label: string; value?: number | null; unit: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-surface-300 bg-surface-0/50 p-4">
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-surface-500">{icon}{label}</div>
    <p className="mt-4 font-mono text-xl font-semibold text-surface-950">{value == null ? 'Not available' : `${value.toFixed(unit === '°C' ? 1 : 0)} ${unit}`}</p>
  </div>
}
function EnvironmentalTrend({ readings, field, label, unit, color }: { readings: SensorReadingWithMeta[]; field: 'temperature_c' | 'humidity_pct' | 'soil_moisture_pct' | 'soil_moisture_raw'; label: string; unit: string; color: string }) {
  const points = environmentalTrend(readings, field)
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const path = points.map((point, index) => {
    const x = points.length === 1 ? 0 : (index / (points.length - 1)) * 100
    const y = 38 - ((point - min) / range) * 30
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
  const current = points[points.length - 1]

  return <div className="rounded-xl border border-surface-300 bg-surface-0/50 p-4">
    <div className="flex items-start justify-between gap-3">
      <div><p className="sensor-label">{label}</p><p className="mt-2 font-mono text-lg font-semibold text-surface-950">{current === undefined ? 'Not available' : `${current.toFixed(field === 'temperature_c' ? 1 : 0)} ${unit}`}</p></div>
      <span className="text-xs text-surface-500">{points.length} point{points.length === 1 ? '' : 's'}</span>
    </div>
    {points.length >= 2 ? <svg className="mt-4 h-16 w-full" viewBox="0 0 100 42" role="img" aria-label={`${label} environmental trend`}><path d="M 0 38 H 100" stroke="currentColor" className="text-surface-300" strokeWidth="0.5" /><path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : <p className="mt-5 text-xs text-surface-500">Not enough data for a trend.</p>}
  </div>
}
function PlantValue({ label, value, accent = 'neutral' }: { label: string; value: string; accent?: 'neutral' | 'red' | 'nir' | 'green' }) {
  const accents = {
    neutral: 'border-surface-300 bg-surface-0/50',
    red: 'border-optical-red-500/20 bg-optical-red-950/15',
    nir: 'border-optical-nir-500/20 bg-optical-nir-950/15',
    green: 'border-vikasa-500/20 bg-vikasa-950/15',
  }
  return <div className={`rounded-lg border p-3 ${accents[accent]}`}><p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-surface-500">{label}</p><p className="mt-2 break-words font-mono text-sm text-surface-950">{value}</p></div>
}
function HistorySummary({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-surface-300 bg-surface-100 p-4"><div className="flex items-center justify-between gap-3"><p className="sensor-label">{label}</p>{icon}</div><p className="mt-3 break-words font-mono text-lg font-semibold text-surface-950">{value}</p><p className="mt-1 text-xs text-surface-500">{detail}</p></div>
}
function Loading({ title }: { title: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">{title}…</div> }
function ErrorState() { return <AlertBanner variant="danger" title="Unable to load dashboard">The selected provider returned an error. Check the API configuration or return to demo mode.</AlertBanner> }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-slate-500">{text}</p> }
function OpticalMetric({ label, value, suffix = 'ADC', precision }: { label: string; value?: number | null; suffix?: string; precision?: number }) { const decimals = precision ?? (suffix === 'ADC' ? 0 : label === 'NDVI' ? 3 : 2); const accent = label.startsWith('RED') ? 'border-optical-red-500/20 bg-optical-red-950/15' : label.startsWith('NIR') ? 'border-optical-nir-500/20 bg-optical-nir-950/15' : 'border-surface-300 bg-surface-0/50'; const labelColor = label.startsWith('RED') ? 'text-optical-red-300' : label.startsWith('NIR') ? 'text-optical-nir-300' : 'text-surface-500'; return <div className={`rounded-xl border p-4 ${accent}`}><p className={`text-xs font-semibold uppercase tracking-[0.14em] ${labelColor}`}>{label}</p><p className="mt-2 font-mono text-lg text-surface-950">{value == null ? 'Not available' : `${value.toFixed(decimals)}${suffix ? ` ${suffix}` : ''}`}</p></div> }
function AlertRow({ alert, expanded = false }: { alert: AlertItem; expanded?: boolean }) {
  const config = alert.severity === 'critical'
    ? { icon: ShieldAlert, iconClass: 'text-red-400', border: 'border-l-red-500', surface: 'bg-red-950/10', badge: 'danger', label: 'Critical' }
    : alert.severity === 'warning'
      ? { icon: AlertTriangle, iconClass: 'text-amber-400', border: 'border-l-amber-500', surface: 'bg-amber-950/10', badge: 'warning', label: 'Warning' }
      : { icon: Info, iconClass: 'text-blue-400', border: 'border-l-blue-500', surface: 'bg-blue-950/10', badge: 'info', label: 'Info' }
  const Icon = config.icon
  return <div className={`border-l-2 px-6 py-5 transition-colors ${config.border} ${config.surface}`}>
    <div className="flex items-start gap-4">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={config.badge as 'danger' | 'warning' | 'info'}>{config.label}</Badge>
          {alert.plantId && <Badge variant="neutral">{alert.plantId}</Badge>}
          <span className="ml-auto text-xs text-surface-500">{new Date(alert.timestamp).toLocaleString()}</span>
        </div>
        <h3 className="mt-3 text-base font-semibold text-surface-950">{alert.title}</h3>
        {expanded && <p className="mt-1 max-w-3xl text-sm leading-6 text-surface-500">{alert.detail}</p>}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-surface-500">
          <span><span className="uppercase tracking-wider text-surface-600">What</span> {alert.title}</span>
          <span><span className="uppercase tracking-wider text-surface-600">When</span> {new Date(alert.timestamp).toLocaleString()}</span>
          {alert.plantId && <span><span className="uppercase tracking-wider text-surface-600">Where</span> {alert.plantId}</span>}
        </div>
      </div>
    </div>
  </div>
}
function ReadingTable({ readings, optical = false }: { readings: SensorReadingWithMeta[]; optical?: boolean }) { if (!readings.length) return <Empty text="No readings available." />; return <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th className="px-3 py-3">Time</th><th className="px-3 py-3">Plant</th><th className="px-3 py-3">Health</th><th className="px-3 py-3">Temperature</th><th className="px-3 py-3">Humidity</th>{optical && <><th className="px-3 py-3">Red ADC</th><th className="px-3 py-3">NIR ADC</th><th className="px-3 py-3">Raw NDVI Estimate</th></>}</tr></thead><tbody>{readings.map((item) => <tr key={item.reading_id} className="border-b border-slate-100"><td className="whitespace-nowrap px-3 py-3 text-slate-600">{new Date(item.timestamp).toLocaleString()}</td><td className="px-3 py-3 font-medium">{item.plant_id}</td><td className="px-3 py-3">{statusBadge(item.health_label)}</td><td className="px-3 py-3">{displayValue(item.temperature_c, '°C')}</td><td className="px-3 py-3">{displayValue(item.humidity_pct, '%')}</td>{optical && <><td className="px-3 py-3 font-mono">{displayValue(item.red_raw)}</td><td className="px-3 py-3 font-mono">{displayValue(item.nir_raw)}</td><td className="px-3 py-3 font-mono">{displayValue(hasCalibratedReflectance(item) ? item.ndvi : getRawNDVIEstimate(item))}</td></>}</tr>)}</tbody></table></div> }
