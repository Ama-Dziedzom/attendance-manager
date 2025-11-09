"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { attendanceStorage, employeeStorage } from "@/lib/storage"

interface MetricsProps {
  date: string
}

export function DashboardMetrics({ date }: MetricsProps) {
  const [metrics, setMetrics] = useState({
    clockedIn: 0,
    absent: 0,
    late: 0,
    earlyDeparture: 0,
  })

  useEffect(() => {
    const loadMetrics = () => {
      const todayData = attendanceStorage.getByDate(date)
      const totalEmployees = employeeStorage.getAll().length

      setMetrics({
        clockedIn: todayData.filter((r) => r.clockInTime).length,
        absent: Math.max(0, totalEmployees - todayData.length),
        late: todayData.filter((r) => r.status === "Late").length,
        earlyDeparture: todayData.filter((r) => r.status === "Early Departure").length,
      })
    }
    
    loadMetrics()
    const interval = setInterval(loadMetrics, 5000)
    return () => clearInterval(interval)
  }, [date])

  const metricCards = [
    {
      label: "Total Clocked In",
      value: metrics.clockedIn,
      icon: "✓",
      color: "bg-green-950 border-green-800",
      textColor: "text-green-400",
    },
    {
      label: "Absences",
      value: metrics.absent,
      icon: "✗",
      color: "bg-red-950 border-red-800",
      textColor: "text-red-400",
    },
    {
      label: "Late Arrivals",
      value: metrics.late,
      icon: "⏰",
      color: "bg-yellow-950 border-yellow-800",
      textColor: "text-yellow-400",
    },
    {
      label: "Early Departures",
      value: metrics.earlyDeparture,
      icon: "→",
      color: "bg-blue-950 border-blue-800",
      textColor: "text-blue-400",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, idx) => (
        <Card key={idx} className={`${metric.color} border`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{metric.label}</p>
                <p className={`text-3xl font-bold ${metric.textColor} mt-2`}>{metric.value}</p>
              </div>
              <div className={`text-4xl opacity-20`}>{metric.icon}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
