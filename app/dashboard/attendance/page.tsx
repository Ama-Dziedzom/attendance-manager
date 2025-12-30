"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { db } from "@/lib/supabase/db"
import { CalendarIcon, Search, Download, Filter, RotateCw, Command, Upload, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

type SortKey = "name" | "clockInTime" | "status" | "totalHours"
type SortOrder = "asc" | "desc"

import { type AttendanceRecord, mapDbAttendanceToAttendance } from "@/lib/types"

export default function AttendancePage() {
  const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({
    start: new Date(),
    end: new Date()
  })
  const [department, setDepartment] = useState("all")
  const [searchName, setSearchName] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortKey, setSortKey] = useState<SortKey>("clockInTime")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [departments, setDepartments] = useState<string[]>([])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault()
        document.getElementById("attendance-search")?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const [isLoading, setIsLoading] = useState(true)

  // Load attendance data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        let startDateStr: string
        let endDateStr: string | undefined

        if (dateRange.start && dateRange.end) {
          startDateStr = format(dateRange.start, "yyyy-MM-dd")
          endDateStr = format(dateRange.end, "yyyy-MM-dd")
        } else {
          // Default to last 30 days if no range is fully selected
          const endDate = new Date()
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - 30)

          startDateStr = format(startDate, "yyyy-MM-dd")
          endDateStr = format(endDate, "yyyy-MM-dd")
        }

        const [records, depts] = await Promise.all([
          db.attendance.getRecords(startDateStr, endDateStr),
          db.departments.getAll(),
        ])

        const mappedRecords: AttendanceRecord[] = records.map(mapDbAttendanceToAttendance)
        setAttendanceData(mappedRecords)

        const uniqueDepts = Array.from(new Set(depts.map((d: any) => d.name))) as string[]
        setDepartments(uniqueDepts)
      } catch (error) {
        console.error("Error loading attendance data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [dateRange.start, dateRange.end])

  const filteredData = useMemo(() => {
    const filtered = attendanceData.filter((record) => {
      const recordDate = record.date
      const startDateStr = dateRange.start ? format(dateRange.start, "yyyy-MM-dd") : ""
      const endDateStr = dateRange.end ? format(dateRange.end, "yyyy-MM-dd") : ""
      const inDateRange = (!startDateStr || recordDate >= startDateStr) && (!endDateStr || recordDate <= endDateStr)

      const inDepartment = department === "all" || record.department === department

      const matchesSearch =
        (record.employeeName || "").toLowerCase().includes(searchName.toLowerCase()) ||
        (record.empId || "").toLowerCase().includes(searchName.toLowerCase())

      const matchesStatus = statusFilter === "all" || record.status === statusFilter

      return inDateRange && inDepartment && matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any
      let bVal: any

      if (sortKey === "name") {
        aVal = a.employeeName || ""
        bVal = b.employeeName || ""
      } else if (sortKey === "clockInTime") {
        aVal = a.clockInTime ? new Date(a.clockInTime).getTime() : 0
        bVal = b.clockInTime ? new Date(b.clockInTime).getTime() : 0
      } else {
        aVal = (a as any)[sortKey]
        bVal = (b as any)[sortKey]
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
    <div className="p-8 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Attendance Report</h1>
          <p className="text-muted-foreground mt-1">View and filter employee attendance records</p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="attendance-search"
            placeholder="Search"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-9 pr-12 bg-background border-input focus:ring-1 focus:ring-primary h-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-50 select-none pointer-events-none">
            {/* <Kbd className="bg-transparent border-none text-[10px]">⌘</Kbd>
            <Kbd className="bg-transparent border-none text-[10px]">F</Kbd> */}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] h-10 justify-start text-left font-normal flex-shrink-0",
                  !dateRange.start && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                <span className="truncate">
                  {dateRange.start ? format(dateRange.start, "PP") : "From Date"}
                </span>
                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateRange.start}
                onSelect={(date) => setDateRange({ ...dateRange, start: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[160px] h-10 justify-start text-left font-normal flex-shrink-0",
                  !dateRange.end && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                <span className="truncate">
                  {dateRange.end ? format(dateRange.end, "PP") : "To Date"}
                </span>
                <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateRange.end}
                onSelect={(date) => setDateRange({ ...dateRange, end: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div className="flex-shrink-0">
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="On Time">On Time</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="Early Departure">Early Departure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <Card className="bg-card border-border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center hover:text-foreground transition-colors uppercase"
                  >
                    Employee {sortKey === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort("clockInTime")}
                    className="flex items-center hover:text-foreground transition-colors uppercase"
                  >
                    Clock In {sortKey === "clockInTime" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clock Out</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort("status")}
                    className="flex items-center ml-auto hover:text-foreground transition-colors uppercase"
                  >
                    Status {sortKey === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredData.map((record, idx) => (
                <tr key={idx} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{record.employeeName}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{record.empId}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{record.department || "-"}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {new Date(record.clockInTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {record.clockOutTime
                      ? new Date(record.clockOutTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{(record.totalHours || 0).toFixed(2)}h</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                      getStatusBadgeColor(record.status === 'on_time' ? "On Time" : record.status === 'late' ? "Late" : record.status)
                    )}>
                      {record.status === 'on_time' ? 'On Time' : record.status === 'late' ? 'Late' : record.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                    No attendance records matching your criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}