"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/supabase/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Building, Mail, Clock, CalendarDays, Fingerprint } from "lucide-react"

interface EmployeeData {
  id: string
  emp_id: string
  name: string
  email: string | null
  department: { name: string } | null
  agency: { name: string } | null
  biometric_credential: any[]
  created_at: string
}

interface AttendanceRecord {
  date: string
  clock_in_time: string
  clock_out_time: string | null
  total_hours: number
  status: string
}

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [employeeAttendance, setEmployeeAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEmployeeData() {
      try {
        setLoading(true)
        // Fetch employee by emp_id
        const empData = await db.employees.getByEmpId(employeeId)
        setEmployee(empData as any)

        // Fetch attendance records
        if (empData?.id) {
          const attendance = await db.attendance.getEmployeeRecords(empData.id, 30)
          setEmployeeAttendance(attendance as any)
        }
      } catch (error) {
        console.error("Error loading employee data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadEmployeeData()
  }, [employeeId])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading employee details...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Employee not found</p>
          <Link href="/dashboard/employees">
            <Button>Back to Employees</Button>
          </Link>
        </div>
      </div>
    )
  }

  const onTimeCount = employeeAttendance.filter((r) => r.status === "on_time").length
  const lateCount = employeeAttendance.filter((r) => r.status === "late").length
  const earlyDepartureCount = employeeAttendance.filter((r) => r.status === "early_departure").length
  const attendanceRate =
    employeeAttendance.length > 0 ? ((onTimeCount / employeeAttendance.length) * 100).toFixed(1) : 0

  const recentAttendance = employeeAttendance.slice(0, 5)
  const hasBiometric = employee.biometric_credential && employee.biometric_credential.length > 0

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "on_time": return "bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200"
      case "late": return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 border-yellow-200"
      case "early_departure": return "bg-blue-100 text-blue-700 hover:bg-blue-100/80 border-blue-200"
      default: return ""
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "on_time": return "On Time"
      case "late": return "Late"
      case "early_departure": return "Early Departure"
      default: return status
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/employees">
          <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-foreground">{employee.name}</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm">{employee.emp_id}</span>
        </p>
      </div>

      {/* Employee Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Building className="h-4 w-4" /> Department
            </p>
            <p className="text-xl font-bold text-foreground mt-2">{employee.department?.name || "N/A"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </p>
            <p className="text-sm font-medium text-foreground mt-2 truncate" title={employee.email || ""}>{employee.email || "N/A"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" /> Attendance Records
            </p>
            <p className="text-xl font-bold text-primary mt-2">{employeeAttendance.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> On-Time Rate
            </p>
            <p className="text-xl font-bold text-green-600 mt-2">{attendanceRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">On Time</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{onTimeCount}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Late</span>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{lateCount}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Early Departure</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{earlyDepartureCount}</Badge>
            </div>
            <div className="pt-4 border-t border-border flex justify-between items-center">
              <span className="font-medium">Total Records</span>
              <span className="font-bold text-foreground">{employeeAttendance.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Biometric Status */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Biometric Status</CardTitle>
          </CardHeader>
          <CardContent>
            {hasBiometric ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Fingerprint className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Fingerprint Registered</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(employee.biometric_credential[0].created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-sm bg-muted/50 p-4 rounded-lg border border-border">
                  <span className="text-muted-foreground">Device:</span>
                  <span className="ml-2 font-medium">
                    {employee.biometric_credential[0].device_type || "Unknown"}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Fingerprint className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">No Biometric Registered</p>
                  <p className="text-sm text-muted-foreground">Fingerprint not enrolled</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">On Time</span>
                <span className="text-sm text-muted-foreground">
                  {employeeAttendance.length > 0 ? ((onTimeCount / employeeAttendance.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-green-500"
                  style={{
                    width: `${employeeAttendance.length > 0 ? (onTimeCount / employeeAttendance.length) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Late</span>
                <span className="text-sm text-muted-foreground">
                  {employeeAttendance.length > 0 ? ((lateCount / employeeAttendance.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-yellow-500"
                  style={{
                    width: `${employeeAttendance.length > 0 ? (lateCount / employeeAttendance.length) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAttendance.map((record, idx) => (
                <TableRow key={idx}>
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }) : "-"}
                  </TableCell>
                  <TableCell>
                    {record.clock_out_time
                      ? new Date(record.clock_out_time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "-"}
                  </TableCell>
                  <TableCell>{record.total_hours ? record.total_hours.toFixed(2) : "0.00"}h</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColorClass(record.status)}>
                      {getStatusLabel(record.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentAttendance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No attendance records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
