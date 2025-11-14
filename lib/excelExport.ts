"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileSpreadsheet, Calendar } from "lucide-react"
import { 
  exportDailyAttendanceToExcel, 
  exportDateRangeAttendanceToExcel,
  exportEmployeeAttendanceToExcel 
} from "@/lib/excelExport"
import { attendanceStorage } from "@/lib/storage"

interface ExportButtonsProps {
  // Optional: pass specific records to export
  records?: any[]
  // Optional: employee filter
  employeeId?: string
  employeeName?: string
}

export function ExportButtons({ records, employeeId, employeeName }: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false)

  // Export today's attendance
  const handleExportToday = async () => {
    setIsExporting(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const todayRecords = records || attendanceStorage.getByDate(today)
      
      // Transform records to match Excel format
      const formattedRecords = todayRecords.map(record => ({
        employeeId: record.employeeId,
        name: record.employeeName,
        department: record.department || 'N/A',
        clockInTime: record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString() : '-',
        clockOutTime: record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : undefined,
        totalHours: record.totalHours?.toFixed(2) || '-',
        status: getAttendanceStatus(record),
        date: new Date(record.clockInTime).toLocaleDateString()
      }))

      exportDailyAttendanceToExcel(formattedRecords, today)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Failed to export. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // Export date range
  const handleExportDateRange = async () => {
    const startDate = prompt("Enter start date (YYYY-MM-DD):")
    const endDate = prompt("Enter end date (YYYY-MM-DD):")
    
    if (!startDate || !endDate) return

    setIsExporting(true)
    try {
      const rangeRecords = attendanceStorage.getByDateRange(startDate, endDate)
      
      const formattedRecords = rangeRecords.map(record => ({
        employeeId: record.employeeId,
        name: record.employeeName,
        department: record.department || 'N/A',
        clockInTime: record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString() : '-',
        clockOutTime: record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : undefined,
        totalHours: record.totalHours?.toFixed(2) || '-',
        status: getAttendanceStatus(record),
        date: new Date(record.clockInTime).toLocaleDateString()
      }))

      exportDateRangeAttendanceToExcel(formattedRecords, startDate, endDate)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Failed to export. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // Export specific employee
  const handleExportEmployee = async () => {
    if (!employeeId || !employeeName) {
      alert("Employee information not available")
      return
    }

    setIsExporting(true)
    try {
      const employeeRecords = attendanceStorage.getByEmployeeId(employeeId)
      
      const formattedRecords = employeeRecords.map(record => ({
        employeeId: record.employeeId,
        name: record.employeeName,
        department: record.department || 'N/A',
        clockInTime: record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString() : '-',
        clockOutTime: record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : undefined,
        totalHours: record.totalHours?.toFixed(2) || '-',
        status: getAttendanceStatus(record),
        date: new Date(record.clockInTime).toLocaleDateString()
      }))

      exportEmployeeAttendanceToExcel(employeeId, employeeName, formattedRecords)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Failed to export. Please try again.")
    } finally {
      setIsExporting(false)
    }
  }

  // Determine attendance status
  const getAttendanceStatus = (record: any): 'On Time' | 'Late' | 'Absent' | 'Not Clocked Out' => {
    if (!record.clockInTime) return 'Absent'
    if (!record.clockOutTime) return 'Not Clocked Out'
    
    const clockInTime = new Date(record.clockInTime)
    const hour = clockInTime.getHours()
    const minute = clockInTime.getMinutes()
    
    // Late if after 9:00 AM
    if (hour > 9 || (hour === 9 && minute > 0)) {
      return 'Late'
    }
    
    return 'On Time'
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={handleExportToday}
        disabled={isExporting}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" />
        Export Today
      </Button>

      <Button
        onClick={handleExportDateRange}
        disabled={isExporting}
        variant="outline"
        className="border-green-600 text-green-600 hover:bg-green-50"
      >
        <Calendar className="w-4 h-4 mr-2" />
        Export Date Range
      </Button>

      {employeeId && employeeName && (
        <Button
          onClick={handleExportEmployee}
          disabled={isExporting}
          variant="outline"
          className="border-blue-600 text-blue-600 hover:bg-blue-50"
        >
          <Download className="w-4 h-4 mr-2" />
          Export {employeeName}
        </Button>
      )}

      {isExporting && (
        <span className="text-sm text-gray-500 flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
          Exporting...
        </span>
      )}
    </div>
  )
}

// Alternative: Single export button with dropdown menu
export function ExportDropdownButton({ records }: ExportButtonsProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <Download className="w-4 h-4 mr-2" />
        Export to Excel
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <button
              onClick={() => {
                // Export logic here
                setIsOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export Today's Attendance
            </button>
            <button
              onClick={() => {
                // Export logic here
                setIsOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export This Week
            </button>
            <button
              onClick={() => {
                // Export logic here
                setIsOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export This Month
            </button>
            <button
              onClick={() => {
                // Export logic here
                setIsOpen(false)
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export Custom Range
            </button>
          </div>
        </div>
      )}
    </div>
  )
}