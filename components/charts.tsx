"use client"

interface DataPoint {
  [key: string]: string | number
}

interface LineChartProps {
  data: DataPoint[]
  lines: Array<{ key: string; color: string; name: string }>
}

interface BarChartProps {
  data: Array<{ name: string; value: number }>
}

export function LineChart({ data, lines }: LineChartProps) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(...data.flatMap((d) => lines.map((l) => (d[l.key] as number) || 0)))

  return (
    <div className="w-full h-64 flex items-end gap-8 p-4 bg-slate-700/30 rounded-lg">
      {data.map((point, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex gap-1 items-end h-40">
            {lines.map((line) => {
              const value = (point[line.key] as number) || 0
              const height = (value / maxValue) * 100
              return (
                <div
                  key={line.key}
                  className="flex-1 rounded-t"
                  style={{
                    height: `${height}%`,
                    backgroundColor: line.color,
                    minHeight: "4px",
                  }}
                  title={`${line.name}: ${value}`}
                />
              )
            })}
          </div>
          <span className="text-xs text-slate-400">{String(point[Object.keys(point)[0]])}</span>
        </div>
      ))}
    </div>
  )
}

export function BarChart({ data }: BarChartProps) {
  if (!data || data.length === 0) return null

  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className="w-full space-y-4">
      {data.map((item, idx) => {
        const percentage = (item.value / maxValue) * 100
        return (
          <div key={idx}>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-300">{item.name}</span>
              <span className="text-sm font-semibold text-white">{item.value}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PieChart() {
  return <div className="w-24 h-24 rounded-full bg-gradient-to-r from-green-500 to-blue-500"></div>
}
