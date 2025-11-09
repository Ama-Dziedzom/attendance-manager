"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { attendanceStorage, type AttendanceRecord } from "@/lib/storage"

type SortKey = "name" | "clockInTime" | "status" | "totalHours"
type SortOrder = "asc" | "desc"

export default function AttendancePage() {
  const [dateRange, setDateRange] = useState({ start: new Date().toISOString().split("T")[0], end: new Date().toISOString().split("T")[0] })
  const [department, setDepartment] = useState("all")
  const [searchName, setSearchName] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("clockInTime")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])

  const departments = ["Engineering", "HR", "Sales", "Marketing", "Finance"]

  // Load attendance data from storage
  useEffect(() => {
    const loadData = () => {
      const allRecords = attendanceStorage.getAll()
      setAttendanceData(allRecords)
    }
    loadData()
    // Refresh data every 5 seconds
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredData = useMemo(() => {
    const filtered = attendanceData.filter((record) => {
      const recordDate = record.date
      const inDateRange = recordDate >= dateRange.start && recordDate <= dateRange.end

      const inDepartment = department === "all" || record.department === department

      const matchesSearch =
        record.name.toLowerCase().includes(searchName.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchName.toLowerCase())

      const matchesStatus = statusFilter === "all" || record.status === statusFilter

      return inDateRange && inDepartment && matchesSearch && matchesStatus
    })

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
  }, [dateRange, department, searchName, statusFilter, sortKey, sortOrder])

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
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Attendance Report</h1>
        <p className="text-slate-400 mt-1">View and filter employee attendance</p>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-2">From Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-2">To Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-2">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="On Time">On Time</option>
                <option value="Late">Late</option>
                <option value="Early Departure">Early Departure</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-2">Search</label>
              <Input
                placeholder="Name or ID"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-white">Attendance Records ({filteredData.length})</CardTitle>
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
                {filteredData.map((record, idx) => (
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
