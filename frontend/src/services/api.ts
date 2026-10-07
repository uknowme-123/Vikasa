import { EXPECTED_CSV_COLUMNS, SensorReadingSchema, type AlertItem, type CSVValidationResult, type PlantSummary, type SensorReadingWithMeta, type SystemStatus } from '../types/sensor'
import * as demo from './demoData'

export interface DataProvider {
  mode: 'demo' | 'api'
  getReadings(): Promise<SensorReadingWithMeta[]>
  getPlantSummaries(): Promise<PlantSummary[]>
  getSystemStatus(): Promise<SystemStatus>
  getAlerts(): Promise<AlertItem[]>
  validateCSV(file: File): Promise<CSVValidationResult>
}

function parseCSV(text: string): CSVValidationResult {
  const lines = text.trim() ? text.trim().split(/\r?\n/) : []
  const columns = lines[0]?.split(',').map((value) => value.trim()) ?? []
  const missingColumns = EXPECTED_CSV_COLUMNS.filter((column) => !columns.includes(column))
  const extraColumns = columns.filter((column) => !EXPECTED_CSV_COLUMNS.includes(column as never))
  const missingValues: Record<string, number> = {}
  const preview: SensorReadingWithMeta[] = []
  const warnings: string[] = ['CSV data is kept separate from demo and hardware readings.', 'Review provenance and calibration before analysis.']
  for (const column of columns) missingValues[column] = 0
  lines.slice(1).forEach((line, index) => {
    const values = line.split(',')
    const row: Record<string, string> = {}
    columns.forEach((column, columnIndex) => {
      row[column] = values[columnIndex]?.trim() ?? ''
      if (!row[column]) missingValues[column] = (missingValues[column] ?? 0) + 1
    })
    const parsed = SensorReadingSchema.safeParse({
      ...row,
      red_raw: row.red_raw ? Number(row.red_raw) : undefined,
      nir_raw: row.nir_raw ? Number(row.nir_raw) : undefined,
      red_reflectance: row.red_reflectance ? Number(row.red_reflectance) : undefined,
      nir_reflectance: row.nir_reflectance ? Number(row.nir_reflectance) : undefined,
      ndvi: row.ndvi ? Number(row.ndvi) : undefined,
      temperature_c: row.temperature_c ? Number(row.temperature_c) : undefined,
      humidity_pct: row.humidity_pct ? Number(row.humidity_pct) : undefined,
      soil_moisture_pct: row.soil_moisture_pct ? Number(row.soil_moisture_pct) : undefined,
      soil_moisture_raw: row.soil_moisture_raw ? Number(row.soil_moisture_raw) : undefined,
      ambient_light_raw: row.ambient_light_raw ? Number(row.ambient_light_raw) : undefined,
    })
    if (parsed.success && preview.length < 5) preview.push({ ...parsed.data, _meta: { source: 'csv', rowIndex: index + 1, validationWarnings: ['CSV provenance requires review'] } })
  })
  const errors = missingColumns.length ? [`Missing columns: ${missingColumns.join(', ')}`] : []
  return { valid: errors.length === 0, rowCount: Math.max(0, lines.length - 1), columns, missingColumns, extraColumns, missingValues, warnings, errors, preview }
}

export const demoProvider: DataProvider = {
  mode: 'demo',
  getReadings: demo.fetchDemoReadings,
  getPlantSummaries: demo.fetchDemoPlantSummaries,
  getSystemStatus: demo.fetchDemoStatus,
  getAlerts: demo.fetchDemoAlerts,
  validateCSV: async (file) => parseCSV(await file.text()),
}

export function createFlaskProvider(baseUrl: string): DataProvider {
  const api = baseUrl.replace(/\/$/, '')
  async function get<T>(path: string): Promise<T> {
    const response = await fetch(`${api}${path}`)
    if (!response.ok) throw new Error(`API request failed: ${response.status}`)
    const body: unknown = await response.json()
    if (typeof body === 'object' && body !== null && 'data' in body) {
      return (body as { data: T }).data
    }
    return body as T
  }
  async function getReadings(): Promise<SensorReadingWithMeta[]> {
    const body = await get<unknown>('/api/readings')
    if (Array.isArray(body)) return body as SensorReadingWithMeta[]
    if (typeof body === 'object' && body !== null && 'items' in body) {
      return (body as { items: SensorReadingWithMeta[] }).items
    }
    throw new Error('API returned an unsupported readings response')
  }
  async function getPlantSummaries(): Promise<PlantSummary[]> {
    const summaries = await get<Array<{
      plant_id: string
      species: string | null
      latest_timestamp: string | null
      health_label: string | null
      reading_count: number
    }>>('/api/plants/summaries')
    return summaries.map((summary) => ({
      plant_id: summary.plant_id,
      species: summary.species,
      latestReading: null,
      readingCount: summary.reading_count,
      healthLabel: summary.health_label,
      lastUpdated: summary.latest_timestamp,
    }))
  }
  async function getSystemStatus(): Promise<SystemStatus> {
    const status = await get<{
      api: SystemStatus['api']
      esp32: SystemStatus['esp32']
      storage_backend: string
      storage_healthy: boolean
      last_sync: string | null
    }>('/api/system/status')
    return {
      api: status.api,
      esp32: status.esp32,
      storageBackend: status.storage_backend,
      storageHealthy: status.storage_healthy,
      lastSync: status.last_sync,
    }
  }
  async function getAlerts(): Promise<AlertItem[]> {
    const body = await get<{ alerts: AlertItem[] }>('/api/alerts')
    return body.alerts
  }
  return {
    mode: 'api',
    getReadings,
    getPlantSummaries,
    getSystemStatus,
    getAlerts,
    validateCSV: async (file) => parseCSV(await file.text()),
  }
}
let provider: DataProvider = demoProvider
export const setDataProvider = (next: DataProvider) => { provider = next }
export const getDataProvider = () => provider
