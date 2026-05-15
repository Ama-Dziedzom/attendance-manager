"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { db } from "@/lib/supabase/db"
import { CalendarIcon, Download, ChevronDown, FileSpreadsheet, FileText, File } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { toast } from "sonner"

// Reusable components
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"
import { DataTable, useTableSort, type ColumnDef } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"

// Utilities
import { cn, formatTimeLocale, formatHours } from "@/lib/utils"
import { type AttendanceRecord, mapDbAttendanceToAttendance } from "@/lib/types"
import { exportAttendanceReport } from "@/lib/export-utils"

type SortKey = "name" | "clockInTime" | "status" | "totalHours"

export default function AttendancePage() {
  const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({
    start: new Date(),
    end: new Date()
  })
  const [department, setDepartment] = useState("all")
  const [searchName, setSearchName] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { sortKey, sortOrder, toggleSort } = useTableSort<SortKey>("clockInTime", "desc")

  // Load attendance data from Supabase
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)

      let startDateStr: string
      let endDateStr: string | undefined

      if (dateRange.start && dateRange.end) {
        startDateStr = format(dateRange.start, "yyyy-MM-dd")
        endDateStr = format(dateRange.end, "yyyy-MM-dd")
      } else {
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

      setAttendanceData(records.map(mapDbAttendanceToAttendance))
      setDepartments(Array.from(new Set(depts.map((d: any) => d.name))) as string[])
    } catch (error) {
      console.error("Error loading attendance data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [dateRange.start, dateRange.end])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter and sort data
  const filteredData = useMemo(() => {
    const filtered = attendanceData.filter((record) => {
      // Note: Date filtering is handled by the backend query in loadData
      // No need to filter by date here since attendanceData is already filtered
      const inDepartment = department === "all" || record.department === department
      const matchesSearch =
        (record.employeeName || "").toLowerCase().includes(searchName.toLowerCase()) ||
        (record.empId || "").toLowerCase().includes(searchName.toLowerCase())
      const matchesStatus = statusFilter === "all" || record.status === statusFilter

      return inDepartment && matchesSearch && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any

      switch (sortKey) {
        case "name":
          aVal = a.employeeName || ""
          bVal = b.employeeName || ""
          break
        case "clockInTime":
          aVal = a.clockInTime ? new Date(a.clockInTime).getTime() : 0
          bVal = b.clockInTime ? new Date(b.clockInTime).getTime() : 0
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

    return filtered
  }, [department, searchName, statusFilter, sortKey, sortOrder, attendanceData])

  // Export handler
  const handleExport = useCallback((exportFormat: 'excel' | 'pdf') => {
    try {
      if (filteredData.length === 0) {
        toast.error('No data to export', {
          description: 'Please adjust your filters to include records.',
        })
        return
      }

      const dateRangeStr = dateRange.start && dateRange.end
        ? `${format(dateRange.start, 'yyyy-MM-dd')}_to_${format(dateRange.end, 'yyyy-MM-dd')}`
        : format(new Date(), 'yyyy-MM-dd')

      exportAttendanceReport(filteredData, {
        format: exportFormat,
        filename: `attendance_report_${dateRangeStr}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`,
        dateRange: {
          start: dateRange.start || new Date(),
          end: dateRange.end || new Date()
        }
      })

      toast.success(`Report exported successfully`, {
        description: `Your ${exportFormat.toUpperCase()} report has been downloaded.`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Failed to export report',
      })
    }
  }, [filteredData, dateRange])

  // Table columns
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
      render: (row) => row.department || "-",
    },
    {
      key: "clockInTime",
      header: "Clock In",
      sortable: true,
      className: "text-muted-foreground",
      render: (row) => formatTimeLocale(row.clockInTime),
    },
    {
      key: "clockOutTime",
      header: "Clock Out",
      className: "text-muted-foreground",
      render: (row) => formatTimeLocale(row.clockOutTime),
    },
    {
      key: "totalHours",
      header: "Hours",
      className: "text-muted-foreground",
      render: (row) => formatHours(row.totalHours, 2),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      align: "right",
      render: (row) => <StatusBadge status={row.status} variant="pill" />,
    },
  ]

  return (
    <div className="p-8 space-y-10">
      <PageHeader
        title="Attendance Report"
        description="View and filter employee attendance records"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2 cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              <span>Export as Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2 cursor-pointer">
              <File className="h-4 w-4 text-red-600" />
              <span>Export as PDF</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          inputId="attendance-search"
          placeholder="Search"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
        />

        <div className="flex items-center gap-3 flex-wrap lg:flex-nowrap justify-end">
          {/* Date Range Selectors */}
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

          {/* Department Filter */}
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="w-[160px] h-10 flex-shrink-0">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-10 flex-shrink-0">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="on_time">On Time</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="early_departure">Early Departure</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={(key) => toggleSort(key as SortKey)}
        emptyMessage="No attendance records matching your criteria"
        pagination
      />
    </div>
  )
}