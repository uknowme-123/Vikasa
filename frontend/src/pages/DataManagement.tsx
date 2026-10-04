import { useState } from 'react'
import { FileUpload } from '../components/forms/FileUpload'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Table } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { AlertBanner } from '../components/ui/AlertBanner'
import { Button } from '../components/ui/Button'
import type { CSVValidationResult, SensorReadingWithMeta } from '../types/sensor'
import { Upload, Database, Table as TableIcon, AlertTriangle, CheckCircle, FileText, Eye } from 'lucide-react'

const DATA_SET_TYPES = [
  { id: 'environmental', label: 'Environmental Data', description: 'Temperature, humidity, soil moisture, ambient light', icon: Database },
  { id: 'spectroscopy', label: 'Tomato Spectroscopy', description: 'Red/NIR reflectance, NDVI, calibrated optical readings', icon: TableIcon },
  { id: 'supplementary', label: 'Supplementary Spectral', description: 'Unverified additional spectral bands (experimental)', icon: AlertTriangle },
] as const

type DataSetType = typeof DATA_SET_TYPES[number]['id']

export function DataManagement() {
  const [validationResults, setValidationResults] = useState<CSVValidationResult[]>([])
  const [selectedDataset, setSelectedDataset] = useState<DataSetType>('environmental')
  const [showPreview, setShowPreview] = useState<SensorReadingWithMeta[] | null>(null)

  const handleValidate = async (file: File): Promise<CSVValidationResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const result = parseAndValidateCSV(text)
        resolve(result)
      }
      reader.readAsText(file)
    })
  }

  const handleResultsChange = (results: CSVValidationResult[]) => {
    setValidationResults(results)
  }

  const getDatasetReadings = (): SensorReadingWithMeta[] => {
    if (showPreview) return showPreview
    return []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <TableIcon className="h-7 w-7 text-vikasa-600" />
            Data Management
          </h1>
          <p className="text-neutral-500 mt-1">Upload, validate, and inspect CSV sensor data files</p>
        </div>
        <Badge variant="warning" className="demo-badge">Demo Data</Badge>
      </div>

      <AlertBanner variant="info" className="text-sm">
        <strong>Data separation policy:</strong> Environmental data, tomato spectroscopy data, and unverified supplementary spectral data must be kept separate.
        Do not merge datasets or imply they contain actual Vikāsa hardware readings. Each dataset type has distinct validation rules and calibration requirements.
      </AlertBanner>

      <div className="grid gap-6 lg:grid-cols-3">
        {DATA_SET_TYPES.map((dataset) => (
          <Card key={dataset.id} className={selectedDataset === dataset.id ? 'ring-2 ring-vikasa-500' : ''}>
            <CardBody className="p-5">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="dataset"
                  value={dataset.id}
                  checked={selectedDataset === dataset.id}
                  onChange={() => setSelectedDataset(dataset.id)}
                  className="sr-only"
                />
                <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-vikasa-100 flex items-center justify-center flex-shrink-0">
                    <dataset.icon className="h-5 w-5 text-vikasa-700" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{dataset.label}</p>
                    <p className="text-sm text-neutral-500 mt-1">{dataset.description}</p>
                  </div>
                </div>
              </label>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <Upload className="h-5 w-5 text-vikasa-600" />
            CSV Upload & Validation
          </h3>
          <Badge variant="info">Expected: 24 columns per schema</Badge>
        </CardHeader>
        <CardBody className="pt-0">
          <FileUpload
            onValidate={handleValidate}
            acceptedTypes={['.csv', 'text/csv']}
            maxSizeMB={10}
            multiple={true}
          />
        </CardBody>
      </Card>

      {validationResults.length > 0 && (
        <div className="space-y-6">
          {validationResults.map((result, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-vikasa-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">Validation Result</h3>
                    <p className="text-xs text-neutral-500">
                      {result.rowCount} rows • {result.columns.length} columns • {result.valid ? 'Valid' : 'Invalid'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={result.valid ? 'success' : 'danger'}>
                    {result.valid ? 'Valid' : 'Invalid'}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview(result.preview)}>
                    <Eye className="h-4 w-4 mr-1" /> Preview
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="pt-0">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2">Columns Found</h4>
                    <div className="flex flex-wrap gap-1">
                      {result.columns.map((col) => (
                        <Badge key={col} variant={result.missingColumns.includes(col) ? 'danger' : 'neutral'} className="text-xs">
                          {col}
                        </Badge>
                      ))}
                      {result.extraColumns.map((col) => (
                        <Badge key={col} variant="info" className="text-xs">
                          {col} (extra)
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-neutral-700 mb-2">Validation Summary</h4>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Required columns:</dt>
                        <dd className="font-medium">{DATA_SET_TYPES.find(d => d.id === selectedDataset)?.label} schema: 24 expected</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Missing required:</dt>
                        <dd className="font-medium text-red-600">{result.missingColumns.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Extra columns:</dt>
                        <dd className="font-medium text-blue-600">{result.extraColumns.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Warnings:</dt>
                        <dd className="font-medium text-amber-600">{result.warnings.length}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">Errors:</dt>
                        <dd className="font-medium text-red-600">{result.errors.length}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {result.missingColumns.length > 0 && (
                  <AlertBanner variant="danger" className="mt-4 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Missing required columns:</strong> {result.missingColumns.join(', ')}
                  </AlertBanner>
                )}

                {result.warnings.length > 0 && (
                  <AlertBanner variant="warning" className="mt-4 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Warnings:</strong>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </AlertBanner>
                )}

                {result.errors.length > 0 && (
                  <AlertBanner variant="danger" className="mt-4 text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Errors:</strong>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </AlertBanner>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {showPreview && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">Data Preview (First 5 Rows)</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(null)}>
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
          </CardHeader>
          <CardBody className="pt-0">
            <Table
              data={showPreview}
              columns={[
                { key: 'reading_id', header: 'Reading ID', render: (v) => <code className="text-xs">{v as string}</code> },
                { key: 'plant_id', header: 'Plant' },
                { key: 'session_id', header: 'Session' },
                { key: 'timestamp', header: 'Timestamp', render: (v) => new Date(v as string).toLocaleString() },
                { key: 'species', header: 'Species' },
                { key: 'stress_type', header: 'Stress Type' },
                { key: 'health_label', header: 'Health' },
                { key: 'red_raw', header: 'Red Raw', render: (v) => v !== undefined ? String(v) : '—' },
                { key: 'nir_raw', header: 'NIR Raw', render: (v) => v !== undefined ? String(v) : '—' },
                { key: 'red_reflectance', header: 'Red Refl. (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : 'Not calibrated' },
                { key: 'nir_reflectance', header: 'NIR Refl. (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : 'Not calibrated' },
                { key: 'ndvi', header: 'NDVI', render: (v) => v !== undefined ? v.toFixed(3) : '—' },
                { key: 'temperature_c', header: 'Temp (°C)', render: (v) => v !== undefined ? `${v.toFixed(1)}°C` : '—' },
                { key: 'humidity_pct', header: 'Humidity (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : '—' },
                { key: 'soil_moisture_pct', header: 'Soil Moist. (%)', render: (v) => v !== undefined ? `${v.toFixed(1)}%` : '—' },
              ]}
              keyExtractor={(row, i) => `${row.reading_id}-${i}`}
              emptyMessage="No preview data"
            />
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-neutral-900">Dataset Compatibility Notes</h3>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 bg-vikasa-50 rounded-lg border border-vikasa-200">
              <h4 className="font-medium text-vikasa-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Environmental Data
              </h4>
              <ul className="mt-2 text-sm text-vikasa-700 space-y-1">
                <li>• Temperature, humidity, soil moisture, ambient light</li>
                <li>• No optical calibration required</li>
                <li>• Compatible across all sensor nodes</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 flex items-center gap-2">
                <TableIcon className="h-5 w-5" /> Tomato Spectroscopy
              </h4>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• Red/NIR reflectance, NDVI</li>
                <li>• Requires Spectralon reference calibration</li>
                <li>• Species-specific (Solanum lycopersicum)</li>
              </ul>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-medium text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Supplementary Spectral
              </h4>
              <ul className="mt-2 text-sm text-amber-700 space-y-1">
                <li>• Additional spectral bands (experimental)</li>
                <li>• No validated calibration procedure</li>
                <li>• Do not merge with validated datasets</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function parseAndValidateCSV(text: string): CSVValidationResult {
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

  const EXPECTED_CSV_COLUMNS = [
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