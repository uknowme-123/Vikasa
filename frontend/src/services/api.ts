import type { SensorReading, SensorReadingWithMeta, CSVValidationResult, PlantSummary, SessionSummary, SystemStatus } from '../types/sensor'
import * as demoData from './demoData'
import { EXPECTED_CSV_COLUMNS } from '../types/sensor'

export interface DataProvider {
  getReadings: () => Promise<SensorReadingWithMeta[]>
  getPlantSummaries: () => Promise<PlantSummary[]>
  getSessionSummaries: () => Promise<SessionSummary[]>
  getSystemStatus: () => Promise<SystemStatus>
  getReadingsForPlant: (plantId: string) => SensorReadingWithMeta[]
  getReadingsForSession: (sessionId: string) => SensorReadingWithMeta[]
  validateCSV: (file: File) => Promise<CSVValidationResult>
}

export const demoProvider: DataProvider = {
  getReadings: demoData.fetchDemoReadings,
  getPlantSummaries: demoData.fetchDemoPlantSummaries,
  getSessionSummaries: demoData.fetchDemoSessionSummaries,
  getSystemStatus: demoData.fetchDemoSystemStatus,
  getReadingsForPlant: demoData.getReadingsForPlant,
  getReadingsForSession: demoData.getReadingsForSession,
  validateCSV: async (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const result = parseAndValidateCSV(text)
        resolve(result)
      }
      reader.readAsText(file)
    })
  },
}

export function parseAndValidateCSV(text: string): CSVValidationResult {
  const lines = text.trim().split('\n')
  if (lines.length === 0) {
    return {
      valid: false,
      rowCount: 0,
      columns: [],
      missingColumns: [],
      extraColumns: [],
      warnings: ['Empty file'],
      errors: ['No data found'],
      preview: [],
    }
  }

  const headerLine = lines[0]
  const columns = headerLine.split(',').map((c) => c.trim())

  const missingColumns = EXPECTED_CSV_COLUMNS.filter((col) => !columns.includes(col))
  const extraColumns = columns.filter((col) => !EXPECTED_CSV_COLUMNS.includes(col))

  const warnings: string[] = []
  const errors: string[] = []

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`)
  }

  if (extraColumns.length > 0) {
    warnings.push(`Extra columns detected: ${extraColumns.join(', ')}`)
  }

  const preview: SensorReadingWithMeta[] = []
  const dataLines = lines.slice(1, 6)

  dataLines.forEach((line, index) => {
    const values = line.split(',').map((v) => v.trim())
    const row: Record<string, string> = {}
    columns.forEach((col, i) => {
      row[col] = values[i] ?? ''
    })

    const reading: SensorReadingWithMeta = {
      reading_id: row.reading_id || `ROW-${index + 1}`,
      plant_id: row.plant_id || 'UNKNOWN',
      session_id: row.session_id || 'UNKNOWN',
      timestamp: row.timestamp || new Date().toISOString(),
      species: row.species || undefined,
      stress_type: row.stress_type || undefined,
      health_label: row.health_label || undefined,
      label_evidence: row.label_evidence || undefined,
      red_raw: row.red_raw ? parseInt(row.red_raw, 10) : undefined,
      nir_raw: row.nir_raw ? parseInt(row.nir_raw, 10) : undefined,
      red_dark: row.red_dark ? parseInt(row.red_dark, 10) : undefined,
      nir_dark: row.nir_dark ? parseInt(row.nir_dark, 10) : undefined,
      red_reference: row.red_reference ? parseInt(row.red_reference, 10) : undefined,
      nir_reference: row.nir_reference ? parseInt(row.nir_reference, 10) : undefined,
      red_reflectance: row.red_reflectance ? parseFloat(row.red_reflectance) : undefined,
      nir_reflectance: row.nir_reflectance ? parseFloat(row.nir_reflectance) : undefined,
      ndvi: row.ndvi ? parseFloat(row.ndvi) : undefined,
      temperature_c: row.temperature_c ? parseFloat(row.temperature_c) : undefined,
      humidity_pct: row.humidity_pct ? parseFloat(row.humidity_pct) : undefined,
      soil_moisture_raw: row.soil_moisture_raw ? parseInt(row.soil_moisture_raw, 10) : undefined,
      soil_moisture_pct: row.soil_moisture_pct ? parseFloat(row.soil_moisture_pct) : undefined,
      ambient_light_raw: row.ambient_light_raw ? parseInt(row.ambient_light_raw, 10) : undefined,
      operator_id: row.operator_id || 'CSV-IMPORT',
      notes: row.notes || undefined,
      _meta: {
        source: 'csv',
        rowIndex: index + 1,
        validationWarnings: [
          'CSV import - validate calibration before use',
          ...(row.red_reflectance || row.nir_reflectance ? [] : ['Calibrated reflectance missing']),
        ],
      },
    }
    preview.push(reading)
  })

  const rowCount = lines.length - 1

  return {
    valid: errors.length === 0,
    rowCount,
    columns,
    missingColumns,
    extraColumns,
    warnings,
    errors,
    preview,
  }
}

let currentProvider: DataProvider = demoProvider

export function setDataProvider(provider: DataProvider): void {
  currentProvider = provider
}

export function getDataProvider(): DataProvider {
  return currentProvider
}

export async function checkApiHealth(baseUrl: string): Promise<SystemStatus> {
  const apiBase = baseUrl.replace(/\/$/, '')
  try {
    const response = await fetch(`${apiBase}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      const data = await response.json()
      return {
        api: 'connected',
        esp32: data.esp32 ?? 'unknown',
        firebase: data.firebase ?? 'unknown',
        lastSync: data.lastSync ?? new Date().toISOString(),
      }
    }
    return { api: 'disconnected', esp32: 'unknown', firebase: 'unknown', lastSync: null }
  } catch {
    return { api: 'disconnected', esp32: 'unknown', firebase: 'unknown', lastSync: null }
  }
}

export async function createFlaskProvider(baseUrl: string): Promise<DataProvider> {
  const apiBase = baseUrl.replace(/\/$/, '')

  async function fetchJSON<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${apiBase}${endpoint}`)
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  return {
    getReadings: () => fetchJSON<SensorReadingWithMeta[]>('/api/readings'),
    getPlantSummaries: () => fetchJSON<PlantSummary[]>('/api/plants/summaries'),
    getSessionSummaries: () => fetchJSON<SessionSummary[]>('/api/sessions/summaries'),
    getSystemStatus: () => fetchJSON<SystemStatus>('/api/system/status'),
    getReadingsForPlant: (plantId: string) => {
      throw new Error('Use getReadings and filter client-side, or implement dedicated endpoint')
    },
    getReadingsForSession: (sessionId: string) => {
      throw new Error('Use getReadings and filter client-side, or implement dedicated endpoint')
    },
    validateCSV: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${apiBase}/api/data/validate-csv`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error(`CSV validation failed: ${response.status}`)
      }
      return response.json()
    },
  }
}