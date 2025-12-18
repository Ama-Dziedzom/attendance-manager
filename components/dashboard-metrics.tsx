"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/lib/supabase/db"

interface MetricsProps {
  date?: string
}

export function DashboardMetrics({ date }: MetricsProps) {
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    clockedIn: 0,
    onTime: 0,
    late: 0,
    absent: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setIsLoading(true)

        // Get today's date if not provided
        const targetDate = date || new Date().toISOString().split('T')[0]

        // Get all active employees
        const employees = await db.employees.getAll()
        const totalEmployees = employees.length

        // Get today's attendance records
        const attendanceRecords = await db.attendance.getRecords(targetDate, targetDate)

        // Calculate metrics
        const clockedIn = attendanceRecords.length
        const onTime = attendanceRecords.filter(r => r.status === 'on_time').length
        const late = attendanceRecords.filter(r => r.status === 'late').length
        const absent = Math.max(0, totalEmployees - clockedIn)

        setMetrics({
          totalEmployees,
          clockedIn,
          onTime,
          late,
          absent,
        })
      } catch (error) {
        console.error("Error loading metrics:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadMetrics()

    // Refresh metrics every 30 seconds
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [date])

  const metricCards = [
    {
      label: "Total Employees",
      value: metrics.totalEmployees,
      icon: "👥",
      color: "bg-slate-950 border-slate-800",
      textColor: "text-slate-400",
    },
    {
      label: "Present Today",
      value: metrics.clockedIn,
      icon: "✓",
      color: "bg-green-950 border-green-800",
      textColor: "text-green-400",
    },
    {
      label: "On Time",
      value: metrics.onTime,
      icon: "⭐",
      color: "bg-blue-950 border-blue-800",
      textColor: "text-blue-400",
    },
    {
      label: "Late Arrivals",
      value: metrics.late,
      icon: "⏰",
      color: "bg-yellow-950 border-yellow-800",
      textColor: "text-yellow-400",
    },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-slate-950 border-slate-800 border">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-800 rounded w-24 mb-4"></div>
                <div className="h-8 bg-slate-800 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

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
