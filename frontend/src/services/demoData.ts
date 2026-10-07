import type { AlertItem, PlantSummary, SensorReadingWithMeta, SystemStatus } from '../types/sensor'
import { calculateNDVI } from '../types/sensor'

const demoMeta = { source: 'demo' as const, validationWarnings: ['DEMO DATA — not from Vikāsa hardware'] }
const reading = (data: Partial<SensorReadingWithMeta> & Pick<SensorReadingWithMeta, 'reading_id' | 'plant_id' | 'session_id' | 'timestamp'>): SensorReadingWithMeta => ({
  operator_id: 'OPERATOR-DEMO',
  species: 'Solanum lycopersicum',
  stress_type: 'healthy',
  health_label: 'healthy',
  label_evidence: 'simulated demonstration label',
  notes: 'DEMO DATA — not an experimental result',
  ...data,
  _meta: demoMeta,
})

export const DEMO_READINGS: SensorReadingWithMeta[] = [
  reading({ reading_id: 'DEMO-001', plant_id: 'PLANT-001', session_id: 'SESSION-DEMO-01', timestamp: '2026-10-04T10:00:00Z', red_raw: 2100, nir_raw: 3200, red_reflectance: 54.2, nir_reflectance: 79.8, ndvi: calculateNDVI(54.2, 79.8), temperature_c: 24.5, humidity_pct: 62.3, soil_moisture_pct: 42.1, ambient_light_raw: 2900 }),
  reading({ reading_id: 'DEMO-002', plant_id: 'PLANT-001', session_id: 'SESSION-DEMO-01', timestamp: '2026-10-04T10:15:00Z', red_raw: 2140, nir_raw: 3260, red_reflectance: 55.1, nir_reflectance: 80.4, ndvi: calculateNDVI(55.1, 80.4), temperature_c: 24.8, humidity_pct: 61.8, soil_moisture_pct: 41.5, ambient_light_raw: 3020 }),
  reading({ reading_id: 'DEMO-003', plant_id: 'PLANT-002', session_id: 'SESSION-DEMO-01', timestamp: '2026-10-04T10:00:00Z', stress_type: 'drought', health_label: 'moderate', red_raw: 1850, nir_raw: 2900, temperature_c: 28.2, humidity_pct: 41.7, soil_moisture_raw: 920, ambient_light_raw: 3100, notes: 'DEMO DATA — calibrated reflectance unavailable' }),
  reading({ reading_id: 'DEMO-004', plant_id: 'PLANT-003', session_id: 'SESSION-DEMO-02', timestamp: '2026-10-04T10:05:00Z', stress_type: 'unknown', health_label: 'unknown', temperature_c: 22.8, humidity_pct: 68.4, soil_moisture_pct: 48.5, ambient_light_raw: 2650, notes: 'DEMO DATA — optical module unavailable' }),
]

export const DEMO_STATUS: SystemStatus = { api: 'unknown', esp32: 'unknown', storageBackend: 'demo', storageHealthy: false, lastSync: null }
export const DEMO_ALERTS: AlertItem[] = [
  { id: 'alert-1', severity: 'warning', title: 'Calibration pending', detail: 'PLANT-002 has raw optical counts but no calibrated reflectance.', timestamp: '2026-10-04T10:00:00Z', plantId: 'PLANT-002' },
  { id: 'alert-2', severity: 'info', title: 'Demo mode active', detail: 'All displayed readings are simulated demonstration data.', timestamp: '2026-10-04T09:55:00Z' },
]
export function fetchDemoReadings() { return Promise.resolve([...DEMO_READINGS].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))) }
export function fetchDemoPlantSummaries(): Promise<PlantSummary[]> {
  return Promise.resolve([...new Set(DEMO_READINGS.map((item) => item.plant_id))].map((plant_id) => {
    const items = DEMO_READINGS.filter((item) => item.plant_id === plant_id).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
    const latest = items[0]
    return { plant_id, species: latest.species ?? null, latestReading: latest, readingCount: items.length, healthLabel: latest.health_label ?? null, lastUpdated: latest.timestamp }
  }))
}
export function fetchDemoStatus() { return Promise.resolve(DEMO_STATUS) }
export function fetchDemoAlerts() { return Promise.resolve(DEMO_ALERTS) }
