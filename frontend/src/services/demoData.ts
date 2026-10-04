import type { SensorReading, SensorReadingWithMeta, PlantSummary, SessionSummary, SystemStatus } from '../types/sensor'
import { calculateNDVI } from '../types/sensor'

export const DEMO_PLANT_IDS = ['PLANT-001', 'PLANT-002', 'PLANT-003', 'PLANT-004']
export const DEMO_SESSION_IDS = ['SESSION-2026-001', 'SESSION-2026-002']
export const DEMO_OPERATOR_ID = 'OPERATOR-DEMO'

function createDemoReading(overrides: Partial<SensorReading> = {}): SensorReadingWithMeta {
  const baseReading: SensorReading = {
    reading_id: `READING-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    plant_id: 'PLANT-001',
    session_id: 'SESSION-2026-001',
    timestamp: new Date().toISOString(),
    species: 'Solanum lycopersicum',
    stress_type: 'healthy',
    health_label: 'healthy',
    label_evidence: 'visual inspection',
    red_raw: 2100,
    nir_raw: 3200,
    red_dark: 45,
    nir_dark: 52,
    red_reference: 3800,
    nir_reference: 3950,
    red_reflectance: 54.2,
    nir_reflectance: 79.8,
    ndvi: calculateNDVI(54.2, 79.8),
    temperature_c: 24.5,
    humidity_pct: 62.3,
    soil_moisture_raw: 1850,
    soil_moisture_pct: 42.1,
    ambient_light_raw: 2900,
    operator_id: DEMO_OPERATOR_ID,
    notes: 'Demo reading - not from actual hardware',
    ...overrides,
  }
  return {
    ...baseReading,
    _meta: {
      source: 'demo',
      validationWarnings: ['Demo data - not from actual Vikāsa hardware'],
    },
  }
}

function createDemoReadingNoCalibration(overrides: Partial<SensorReading> = {}): SensorReadingWithMeta {
  const baseReading: SensorReading = {
    reading_id: `READING-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    plant_id: 'PLANT-002',
    session_id: 'SESSION-2026-001',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    species: 'Solanum lycopersicum',
    stress_type: 'drought',
    health_label: 'moderate',
    label_evidence: 'visual inspection',
    red_raw: 1850,
    nir_raw: 2900,
    red_dark: 42,
    nir_dark: 48,
    red_reference: 3750,
    nir_reference: 3880,
    red_reflectance: undefined,
    nir_reflectance: undefined,
    ndvi: undefined,
    temperature_c: 28.2,
    humidity_pct: 41.7,
    soil_moisture_raw: 920,
    soil_moisture_pct: undefined,
    ambient_light_raw: 3100,
    operator_id: DEMO_OPERATOR_ID,
    notes: 'Demo reading - calibration pending',
    ...overrides,
  }
  return {
    ...baseReading,
    _meta: {
      source: 'demo',
      validationWarnings: ['Demo data - not from actual Vikāsa hardware', 'Calibrated reflectance unavailable'],
    },
  }
}

function createEnvironmentalOnlyReading(overrides: Partial<SensorReading> = {}): SensorReadingWithMeta {
  const baseReading: SensorReading = {
    reading_id: `READING-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    plant_id: 'PLANT-003',
    session_id: 'SESSION-2026-002',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    species: 'Solanum lycopersicum',
    stress_type: 'nutrient',
    health_label: 'mild',
    label_evidence: 'lab assay',
    red_raw: undefined,
    nir_raw: undefined,
    red_dark: undefined,
    nir_dark: undefined,
    red_reference: undefined,
    nir_reference: undefined,
    red_reflectance: undefined,
    nir_reflectance: undefined,
    ndvi: undefined,
    temperature_c: 22.8,
    humidity_pct: 68.4,
    soil_moisture_raw: 2100,
    soil_moisture_pct: 48.5,
    ambient_light_raw: 2650,
    operator_id: DEMO_OPERATOR_ID,
    notes: 'Environmental sensors only - optical module not installed',
    ...overrides,
  }
  return {
    ...baseReading,
    _meta: {
      source: 'demo',
      validationWarnings: ['Demo data - not from actual Vikāsa hardware', 'No optical sensor data available'],
    },
  }
}

export const DEMO_READINGS: SensorReadingWithMeta[] = [
  createDemoReading({
    reading_id: 'DEMO-READING-001',
    timestamp: '2026-10-04T10:00:00Z',
    plant_id: 'PLANT-001',
  }),
  createDemoReading({
    reading_id: 'DEMO-READING-002',
    timestamp: '2026-10-04T10:15:00Z',
    plant_id: 'PLANT-001',
    temperature_c: 24.7,
    humidity_pct: 61.8,
    soil_moisture_pct: 41.5,
  }),
  createDemoReading({
    reading_id: 'DEMO-READING-003',
    timestamp: '2026-10-04T10:30:00Z',
    plant_id: 'PLANT-001',
    temperature_c: 25.1,
    humidity_pct: 60.2,
    soil_moisture_pct: 40.8,
  }),
  createDemoReadingNoCalibration({
    reading_id: 'DEMO-READING-004',
    timestamp: '2026-10-04T10:00:00Z',
    plant_id: 'PLANT-002',
  }),
  createDemoReadingNoCalibration({
    reading_id: 'DEMO-READING-005',
    timestamp: '2026-10-04T10:15:00Z',
    plant_id: 'PLANT-002',
    temperature_c: 28.5,
    humidity_pct: 40.1,
  }),
  createEnvironmentalOnlyReading({
    reading_id: 'DEMO-READING-006',
    timestamp: '2026-10-04T10:00:00Z',
    plant_id: 'PLANT-003',
  }),
  createEnvironmentalOnlyReading({
    reading_id: 'DEMO-READING-007',
    timestamp: '2026-10-04T10:15:00Z',
    plant_id: 'PLANT-003',
    temperature_c: 23.1,
    humidity_pct: 67.9,
  }),
  createDemoReading({
    reading_id: 'DEMO-READING-008',
    timestamp: '2026-10-04T10:00:00Z',
    plant_id: 'PLANT-004',
    species: 'Capsicum annuum',
    stress_type: 'salinity',
    health_label: 'severe',
    label_evidence: 'sensor threshold',
    red_reflectance: 38.5,
    nir_reflectance: 62.1,
    ndvi: calculateNDVI(38.5, 62.1),
    temperature_c: 26.3,
    humidity_pct: 55.0,
    soil_moisture_pct: 35.2,
  }),
]

export const DEMO_PLANT_SUMMARIES: PlantSummary[] = DEMO_PLANT_IDS.map((plantId) => {
  const plantReadings = DEMO_READINGS.filter((r) => r.plant_id === plantId)
  const latest = plantReadings.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
  return {
    plant_id: plantId,
    species: latest?.species ?? null,
    latestReading: latest ?? null,
    readingCount: plantReadings.length,
    healthLabel: latest?.health_label ?? null,
    lastUpdated: latest?.timestamp ?? null,
  }
})

export const DEMO_SESSION_SUMMARIES: SessionSummary[] = DEMO_SESSION_IDS.map((sessionId) => {
  const sessionReadings = DEMO_READINGS.filter((r) => r.session_id === sessionId)
  const plantIds = [...new Set(sessionReadings.map((r) => r.plant_id))]
  const timestamps = sessionReadings.map((r) => r.timestamp).sort()
  const stressTypes = [...new Set(sessionReadings.map((r) => r.stress_type).filter(Boolean))] as string[]
  return {
    session_id: sessionId,
    plantIds,
    readingCount: sessionReadings.length,
    dateRange: timestamps.length > 0 ? { start: timestamps[0], end: timestamps[timestamps.length - 1] } : null,
    stressTypes,
  }
})

export const DEMO_SYSTEM_STATUS: SystemStatus = {
  api: 'unknown',
  esp32: 'unknown',
  firebase: 'unknown',
  lastSync: null,
}

export async function fetchDemoReadings(): Promise<SensorReadingWithMeta[]> {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return [...DEMO_READINGS].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function fetchDemoPlantSummaries(): Promise<PlantSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return DEMO_PLANT_SUMMARIES
}

export async function fetchDemoSessionSummaries(): Promise<SessionSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  return DEMO_SESSION_SUMMARIES
}

export async function fetchDemoSystemStatus(): Promise<SystemStatus> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return DEMO_SYSTEM_STATUS
}

export function getReadingsForPlant(plantId: string): SensorReadingWithMeta[] {
  return DEMO_READINGS.filter((r) => r.plant_id === plantId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export function getReadingsForSession(sessionId: string): SensorReadingWithMeta[] {
  return DEMO_READINGS.filter((r) => r.session_id === sessionId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}