"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AttendanceFeed } from "@/components/attendance-feed"
import { attendanceStorage, type AttendanceRecord } from "@/lib/storage"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type SortKey = "name" | "clockInTime" | "status" | "totalHours"
type SortOrder = "asc" | "desc"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [sortKey, setSortKey] = useState<SortKey>("clockInTime")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])

  // Update date string when selectedDate changes
  useEffect(() => {
    const dateString = selectedDate.toISOString().split("T")[0]
    setDate(dateString)
  }, [selectedDate])

  // Load attendance data from storage
  useEffect(() => {
    const loadData = () => {
      const data = attendanceStorage.getByDate(date)
      setAttendanceData(data)
    }
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [date])

  const todayData = useMemo(() => {
    const filtered = attendanceData.filter((record) => record.date === date)
    
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

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = todayData.length
    const present = todayData.filter(r => r.clockInTime).length
    const onTime = todayData.filter(r => r.status === "On Time").length
    const late = todayData.filter(r => r.status === "Late").length
    const avgHours = total > 0 
      ? todayData.reduce((sum, r) => sum + r.totalHours, 0) / total 
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
      case "On Time":
        return <Badge variant="default" className="bg-green-500">On Time</Badge>
      case "Late":
        return <Badge variant="default" className="bg-yellow-500">Late</Badge>
      case "Early Departure":
        return <Badge variant="default" className="bg-blue-500">Early</Badge>
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
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            View and manage attendance for {format(selectedDate, "MMMM dd, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("name")}
                    className="h-8 w-full justify-start p-0 hover:bg-transparent"
                  >
                    Employee
                    {getSortIcon("name")}
                  </Button>
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("clockInTime")}
                    className="h-8 w-full justify-start p-0 hover:bg-transparent"
                  >
                    Clock In
                    {getSortIcon("clockInTime")}
                  </Button>
                </TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("totalHours")}
                    className="h-8 w-full justify-start p-0 hover:bg-transparent"
                  >
                    Hours
                    {getSortIcon("totalHours")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort("status")}
                    className="h-8 w-full justify-start p-0 hover:bg-blue-200"
                  >
                    Status
                    {getSortIcon("status")}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No attendance records for this date
                  </TableCell>
                </TableRow>
              ) : (
                todayData.map((record, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>{record.employeeId}</TableCell>
                    <TableCell>{record.department}</TableCell>
                    <TableCell>
                      {new Date(record.clockInTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      {record.clockOutTime
                        ? new Date(record.clockOutTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>{record.totalHours.toFixed(2)}h</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}