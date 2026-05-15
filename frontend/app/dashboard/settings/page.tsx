"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
// import { attendanceStorage } from "@/lib/storage" // TODO: Replace with Supabase
import * as XLSX from 'xlsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { supabase } from "@/lib/supabase/client"
import { Database } from "@/lib/database.types"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon, FileSpreadsheet, FileText, Save, AlertTriangle, Trash2, KeyRound, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileData?.role !== 'it' && profileData?.role !== 'super_admin') {
          router.push('/dashboard')
          return
        }
        setProfile(profileData)
      }
      setIsLoading(false)
    }
    checkRole()
  }, [router])

  const [exportFormat, setExportFormat] = useState("excel")
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

  // Security state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Export functions (same logic, just moved for cleaner component)
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
    // const allRecords = attendanceStorage.getAll()
    const allRecords: any[] = [] // TODO: Replace with Supabase
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

  const exportToExcel = () => {
    try {
      // const allRecords = attendanceStorage.getAll()
      const allRecords: any[] = [] // TODO: Replace with Supabase
      const filtered = allRecords.filter(
        (record) => record.date >= dateRange.start && record.date <= dateRange.end,
      )

      if (filtered.length === 0) {
        alert("No records found for the selected date range.")
        return
      }

      const wb = XLSX.utils.book_new()
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

      const ws = XLSX.utils.json_to_sheet(attendanceData)
      ws['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 12 },
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance')

      // (Simplified stats for brevity in this refactor, but kept logic structure)
      const stats = calculateStatistics(filtered)
      const summaryData = [
        { Metric: 'Total Records', Value: stats.totalRecords },
        { Metric: 'Attendance Rate', Value: `${stats.attendanceRate.toFixed(1)}%` }
      ]
      const summaryWs = XLSX.utils.json_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

      const filename = `Attendance_Report_${dateRange.start}_to_${dateRange.end}.xlsx`
      XLSX.writeFile(wb, filename)
      alert(`Excel file "${filename}" has been downloaded successfully!`)
    } catch (error) {
      console.error("Excel export error:", error)
      alert("Failed to export to Excel. Please try again.")
    }
  }

  const calculateStatistics = (records: any[]) => {
    const uniqueEmployees = new Set(records.map(r => r.employeeId)).size
    const present = records.filter(r => r.clockInTime).length
    const absent = records.filter(r => !r.clockInTime).length
    return {
      totalRecords: records.length,
      attendanceRate: (present / (present + absent || 1)) * 100
    }
  }

  const getStatus = (record: any): string => {
    if (!record.clockInTime) return 'Absent'
    if (!record.clockOutTime) return 'Not Clocked Out'
    const clockInTime = new Date(record.clockInTime)
    const hour = clockInTime.getHours()
    const minute = clockInTime.getMinutes()
    if (hour > 9 || (hour === 9 && minute > 0)) return 'Late'
    return 'On Time'
  }

  const exportToPDF = () => {
    alert("PDF export functionality would be implemented with a library like jsPDF or pdfkit")
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || !confirmPassword) return

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsUpdatingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      toast.success("Password updated successfully")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      toast.error(error.message || "Failed to update password")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="p-8 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure dashboard preferences and system alerts</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-white">General Settings</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-white">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-10">
          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>Export Attendance Data</CardTitle>
              <CardDescription>Download attendance records in your preferred format</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRange.start && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.start ? format(new Date(dateRange.start + 'T00:00:00'), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateRange.start ? new Date(dateRange.start + 'T00:00:00') : undefined}
                            onSelect={(date) => date && setDateRange({ ...dateRange, start: format(date, "yyyy-MM-dd") })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dateRange.end && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange.end ? format(new Date(dateRange.end + 'T00:00:00'), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dateRange.end ? new Date(dateRange.end + 'T00:00:00') : undefined}
                            onSelect={(date) => date && setDateRange({ ...dateRange, end: format(date, "yyyy-MM-dd") })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Export Format</Label>
                  <RadioGroup value={exportFormat} onValueChange={setExportFormat} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="excel" id="excel" />
                      <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer font-normal">
                        <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel (.xlsx)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="csv" id="csv" />
                      <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer font-normal">
                        <FileText className="h-4 w-4 text-blue-600" /> CSV
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="pdf" id="pdf" />
                      <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer font-normal">
                        <FileText className="h-4 w-4 text-red-600" /> PDF
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground border border-border">
                    {exportFormat === "excel" && "Includes multiple sheets, formatted columns, and statistical summary."}
                    {exportFormat === "csv" && "Raw data only, best for importing into other systems."}
                    {exportFormat === "pdf" && "Print-ready report with visual charts and summaries."}
                  </div>
                </div>
              </div>

              <Button onClick={handleExport} className="w-full sm:w-auto min-w-[200px]">
                {exportFormat === "excel" ? "Export to Excel" : exportFormat === "csv" ? "Export to CSV" : "Export to PDF"}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage your alert preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Late Arrivals Alert</Label>
                  <p className="text-sm text-muted-foreground">Notify when employees clock in after 9:00 AM</p>
                </div>
                <Switch
                  checked={notifications.lateArrivals}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, lateArrivals: checked })}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Unauthorized Device Alert</Label>
                  <p className="text-sm text-muted-foreground">Alert on suspicious device login attempts</p>
                </div>
                <Switch
                  checked={notifications.unauthorizedDevices}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, unauthorizedDevices: checked })}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Daily Summary Report</Label>
                  <p className="text-sm text-muted-foreground">Receive daily attendance summary at 6:00 PM</p>
                </div>
                <Switch
                  checked={notifications.dailyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, dailyReport: checked })}
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Weekly Report</Label>
                  <p className="text-sm text-muted-foreground">Receive weekly attendance trends on Friday</p>
                </div>
                <Switch
                  checked={notifications.weeklyReport}
                  onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Alert Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle>Alert Thresholds</CardTitle>
              <CardDescription>Customize trigger points for automated alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Late Arrival Threshold</Label>
                  <span className="text-sm font-medium bg-muted px-2 py-1 rounded">{alertThresholds.lateThreshold}:00 AM</span>
                </div>
                <Slider
                  min={8}
                  max={12}
                  step={1}
                  value={[alertThresholds.lateThreshold]}
                  onValueChange={(val) => setAlertThresholds({ ...alertThresholds, lateThreshold: val[0] })}
                />
                <p className="text-xs text-muted-foreground">Employees clocking in after this hour are marked as late.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Clock Out Reminder</Label>
                  <span className="text-sm font-medium bg-muted px-2 py-1 rounded">{alertThresholds.clockOutReminder}:00</span>
                </div>
                <Slider
                  min={16}
                  max={20}
                  step={1}
                  value={[alertThresholds.clockOutReminder]}
                  onValueChange={(val) => setAlertThresholds({ ...alertThresholds, clockOutReminder: val[0] })}
                />
                <p className="text-xs text-muted-foreground">Send reminder if not clocked out by this hour (24h format).</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Device Registration Warning</Label>
                  <span className="text-sm font-medium bg-muted px-2 py-1 rounded">{alertThresholds.deviceWarning} devices</span>
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[alertThresholds.deviceWarning]}
                  onValueChange={(val) => setAlertThresholds({ ...alertThresholds, deviceWarning: val[0] })}
                />
                <p className="text-xs text-muted-foreground">Flag account if registered devices exceed this number.</p>
              </div>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Business Start Hour</Label>
                  <Input type="time" defaultValue="09:00" />
                </div>
                <div className="space-y-2">
                  <Label>Business End Hour</Label>
                  <Input type="time" defaultValue="18:00" />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-destructive">Clear All Attendance Data</p>
                  <p className="text-sm text-muted-foreground">This action cannot be undone. All records will be permanently deleted.</p>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete All
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <KeyRound className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your account password to stay secure</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={isUpdatingPassword} className="gap-2">
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/30">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900">Security Recommendation</p>
                  <p className="text-xs text-amber-800/80 leading-relaxed">
                    Always use a unique password that you don't use on other websites.
                    A strong password includes uppercase letters, numbers, and symbols.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
