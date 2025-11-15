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
        return "bg-green-50 text-green-600 border-green-600"
      case "Late":
        return "bg-yellow-50 text-yellow-600 border-yellow-600"
      case "Absent":
        return "bg-red-50 text-red-600 border-red-600"
      default:
        return "bg-slate-800 text-slate-400 border-slate-700"
    }
  }

  return (
    <Card className="bg-white border-blue-100">
      <CardHeader>
        <CardTitle className="text-gray-600">Real-time Attendance Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {todayData.map((record, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-500 transition-colors"
            >
              <div className="flex-1">
                <p className="font-semibold text-gray-600">{record.name}</p>
                <p className="text-xs text-gray-400">ID: {record.employeeId}</p>
                <p className="text-xs text-gray-500 mt-1">
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
