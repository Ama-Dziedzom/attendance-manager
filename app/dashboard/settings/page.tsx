"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { attendanceStorage } from "@/lib/storage"

export default function SettingsPage() {
  const [exportFormat, setExportFormat] = useState("csv")
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

  const handleExport = () => {
    if (exportFormat === "csv") {
      exportToCSV()
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

          <div>
            <label className="text-slate-300 block mb-3 font-semibold">Export Format</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="csv"
                  checked={exportFormat === "csv"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="ml-3 text-slate-300">CSV (Excel)</span>
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

          <Button onClick={handleExport} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
            Export Data
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
