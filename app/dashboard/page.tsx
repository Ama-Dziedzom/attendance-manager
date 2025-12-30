"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceFeed } from "@/components/attendance-feed"
import { db } from "@/lib/supabase/db"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import {
  CalendarIcon,
  Users,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { type AttendanceRecord, mapDbAttendanceToAttendance } from "@/lib/types"

type SortKey = "name" | "clockInTime" | "status" | "totalHours"
type SortOrder = "asc" | "desc"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [sortKey, setSortKey] = useState<SortKey>("clockInTime")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Update date string when selectedDate changes
  useEffect(() => {
    const dateString = selectedDate.toISOString().split("T")[0]
    setDate(dateString)
  }, [selectedDate])

  // Load attendance data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        const data = await db.attendance.getRecords(date, date)
        const mapped = data.map(mapDbAttendanceToAttendance)
        setAttendanceData(mapped)
      } catch (error) {
        console.error("Error loading attendance:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [date])

  const todayData = useMemo(() => {
    const filtered = [...attendanceData]

    filtered.sort((a, b) => {
      let aVal: any
      let bVal: any

      if (sortKey === "name") {
        aVal = a.employeeName || ''
        bVal = b.employeeName || ''
      } else if (sortKey === "clockInTime") {
        aVal = new Date(a.clockInTime).getTime()
        bVal = new Date(b.clockInTime).getTime()
      } else if (sortKey === "totalHours") {
        aVal = a.totalHours || 0
        bVal = b.totalHours || 0
      } else if (sortKey === "status") {
        aVal = a.status
        bVal = b.status
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return filtered
  }, [attendanceData, sortKey, sortOrder])

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = todayData.length
    const present = todayData.filter(r => r.clockInTime).length
    const onTime = todayData.filter(r => r.status === "on_time").length
    const late = todayData.filter(r => r.status === "late").length
    const avgHours = total > 0
      ? todayData.reduce((sum, r) => sum + (r.totalHours || 0), 0) / total
      : 0

    return { total, present, onTime, late, avgHours }
  }, [todayData])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortOrder("desc")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "on_time":
        return <Badge variant="default" className="bg-green-500">On Time</Badge>
      case "late":
        return <Badge variant="default" className="bg-yellow-500">Late</Badge>
      case "early_departure":
        return <Badge variant="default" className="bg-blue-500">Early</Badge>
      case "half_day":
        return <Badge variant="default" className="bg-purple-500">Half Day</Badge>
      case "absent":
        return <Badge variant="destructive">Absent</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />
    return sortOrder === "asc" ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Attendance Overview for {format(selectedDate, "MMMM dd, yyyy")}
          </p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[240px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground">
              Tracked today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.present}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.total > 0 ? ((metrics.present / metrics.total) * 100).toFixed(1) : 0}% attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.onTime}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.late} late arrivals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Per employee today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Feed */}
      <AttendanceFeed date={date} />

      {/* Attendance Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-lg font-semibold text-foreground">Attendance Records</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            View and manage attendance for {format(selectedDate, "MMMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto mt-6">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center hover:text-foreground transition-colors uppercase"
                  >
                    Employee
                    {getSortIcon("name")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort("clockInTime")}
                    className="flex items-center hover:text-foreground transition-colors uppercase"
                  >
                    Clock In
                    {getSortIcon("clockInTime")}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clock Out</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort("totalHours")}
                    className="flex items-center hover:text-foreground transition-colors uppercase"
                  >
                    Hours
                    {getSortIcon("totalHours")}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <button
                    onClick={() => toggleSort("status")}
                    className="flex items-center ml-auto hover:text-foreground transition-colors uppercase"
                  >
                    Status
                    {getSortIcon("status")}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {todayData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                    No attendance records for this date
                  </td>
                </tr>
              ) : (
                todayData.map((record, idx) => (
                  <tr key={idx} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{record.employeeName}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{record.empId}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{record.department || '-'}</td>
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
                    <td className="px-6 py-4 text-right">{getStatusBadge(record.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
