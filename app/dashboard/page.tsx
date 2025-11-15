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
  }, [attendanceData, date, sortKey, sortOrder])

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
        return "bg-green-100 text-green-800 border border-green-200"
      case "Late":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200"
      case "Early Departure":
        return "bg-blue-100 text-blue-800 border border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200"
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Attendance Overview for {date}</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
        <Card className="bg-white border-blue-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800">⚠️ Unauthorized Device</p>
              <p className="text-xs text-red-600 mt-1">John Doe attempted login from unknown device</p>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800">⏰ Late Arrival</p>
              <p className="text-xs text-yellow-600 mt-1">5 employees clocked in after 9:00 AM</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-800">ℹ️ Info</p>
              <p className="text-xs text-blue-600 mt-1">2 employees still not clocked in</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card className="bg-white border-blue-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
          <CardTitle className="text-gray-900">Attendance Report Table ({todayData.length} records)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-100 bg-blue-50">
                  <th
                    className="px-6 py-3 text-left text-gray-900 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    Employee {sortKey === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-6 py-3 text-left text-gray-900 font-semibold">ID</th>
                  <th className="px-6 py-3 text-left text-gray-900 font-semibold">Department</th>
                  <th
                    className="px-6 py-3 text-left text-gray-900 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => toggleSort("clockInTime")}
                  >
                    Clock In {sortKey === "clockInTime" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                  <th className="px-6 py-3 text-left text-gray-900 font-semibold">Clock Out</th>
                  <th className="px-6 py-3 text-left text-gray-900 font-semibold">Hours</th>
                  <th
                    className="px-6 py-3 text-left text-gray-900 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => toggleSort("status")}
                  >
                    Status {sortKey === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {todayData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No attendance records for this date
                    </td>
                  </tr>
                ) : (
                  todayData.map((record, idx) => (
                    <tr 
                      key={idx} 
                      className="border-b border-gray-100 hover:bg-blue-50 transition-colors bg-white"
                    >
                      <td className="px-6 py-4 text-gray-900 font-medium">{record.name}</td>
                      <td className="px-6 py-4 text-gray-700">{record.employeeId}</td>
                      <td className="px-6 py-4 text-gray-700">{record.department}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {new Date(record.clockInTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {record.clockOutTime
                          ? new Date(record.clockOutTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{record.totalHours.toFixed(2)}h</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(record.status)}`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}