"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
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
  Clock,
  TrendingUp,
} from "lucide-react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// Reusable components
import { MetricsGrid } from "@/components/ui/metric-card"
import { DataTable, useTableSort, type ColumnDef, type SortOrder } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"

// Utilities
import { formatTimeLocale, formatHours, REFRESH_INTERVALS } from "@/lib/utils"
import { type AttendanceRecord, mapDbAttendanceToAttendance } from "@/lib/types"

type SortKey = "name" | "clockInTime" | "status" | "totalHours"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const { sortKey, sortOrder, toggleSort } = useTableSort<SortKey>("clockInTime", "desc")

  const date = useMemo(() => selectedDate.toISOString().split("T")[0], [selectedDate])

  // Load attendance data from Supabase
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [records, activeEmployees] = await Promise.all([
        db.attendance.getRecords(date, date),
        db.employees.getAll(false),
      ])

      const activeIds = new Set(activeEmployees.map(e => e.id))

      const mappedActive = activeEmployees.map(emp => {
        const record = records.find(r => r.employee_id === emp.id)
        if (record) {
          return mapDbAttendanceToAttendance(record)
        }
        // Create absent record for employees without attendance
        return {
          id: `absent-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          empId: emp.emp_id || '',
          department: emp.department?.name || null,
          agency: emp.agency?.name || null,
          date,
          clockInTime: "",
          clockOutTime: null,
          totalHours: 0,
          status: 'absent' as const,
          verificationMethod: 'none',
          locationName: null,
          shiftName: null,
          shiftStartTime: null,
          shiftEndTime: null,
        }
      })

      const extraRecords = records
        .filter(r => !activeIds.has(r.employee_id))
        .map(mapDbAttendanceToAttendance)

      setAttendanceData([...mappedActive, ...extraRecords])
      setTotalEmployees(activeEmployees.length)
    } catch (error) {
      console.error("Error loading attendance:", error)
    } finally {
      setIsLoading(false)
    }
  }, [date])

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role === 'front_desk') {
          router.push('/dashboard/attendance')
        }
      }
    }
    checkRole()
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, REFRESH_INTERVALS.DASHBOARD)
    return () => clearInterval(interval)
  }, [loadData])

  // Sort and filter data
  const todayData = useMemo(() => {
    const sorted = [...attendanceData]

    sorted.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortKey) {
        case "name":
          aVal = a.employeeName || ''
          bVal = b.employeeName || ''
          break
        case "clockInTime":
          if (!a.clockInTime && !b.clockInTime) return 0
          if (!a.clockInTime) return 1
          if (!b.clockInTime) return -1
          aVal = new Date(a.clockInTime).getTime()
          bVal = new Date(b.clockInTime).getTime()
          break
        case "totalHours":
          aVal = a.totalHours || 0
          bVal = b.totalHours || 0
          break
        case "status":
          aVal = a.status
          bVal = b.status
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1
      return 0
    })

    return sorted
  }, [attendanceData, sortKey, sortOrder])

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = totalEmployees
    const present = todayData.filter(r => r.status !== "absent").length
    const onTime = todayData.filter(r => r.status === "on_time").length
    const late = todayData.filter(r => r.status === "late").length
    const attendanceCount = present
    const avgHours = attendanceCount > 0
      ? todayData.reduce((sum, r) => sum + (r.totalHours || 0), 0) / attendanceCount
      : 0

    return { total, present, onTime, late, avgHours }
  }, [todayData, totalEmployees])

  // Metric cards configuration
  const metricCards = [
    {
      title: "Total Employees",
      value: metrics.total,
      subtitle: "Tracked today",
      icon: Users,
    },
    {
      title: "Present",
      value: metrics.present,
      subtitle: `${metrics.total > 0 ? ((metrics.present / metrics.total) * 100).toFixed(1) : 0}% rate`,
      icon: UserCheck,
    },
    {
      title: "On Time",
      value: metrics.onTime,
      subtitle: `${metrics.late} late arrivals`,
      icon: Clock,
    },
    {
      title: "Avg Hours",
      value: `${metrics.avgHours.toFixed(1)}h`,
      subtitle: "Per employee today",
      icon: TrendingUp,
    },
  ]

  // Table columns configuration
  const columns: ColumnDef<AttendanceRecord>[] = [
    {
      key: "name",
      header: "Employee",
      sortable: true,
      className: "font-medium text-foreground",
      render: (row) => row.employeeName,
    },
    {
      key: "empId",
      header: "ID",
      className: "text-foreground",
      render: (row) => row.empId,
    },
    {
      key: "department",
      header: "Department",
      className: "text-muted-foreground",
      render: (row) => row.department || '-',
    },
    {
      key: "clockInTime",
      header: "Clock In",
      sortable: true,
      className: "text-muted-foreground",
      render: (row) => formatTimeLocale(row.clockInTime || undefined),
    },
    {
      key: "clockOutTime",
      header: "Clock Out",
      className: "text-muted-foreground",
      render: (row) => formatTimeLocale(row.clockOutTime || undefined),
    },
    {
      key: "totalHours",
      header: "Hours",
      sortable: true,
      className: "text-muted-foreground",
      render: (row) => formatHours(row.totalHours, 2),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "right",
      render: (row) => <StatusBadge status={row.status} />,
    },
  ]

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
            <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
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
      <MetricsGrid metrics={metricCards} isLoading={isLoading} />

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
        <div className="mt-6">
          <DataTable
            data={todayData}
            columns={columns}
            sortKey={sortKey}
            sortOrder={sortOrder}
            onSort={(key) => toggleSort(key as SortKey)}
            emptyMessage="No attendance records for this date"
            className="border-0 shadow-none"
            pagination
          />
        </div>
      </Card>
    </div>
  )
}
