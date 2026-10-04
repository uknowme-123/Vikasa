import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardBody } from '../ui/Card'
import type { SensorReadingWithMeta } from '../../types/sensor'

interface TimeSeriesChartProps {
  data: SensorReadingWithMeta[]
  field: keyof SensorReadingWithMeta
  title: string
  unit?: string
  color?: string
  height?: number
  showLegend?: boolean
}

export function TimeSeriesChart({
  data,
  field,
  title,
  unit = '',
  color = '#16a34a',
  height = 300,
  showLegend = false,
}: TimeSeriesChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center h-64">
          <p className="text-neutral-500">No data available for {title}</p>
        </CardBody>
      </Card>
    )
  }

  const chartData = data
    .filter((d) => d[field] !== undefined && d[field] !== null)
    .map((d) => ({
      timestamp: d.timestamp,
      value: d[field] as number,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  if (chartData.length === 0) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center h-64">
          <p className="text-neutral-500">No valid data points for {title}</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody>
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">{title}</h3>
        <div className="h-[{height}px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                tick={{ fontSize: 11, fill: '#737373' }}
                axisLine={{ stroke: '#e5e5e5' }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => `${value}${unit ? ` ${unit}` : ''}`}
                tick={{ fontSize: 11, fill: '#737373' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleString()}
                formatter={(value: number) => [`${value.toFixed(2)}${unit ? ` ${unit}` : ''}`, title]}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              {showLegend && <Legend />}
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}

interface MultiLineChartProps {
  data: SensorReadingWithMeta[]
  fields: { key: keyof SensorReadingWithMeta; label: string; color: string; unit?: string }[]
  title: string
  height?: number
}

export function MultiLineChart({ data, fields, title, height = 350 }: MultiLineChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center h-64">
          <p className="text-neutral-500">No data available</p>
        </CardBody>
      </Card>
    )
  }

  const chartData = data
    .map((d) => {
      const point: Record<string, number | string> = { timestamp: d.timestamp }
      fields.forEach((f) => {
        const val = d[f.key]
        point[f.key as string] = val !== undefined && val !== null ? (val as number) : null
      })
      return point
    })
    .sort((a, b) => new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime())

  const hasValidData = fields.some((f) => chartData.some((d) => d[f.key] !== null))

  if (!hasValidData) {
    return (
      <Card>
        <CardBody className="flex items-center justify-center h-64">
          <p className="text-neutral-500">No valid data points for any series</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardBody>
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">{title}</h3>
        <div className="h-[{height}px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                tick={{ fontSize: 11, fill: '#737373' }}
                axisLine={{ stroke: '#e5e5e5' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#737373' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                labelFormatter={(value) => new Date(value as string).toLocaleString()}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e5e5', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              {fields.map((f) => (
                <Line
                  key={f.key as string}
                  type="monotone"
                  dataKey={f.key as string}
                  stroke={f.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: f.color }}
                  name={f.label}
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  )
}