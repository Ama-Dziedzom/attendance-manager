"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { attendanceStorage, type AttendanceRecord } from "@/lib/storage"
import { CalendarIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SortKey = "name" | "clockInTime" | "status" | "totalHours"
type SortOrder = "asc" | "desc"

export default function AttendancePage() {
  const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({ 
    start: new Date(), 
    end: new Date() 
  })
  const [showStartCalendar, setShowStartCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)
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
      const startDateStr = dateRange.start?.toISOString().split("T")[0] || ""
      const endDateStr = dateRange.end?.toISOString().split("T")[0] || ""
      const inDateRange = (!startDateStr || recordDate >= startDateStr) && (!endDateStr || recordDate <= endDateStr)

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
  }, [dateRange, department, searchName, statusFilter, sortKey, sortOrder, attendanceData])

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
        return "bg-green-50 text-green-600 border border-green-300"
      case "Late":
        return "bg-yellow-50 text-yellow-600 border border-yellow-300"
      case "Early Departure":
        return "bg-blue-950 text-blue-400"
      default:
        return "bg-slate-800 text-slate-400"
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance Report</h1>
        <p className="text-slate-400 mt-1">View and filter employee attendance</p>
      </div>

      {/* Filters */}
      <Card className="bg-white border-blue-100">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <label className="text-sm text-slate-600 block mb-2">From Date</label>
              <button
                onClick={() => setShowStartCalendar(!showStartCalendar)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 text-sm flex items-center justify-between hover:bg-slate-50"
              >
                <span>{dateRange.start?.toLocaleDateString() || "Select date"}</span>
                <CalendarIcon className="h-4 w-4 text-slate-500" />
              </button>
              {showStartCalendar && (
                <div className="absolute z-10 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg">
                  <Calendar
                    mode="single"
                    selected={dateRange.start}
                    onSelect={(date) => {
                      setDateRange({ ...dateRange, start: date })
                      setShowStartCalendar(false)
                    }}
                    initialFocus
                  />
                </div>
              )}
            </div>
            <div className="relative">
              <label className="text-sm text-slate-600 block mb-2">To Date</label>
              <button
                onClick={() => setShowEndCalendar(!showEndCalendar)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 text-sm flex items-center justify-between hover:bg-slate-50"
              >
                <span>{dateRange.end?.toLocaleDateString() || "Select date"}</span>
                <CalendarIcon className="h-4 w-4 text-slate-500" />
              </button>
              {showEndCalendar && (
                <div className="absolute z-10 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg">
                  <Calendar
                    mode="single"
                    selected={dateRange.end}
                    onSelect={(date) => {
                      setDateRange({ ...dateRange, end: date })
                      setShowEndCalendar(false)
                    }}
                    initialFocus
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-2">Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 text-sm"
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
              <label className="text-sm text-slate-600 block mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-slate-900 text-sm"
              >
                <option value="all">All Status</option>
                <option value="On Time">On Time</option>
                <option value="Late">Late</option>
                <option value="Early Departure">Early Departure</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 block mb-2">Search</label>
              <Input
                placeholder="Name or ID"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-blue-100">
        <CardHeader>
          <CardTitle className="text-gray-600">Attendance Records ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-50 hover:bg-blue-50">
                  <TableHead
                    className="text-gray-700 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    Employee {sortKey === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">ID</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Department</TableHead>
                  <TableHead
                    className="text-gray-700 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => toggleSort("clockInTime")}
                  >
                    Clock In {sortKey === "clockInTime" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="text-gray-700 font-semibold">Clock Out</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Hours</TableHead>
                  <TableHead
                    className="text-gray-700 font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => toggleSort("status")}
                  >
                    Status {sortKey === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((record, idx) => (
                  <TableRow key={idx} className="hover:bg-blue-50">
                    <TableCell className="font-medium text-gray-700">{record.name}</TableCell>
                    <TableCell className="text-gray-700">{record.employeeId}</TableCell>
                    <TableCell className="text-gray-700">{record.department}</TableCell>
                    <TableCell className="text-gray-700">
                      {new Date(record.clockInTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {record.clockOutTime
                        ? new Date(record.clockOutTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-gray-700">{record.totalHours.toFixed(2)}h</TableCell>
                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(record.status)}`}
                      >
                        {record.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}