import { z } from 'zod'

export const SensorReadingSchema = z.object({
  reading_id: z.string().min(1, 'Reading ID is required'),
  plant_id: z.string().min(1, 'Plant ID is required'),
  session_id: z.string().min(1, 'Session ID is required'),
  timestamp: z.string().datetime({ offset: true }).or(z.string().min(1, 'Timestamp is required')),
  species: z.string().optional(),
  stress_type: z.string().optional(),
  health_label: z.string().optional(),
  label_evidence: z.string().optional(),
  red_raw: z.coerce.number().int().nonnegative().optional(),
  nir_raw: z.coerce.number().int().nonnegative().optional(),
  red_dark: z.coerce.number().int().nonnegative().optional(),
  nir_dark: z.coerce.number().int().nonnegative().optional(),
  red_reference: z.coerce.number().int().nonnegative().optional(),
  nir_reference: z.coerce.number().int().nonnegative().optional(),
  red_reflectance: z.coerce.number().min(0).max(100).optional(),
  nir_reflectance: z.coerce.number().min(0).max(100).optional(),
  ndvi: z.coerce.number().min(-1).max(1).optional(),
  temperature_c: z.coerce.number().optional(),
  humidity_pct: z.coerce.number().min(0).max(100).optional(),
  soil_moisture_raw: z.coerce.number().int().nonnegative().optional(),
  soil_moisture_pct: z.coerce.number().min(0).max(100).optional(),
  ambient_light_raw: z.coerce.number().int().nonnegative().optional(),
  operator_id: z.string().min(1, 'Operator ID is required'),
  notes: z.string().optional(),
})

export type SensorReading = z.infer<typeof SensorReadingSchema>

export const SensorReadingArraySchema = z.array(SensorReadingSchema)

export interface SensorReadingWithMeta extends SensorReading {
  _meta?: {
    source: 'demo' | 'csv' | 'api'
    rowIndex?: number
    validationWarnings?: string[]
  }
}

export interface CSVValidationResult {
  valid: boolean
  rowCount: number
  columns: string[]
  missingColumns: string[]
  extraColumns: string[]
  warnings: string[]
  errors: string[]
  preview: SensorReadingWithMeta[]
}

export interface PlantSummary {
  plant_id: string
  species: string | null
  latestReading: SensorReading | null
  readingCount: number
  healthLabel: string | null
  lastUpdated: string | null
}

export interface SessionSummary {
  session_id: string
  plantIds: string[]
  readingCount: number
  dateRange: { start: string; end: string } | null
  stressTypes: string[]
}

export interface SystemStatus {
  api: 'connected' | 'disconnected' | 'unknown'
  esp32: 'connected' | 'disconnected' | 'unknown'
  firebase: 'connected' | 'disconnected' | 'unknown'
  lastSync: string | null
}

export const EXPECTED_CSV_COLUMNS = [
  'reading_id',
  'plant_id',
  'session_id',
  'timestamp',
  'species',
  'stress_type',
  'health_label',
  'label_evidence',
  'red_raw',
  'nir_raw',
  'red_dark',
  'nir_dark',
  'red_reference',
  'nir_reference',
  'red_reflectance',
  'nir_reflectance',
  'ndvi',
  'temperature_c',
  'humidity_pct',
  'soil_moisture_raw',
  'soil_moisture_pct',
  'ambient_light_raw',
  'operator_id',
  'notes',
] as const

export type CSVColumn = (typeof EXPECTED_CSV_COLUMNS)[number]

export function calculateNDVI(redReflectance: number | null | undefined, nirReflectance: number | null | undefined): number | null {
  if (redReflectance === null || redReflectance === undefined || nirReflectance === null || nirReflectance === undefined) {
    return null
  }
  const sum = nirReflectance + redReflectance
  if (sum === 0) return null
  return (nirReflectance - redReflectance) / sum
}

export function hasCalibratedReflectance(reading: SensorReading): boolean {
  return reading.red_reflectance !== undefined && reading.nir_reflectance !== undefined
}

export function getDisplayValue(value: number | null | undefined, unit: string = ''): string {
  if (value === null || value === undefined) return 'Not available'
  return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`
}

export const STRESS_TYPES = ['drought', 'nutrient', 'salinity', 'healthy', 'unknown'] as const
export const HEALTH_LABELS = ['healthy', 'mild', 'moderate', 'severe', 'unknown'] as const

export type StressType = (typeof STRESS_TYPES)[number]
export type HealthLabel = (typeof HEALTH_LABELS)[number]