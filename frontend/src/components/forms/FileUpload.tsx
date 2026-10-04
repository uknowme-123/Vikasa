import { useCallback, useState, DragEvent, ChangeEvent } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { AlertBanner } from '../ui/AlertBanner'
import { Badge } from '../ui/Badge'
import type { CSVValidationResult, SensorReadingWithMeta } from '../../types/sensor'

interface FileUploadProps {
  onValidate: (file: File) => Promise<CSVValidationResult>
  acceptedTypes?: string[]
  maxSizeMB?: number
  multiple?: boolean
}

export function FileUpload({
  onValidate,
  acceptedTypes = ['.csv', 'text/csv'],
  maxSizeMB = 10,
  multiple = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<CSVValidationResult[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const validateFile = useCallback(
    async (file: File) => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        return {
          valid: false,
          rowCount: 0,
          columns: [],
          missingColumns: [],
          extraColumns: [],
          warnings: [],
          errors: [`File size exceeds ${maxSizeMB}MB limit`],
          preview: [],
        }
      }
      return onValidate(file)
    },
    [onValidate, maxSizeMB]
  )

  const handleFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      setFiles((prev) => [...prev, ...fileArray])
      setIsValidating(true)

      const validationResults = await Promise.all(fileArray.map(validateFile))
      setResults((prev) => [...prev, ...validationResults])
      setIsValidating(false)
    },
    [validateFile]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragActive(false)
      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setResults((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearAll = useCallback(() => {
    setFiles([])
    setResults([])
  }, [])

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-vikasa-500 bg-vikasa-50'
            : 'border-neutral-300 hover:border-neutral-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={isValidating}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-neutral-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-neutral-700">
            Drag & drop CSV files here, or click to browse
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Accepts: {acceptedTypes.join(', ')} • Max {maxSizeMB}MB per file
          </p>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-900">
              {files.length} file{files.length > 1 ? 's' : ''} selected
            </h3>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all
            </Button>
          </div>

          {files.map((file, index) => {
            const result = results[index]
            const isPending = !result && isValidating
            const hasError = result && !result.valid
            const hasWarnings = result && result.warnings.length > 0

            return (
              <div key={index} className="card p-4">
                <div className="flex items-start gap-4">
                  <FileText className="flex-shrink-0 h-10 w-10 text-neutral-400" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                      <span className="text-xs text-neutral-500">{(file.size / 1024).toFixed(1)} KB</span>
                      {isPending && (
                        <span className="flex items-center gap-1 text-xs text-vikasa-600">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Validating...
                        </span>
                      )}
                      {result && !isPending && (
                        <Badge variant={hasError ? 'danger' : hasWarnings ? 'warning' : 'success'}>
                          {hasError ? 'Invalid' : hasWarnings ? 'Warnings' : 'Valid'}
                        </Badge>
                      )}
                    </div>

                    {result && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-neutral-600">{result.rowCount} rows • {result.columns.length} columns</p>
                        {result.missingColumns.length > 0 && (
                          <AlertBanner variant="danger" className="text-xs p-2">
                            Missing columns: {result.missingColumns.join(', ')}
                          </AlertBanner>
                        )}
                        {result.extraColumns.length > 0 && (
                          <AlertBanner variant="info" className="text-xs p-2">
                            Extra columns: {result.extraColumns.join(', ')}
                          </AlertBanner>
                        )}
                        {result.warnings.length > 0 && (
                          <AlertBanner variant="warning" className="text-xs p-2">
                            {result.warnings.map((w, i) => (
                              <p key={i} className="text-xs">{w}</p>
                            ))}
                          </AlertBanner>
                        )}
                        {result.errors.length > 0 && (
                          <AlertBanner variant="danger" className="text-xs p-2">
                            {result.errors.map((e, i) => (
                              <p key={i} className="text-xs">{e}</p>
                            ))}
                          </AlertBanner>
                        )}
                      </div>
                    )}

                    {result && result.preview.length > 0 && (
                      <details className="mt-3">
                        <summary className="text-xs text-vikasa-600 hover:text-vikasa-700 cursor-pointer">
                          Preview first {result.preview.length} rows
                        </summary>
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left text-neutral-500">
                                {result.preview[0] && Object.keys(result.preview[0]).map((key) => (
                                  <th key={key} className="px-2 py-1">{key}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {result.preview.map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-t border-neutral-200">
                                  {Object.values(row).map((val, cellIdx) => (
                                    <td key={cellIdx} className="px-2 py-1 text-neutral-900">
                                      {val === undefined || val === null ? (
                                        <span className="text-neutral-400 italic">—</span>
                                      ) : (
                                        String(val)
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(index)} aria-label="Remove file">
                    <X className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {results.some((r) => r.valid) && (
        <AlertBanner variant="success" className="text-sm">
          <CheckCircle className="h-4 w-4" aria-hidden="true" />
          <span>{results.filter((r) => r.valid).length} file(s) ready for import</span>
        </AlertBanner>
      )}
    </div>
  )
}