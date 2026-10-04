import { HTMLAttributes, forwardRef } from 'react'
import { Badge } from './Badge'

export interface Column<T> {
  key: string
  header: string
  render?: (value: unknown, row: T, index: number) => React.ReactNode
  className?: string
}

interface TableProps<T> extends HTMLAttributes<HTMLTableElement> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T, index: number) => string
  emptyMessage?: string
  striped?: boolean
  hoverable?: boolean
}

export function Table<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  striped = true,
  hoverable = true,
  className = '',
  ...props
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500">
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={`overflow-x-auto ${className}`} {...props}>
      <table className="min-w-full divide-y divide-neutral-200">
        <thead className="bg-neutral-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-neutral-200">
          {data.map((row, rowIndex) => (
            <tr
              key={keyExtractor(row, rowIndex)}
              className={`
                ${hoverable ? 'hover:bg-neutral-50 transition-colors' : ''}
                ${striped && rowIndex % 2 === 1 ? 'bg-neutral-50/50' : ''}
              `}
            >
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 text-sm text-neutral-900 ${column.className || ''}`}>
                  {column.render ? column.render(row[column.key as keyof T], row, rowIndex) : String(row[column.key as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <Badge variant="neutral">Unknown</Badge>

  const normalized = value.toLowerCase()
  if (['healthy'].includes(normalized)) return <Badge variant="success">{value}</Badge>
  if (['mild'].includes(normalized)) return <Badge variant="info">{value}</Badge>
  if (['moderate'].includes(normalized)) return <Badge variant="warning">{value}</Badge>
  if (['severe'].includes(normalized)) return <Badge variant="danger">{value}</Badge>
  return <Badge variant="neutral">{value}</Badge>
}

export function StressBadge({ value }: { value: string | null | undefined }) {
  if (!value) return <Badge variant="neutral">Unknown</Badge>

  const normalized = value.toLowerCase()
  if (['healthy'].includes(normalized)) return <Badge variant="success">{value}</Badge>
  if (['drought', 'nutrient', 'salinity'].includes(normalized)) return <Badge variant="warning">{value}</Badge>
  return <Badge variant="neutral">{value}</Badge>
}