"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceFeed } from "@/components/attendance-feed"
import { DashboardMetrics } from "@/components/dashboard-metrics"
import { attendanceStorage, type AttendanceRecord } from "@/lib/storage"

type SortKey = "name" | "clockInTime" | "status" | "totalHours"
type SortOrder = "asc" | "desc"

export default function DashboardPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [sortKey, setSortKey] = useState<SortKey>("clockInTime")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])

  // Load attendance data from storage
  useEffect(() => {
    const loadData = () => {
      const data = attendanceStorage.getByDate(date)
      setAttendanceData(data)
    }
    loadData()
    // Refresh data every 5 seconds to show real-time updates
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [date])

  const todayData = useMemo(() => {
    const filtered = attendanceData.filter((record) => record.date === date)
    
    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortKey]
      let bVal: any = b[sortKey]

      if (sortKey === "clockInTime") {
        aVal = new Date(a.clockInTime).getTime()
        bVal = new Date(b.clockInTime).getTime()
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [date, sortKey, sortOrder])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortOrder("desc")
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "On Time":
        return "bg-green-950 text-green-400"
      case "Late":
        return "bg-yellow-950 text-yellow-400"
      case "Early Departure":
        return "bg-blue-950 text-blue-400"
      default:
        return "bg-slate-800 text-slate-400"
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Attendance Overview for {date}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
        />
      </div>

      {/* Key Metrics */}
      <DashboardMetrics date={date} />

      {/* Real-time Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AttendanceFeed date={date} />
        </div>

        {/* Alerts Section */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-950 border border-red-800 rounded-lg">
              <p className="text-sm font-semibold text-red-400">⚠️ Unauthorized Device</p>
              <p className="text-xs text-red-300 mt-1">John Doe attempted login from unknown device</p>
            </div>
            <div className="p-3 bg-yellow-950 border border-yellow-800 rounded-lg">
              <p className="text-sm font-semibold text-yellow-400">⏰ Late Arrival</p>
              <p className="text-xs text-yellow-300 mt-1">5 employees clocked in after 9:00 AM</p>
            </div>
            <div className="p-3 bg-blue-950 border border-blue-800 rounded-lg">
              <p className="text-sm font-semibold text-blue-400">ℹ️ Info</p>
              <p className="text-xs text-blue-300 mt-1">2 employees still not clocked in</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card className="bg-slate-800 border-slate-700 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-white">Attendance Report Table ({todayData.length} records)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600 bg-slate-700">
                  <th
                    className="px-6 py-3 text-left text-white font-semibold cursor-pointer hover:bg-slate-600 transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    Employee {sortKey === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-6 py-3 text-left text-white font-semibold">ID</th>
                  <th className="px-6 py-3 text-left text-white font-semibold">Department</th>
                  <th
                    className="px-6 py-3 text-left text-white font-semibold cursor-pointer hover:bg-slate-600 transition-colors"
                    onClick={() => toggleSort("clockInTime")}
                  >
                    Clock In {sortKey === "clockInTime" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-6 py-3 text-left text-white font-semibold">Clock Out</th>
                  <th className="px-6 py-3 text-left text-white font-semibold">Hours</th>
                  <th
                    className="px-6 py-3 text-left text-white font-semibold cursor-pointer hover:bg-slate-600 transition-colors"
                    onClick={() => toggleSort("status")}
                  >
                    Status {sortKey === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayData.map((record, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors bg-slate-800">
                    <td className="px-6 py-4 text-white font-medium">{record.name}</td>
                    <td className="px-6 py-4 text-slate-200">{record.employeeId}</td>
                    <td className="px-6 py-4 text-slate-200">{record.department}</td>
                    <td className="px-6 py-4 text-slate-200">
                      {new Date(record.clockInTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-200">
                      {record.clockOutTime
                        ? new Date(record.clockOutTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-200">{record.totalHours.toFixed(2)}h</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
