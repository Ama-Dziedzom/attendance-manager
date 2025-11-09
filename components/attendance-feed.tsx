"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { attendanceStorage } from "@/lib/storage"
import { useEffect, useState } from "react"

interface AttendanceFeedProps {
  date: string
}

export function AttendanceFeed({ date }: AttendanceFeedProps) {
  const [todayData, setTodayData] = useState(
    attendanceStorage
      .getByDate(date)
      .slice(0, 10)
      .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime())
  )

  useEffect(() => {
    const loadData = () => {
      const data = attendanceStorage
        .getByDate(date)
        .slice(0, 10)
        .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime())
      setTodayData(data)
    }
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [date])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Time":
        return "bg-green-950 text-green-400 border-green-800"
      case "Late":
        return "bg-yellow-950 text-yellow-400 border-yellow-800"
      case "Absent":
        return "bg-red-950 text-red-400 border-red-800"
      default:
        return "bg-slate-800 text-slate-400 border-slate-700"
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Real-time Attendance Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {todayData.map((record, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-slate-700 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors"
            >
              <div className="flex-1">
                <p className="font-semibold text-white">{record.name}</p>
                <p className="text-xs text-slate-400">ID: {record.employeeId}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Clocked in at {new Date(record.clockInTime).toLocaleTimeString()}
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(record.status)}`}>
                {record.status}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
