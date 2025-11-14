"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { attendanceStorage } from "@/lib/storage"
import * as XLSX from 'xlsx' // ← NEW: Import XLSX library

export default function SettingsPage() {
  const [exportFormat, setExportFormat] = useState("excel") // ← MODIFIED: Changed default to excel
  const [dateRange, setDateRange] = useState({
    start: "2025-11-01",
    end: "2025-11-09",
  })
  const [notifications, setNotifications] = useState({
    lateArrivals: true,
    unauthorizedDevices: true,
    dailyReport: true,
    weeklyReport: false,
  })
  const [alertThresholds, setAlertThresholds] = useState({
    lateThreshold: 9,
    clockOutReminder: 17,
    deviceWarning: 3,
  })

  // ← MODIFIED: Updated handleExport function
  const handleExport = () => {
    if (exportFormat === "csv") {
      exportToCSV()
    } else if (exportFormat === "excel") {
      exportToExcel()
    } else if (exportFormat === "pdf") {
      exportToPDF()
    }
  }

  const exportToCSV = () => {
    const allRecords = attendanceStorage.getAll()
    const filtered = allRecords.filter(
      (record) => record.date >= dateRange.start && record.date <= dateRange.end,
    )

    const headers = ["Employee ID", "Name", "Department", "Date", "Clock In", "Clock Out", "Total Hours", "Status"]

    const rows = filtered.map((record) => [
      record.employeeId,
      record.name,
      record.department,
      record.date,
      new Date(record.clockInTime).toLocaleTimeString(),
      record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : "-",
      record.totalHours.toFixed(2),
      record.status,
    ])

    const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `attendance_${dateRange.start}_${dateRange.end}.csv`
    link.click()
  }

  // ← NEW: Excel export function
  const exportToExcel = () => {
    try {
      const allRecords = attendanceStorage.getAll()
      const filtered = allRecords.filter(
        (record) => record.date >= dateRange.start && record.date <= dateRange.end,
      )

      if (filtered.length === 0) {
        alert("No records found for the selected date range.")
        return
      }

      // Create workbook
      const wb = XLSX.utils.book_new()

      // Prepare attendance data
      const attendanceData = filtered.map((record) => ({
        'Employee ID': record.employeeId,
        'Name': record.name,
        'Department': record.department || 'N/A',
        'Date': record.date,
        'Clock In': new Date(record.clockInTime).toLocaleTimeString(),
        'Clock Out': record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : 'Not Clocked Out',
        'Total Hours': record.totalHours ? record.totalHours.toFixed(2) : '-',
        'Status': record.status || getStatus(record)
      }))

      // Create attendance worksheet
      const ws = XLSX.utils.json_to_sheet(attendanceData)

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Employee ID
        { wch: 25 }, // Name
        { wch: 20 }, // Department
        { wch: 12 }, // Date
        { wch: 15 }, // Clock In
        { wch: 15 }, // Clock Out
        { wch: 12 }, // Total Hours
        { wch: 15 }  // Status
      ]

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance')

      // Create summary statistics
      const stats = calculateStatistics(filtered)
      const summaryData = [
        { Metric: 'Total Records', Value: stats.totalRecords },
        { Metric: 'Total Employees', Value: stats.uniqueEmployees },
        { Metric: 'Present', Value: stats.present },
        { Metric: 'Absent', Value: stats.absent },
        { Metric: 'On Time', Value: stats.onTime },
        { Metric: 'Late Arrivals', Value: stats.late },
        { Metric: 'Not Clocked Out', Value: stats.notClockedOut },
        { Metric: 'Total Hours Worked', Value: stats.totalHours.toFixed(2) },
        { Metric: 'Average Hours/Day', Value: stats.averageHours.toFixed(2) },
        { Metric: 'Attendance Rate', Value: `${stats.attendanceRate.toFixed(1)}%` }
      ]

      const summaryWs = XLSX.utils.json_to_sheet(summaryData)
      summaryWs['!cols'] = [{ wch: 25 }, { wch: 20 }]
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

      // Group by department if multiple departments exist
      const departmentGroups = groupByDepartment(filtered)
      if (Object.keys(departmentGroups).length > 1) {
        Object.keys(departmentGroups).forEach(dept => {
          const deptData = departmentGroups[dept].map((record: { employeeId: any; name: any; date: any; clockInTime: string | number | Date; clockOutTime: string | number | Date; totalHours: number; status: any }) => ({
            'Employee ID': record.employeeId,
            'Name': record.name,
            'Date': record.date,
            'Clock In': new Date(record.clockInTime).toLocaleTimeString(),
            'Clock Out': record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString() : 'Not Clocked Out',
            'Total Hours': record.totalHours ? record.totalHours.toFixed(2) : '-',
            'Status': record.status || getStatus(record)
          }))

          const deptWs = XLSX.utils.json_to_sheet(deptData)
          deptWs['!cols'] = [
            { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 15 },
            { wch: 15 }, { wch: 12 }, { wch: 15 }
          ]
          
          // Sanitize department name for sheet name
          const sheetName = dept.substring(0, 31).replace(/[:\\\/?*\[\]]/g, '_')
          XLSX.utils.book_append_sheet(wb, deptWs, sheetName)
        })
      }

      // Generate filename
      const filename = `Attendance_Report_${dateRange.start}_to_${dateRange.end}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)

      alert(`Excel file "${filename}" has been downloaded successfully!`)
    } catch (error) {
      console.error("Excel export error:", error)
      alert("Failed to export to Excel. Please try again.")
    }
  }

  // ← NEW: Helper function to calculate statistics
  const calculateStatistics = (records: any[]) => {
    const uniqueEmployees = new Set(records.map(r => r.employeeId)).size
    const present = records.filter(r => r.clockInTime).length
    const absent = records.filter(r => !r.clockInTime).length
    const notClockedOut = records.filter(r => r.clockInTime && !r.clockOutTime).length
    
    let onTime = 0
    let late = 0
    let totalHours = 0

    records.forEach(record => {
      const status = getStatus(record)
      if (status === 'On Time') onTime++
      if (status === 'Late') late++
      if (record.totalHours) totalHours += record.totalHours
    })

    return {
      totalRecords: records.length,
      uniqueEmployees,
      present,
      absent,
      onTime,
      late,
      notClockedOut,
      totalHours,
      averageHours: totalHours / (present || 1),
      attendanceRate: (present / (present + absent || 1)) * 100
    }
  }

  // ← NEW: Helper function to get attendance status
  const getStatus = (record: any): string => {
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

  // ← NEW: Helper function to group records by department
  const groupByDepartment = (records: any[]) => {
    return records.reduce((acc, record) => {
      const dept = record.department || 'N/A'
      if (!acc[dept]) {
        acc[dept] = []
      }
      acc[dept].push(record)
      return acc
    }, {} as Record<string, any[]>)
  }

  const exportToPDF = () => {
    alert("PDF export functionality would be implemented with a library like jsPDF or pdfkit")
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure dashboard preferences and export data</p>
      </div>

      {/* Export Section */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Export Attendance Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-slate-300 block mb-3 font-semibold">Date Range</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 block mb-2">From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-2">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>
          </div>

          {/* ← MODIFIED: Added Excel option */}
          <div>
            <label className="text-slate-300 block mb-3 font-semibold">Export Format</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="excel"
                  checked={exportFormat === "excel"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="ml-3 text-slate-300 font-semibold">Excel (.xlsx)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="csv"
                  checked={exportFormat === "csv"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="ml-3 text-slate-300">CSV</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="pdf"
                  checked={exportFormat === "pdf"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="ml-3 text-slate-300">PDF Report</span>
              </label>
            </div>
          </div>

          {/* ← NEW: Export preview info */}
          <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
            <p className="text-slate-300 text-sm mb-2">
              <span className="font-semibold">Selected format:</span> {exportFormat.toUpperCase()}
            </p>
            {exportFormat === "excel" && (
              <div className="text-slate-400 text-xs space-y-1">
                <p>✓ Multiple sheets (Attendance, Summary, By Department)</p>
                <p>✓ Formatted columns with proper widths</p>
                <p>✓ Statistical summary included</p>
                <p>✓ Professional layout ready for printing</p>
              </div>
            )}
          </div>

          <Button onClick={handleExport} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
            {exportFormat === "excel" ? "📊 Export to Excel" : exportFormat === "csv" ? "📄 Export to CSV" : "📑 Export to PDF"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: "lateArrivals",
              label: "Late Arrivals Alert",
              description: "Notify when employees clock in after 9:00 AM",
            },
            {
              key: "unauthorizedDevices",
              label: "Unauthorized Device Alert",
              description: "Alert on suspicious device login attempts",
            },
            {
              key: "dailyReport",
              label: "Daily Summary Report",
              description: "Receive daily attendance summary at 6:00 PM",
            },
            {
              key: "weeklyReport",
              label: "Weekly Report",
              description: "Receive weekly attendance trends on Friday",
            },
          ].map((notif) => (
            <label
              key={notif.key}
              className="flex items-start cursor-pointer p-4 bg-slate-700 rounded-lg hover:bg-slate-650 transition-colors"
            >
              <input
                type="checkbox"
                checked={notifications[notif.key as keyof typeof notifications]}
                onChange={(e) =>
                  setNotifications({
                    ...notifications,
                    [notif.key]: e.target.checked,
                  })
                }
                className="w-5 h-5 mt-1 rounded border-slate-600"
              />
              <div className="ml-3 flex-1">
                <p className="font-semibold text-slate-300">{notif.label}</p>
                <p className="text-sm text-slate-400">{notif.description}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-slate-300 block mb-2 font-semibold">Late Arrival Threshold (Hour of Day)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="8"
                max="12"
                value={alertThresholds.lateThreshold}
                onChange={(e) =>
                  setAlertThresholds({
                    ...alertThresholds,
                    lateThreshold: Number.parseInt(e.target.value),
                  })
                }
                className="flex-1"
              />
              <span className="text-slate-300 font-semibold min-w-16">{alertThresholds.lateThreshold}:00 AM</span>
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-2 font-semibold">Clock Out Reminder (Hour of Day)</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="16"
                max="20"
                value={alertThresholds.clockOutReminder}
                onChange={(e) =>
                  setAlertThresholds({
                    ...alertThresholds,
                    clockOutReminder: Number.parseInt(e.target.value),
                  })
                }
                className="flex-1"
              />
              <span className="text-slate-300 font-semibold min-w-16">{alertThresholds.clockOutReminder}:00</span>
            </div>
          </div>

          <div>
            <label className="text-slate-300 block mb-2 font-semibold">Device Registration Warning Threshold</label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5"
                value={alertThresholds.deviceWarning}
                onChange={(e) =>
                  setAlertThresholds({
                    ...alertThresholds,
                    deviceWarning: Number.parseInt(e.target.value),
                  })
                }
                className="flex-1"
              />
              <span className="text-slate-300 font-semibold min-w-16">{alertThresholds.deviceWarning} devices</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">System Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-slate-300 block mb-2 font-semibold">Business Start Hour</label>
            <input
              type="time"
              value="09:00"
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>

          <div>
            <label className="text-slate-300 block mb-2 font-semibold">Business End Hour</label>
            <input
              type="time"
              value="18:00"
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-700">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-slate-800 border-slate-700 border-red-900">
        <CardHeader>
          <CardTitle className="text-white">Data Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-950 border border-red-800 rounded-lg">
            <p className="text-red-400 font-semibold mb-2">Danger Zone</p>
            <p className="text-sm text-red-300 mb-4">These actions cannot be undone. Please proceed with caution.</p>
            <Button variant="outline" className="w-full text-red-400 border-red-700 hover:bg-red-950 bg-transparent">
              Clear All Attendance Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}