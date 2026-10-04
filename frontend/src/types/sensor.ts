import { z } from 'zod'

export const SensorReadingSchema = z.object({
  reading_id: z.string().min(1),
  plant_id: z.string().min(1),
  session_id: z.string().min(1),
  timestamp: z.string().min(1),
  species: z.string().optional(),
  stress_type: z.string().optional(),
  health_label: z.string().optional(),
  label_evidence: z.string().optional(),
  red_raw: z.number().finite().nonnegative().optional(),
  nir_raw: z.number().finite().nonnegative().optional(),
  red_dark: z.number().finite().nonnegative().optional(),
  nir_dark: z.number().finite().nonnegative().optional(),
  red_reference: z.number().finite().nonnegative().optional(),
  nir_reference: z.number().finite().nonnegative().optional(),
  red_reflectance: z.number().finite().min(0).max(100).optional(),
  nir_reflectance: z.number().finite().min(0).max(100).optional(),
  ndvi: z.number().finite().min(-1).max(1).optional(),
  temperature_c: z.number().finite().optional(),
  humidity_pct: z.number().finite().min(0).max(100).optional(),
  soil_moisture_raw: z.number().finite().nonnegative().optional(),
  soil_moisture_pct: z.number().finite().min(0).max(100).optional(),
  ambient_light_raw: z.number().finite().nonnegative().optional(),
  operator_id: z.string().min(1),
  notes: z.string().optional(),
})

export type SensorReading = z.infer<typeof SensorReadingSchema>
export interface SensorReadingWithMeta extends SensorReading {
  _meta?: { source: 'demo' | 'csv' | 'api'; rowIndex?: number; validationWarnings?: string[] }
}
export interface PlantSummary {
  plant_id: string
  species: string | null
  latestReading: SensorReading | null
  readingCount: number
  healthLabel: string | null
  lastUpdated: string | null
}
export interface SystemStatus {
  api: 'connected' | 'disconnected' | 'unknown'
  esp32: 'connected' | 'disconnected' | 'unknown'
  firebase: 'connected' | 'disconnected' | 'unknown'
  lastSync: string | null
}
export interface AlertItem {
  id: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  detail: string
  timestamp: string
  plantId?: string
}
export interface CSVValidationResult {
  valid: boolean
  rowCount: number
  columns: string[]
  missingColumns: string[]
  extraColumns: string[]
  missingValues: Record<string, number>
  warnings: string[]
  errors: string[]
  preview: SensorReadingWithMeta[]
}
export const EXPECTED_CSV_COLUMNS = [
  'reading_id', 'plant_id', 'session_id', 'timestamp', 'species', 'stress_type',
  'health_label', 'label_evidence', 'red_raw', 'nir_raw', 'red_dark', 'nir_dark',
  'red_reference', 'nir_reference', 'red_reflectance', 'nir_reflectance', 'ndvi',
  'temperature_c', 'humidity_pct', 'soil_moisture_raw', 'soil_moisture_pct',
  'ambient_light_raw', 'operator_id', 'notes',
] as const

export function calculateNDVI(red: number | undefined, nir: number | undefined) {
  if (red === undefined || nir === undefined || red + nir === 0) return undefined
  return (nir - red) / (nir + red)
}
export function hasCalibratedReflectance(reading: SensorReading) {
  return reading.red_reflectance !== undefined && reading.nir_reflectance !== undefined
}
export function displayValue(value: number | undefined, unit = '') {
  return value === undefined ? 'Not available' : `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`
}
