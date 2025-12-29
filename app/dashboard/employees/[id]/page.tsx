"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/supabase/db"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ArrowLeft,
  Building,
  Mail,
  Clock,
  CalendarDays,
  Fingerprint,
  Phone,
  MapPin,
  CheckCircle2,
  Plus,
  MoreHorizontal,
  Settings,
  TrendingDown,
  UserCheck,
  History,
  Activity,
  ShieldCheck,
  Download,
  Briefcase,
  User,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SLK20RScanner } from "@/components/slk20r-scanner"
import { toast } from "sonner"
import type { BiometricCredential } from "@/lib/webauthn-helper"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip
} from 'recharts'

interface EmployeeData {
  id: string
  emp_id: string
  name: string
  email: string | null
  department: { name: string } | null
  agency: { name: string } | null
  biometric_credential: any[]
  created_at: string
  gender?: string | null
  marital_status?: string | null
  address?: string | null
  emergency_contact?: string | null
  education?: string | null
  job_title?: string | null
  employment_type?: string | null
  date_join?: string | null
}

interface AttendanceRecord {
  date: string
  clock_in_time: string
  clock_out_time: string | null
  total_hours: number
  status: string
}

const ATTENDANCE_METRICS = [
  { subject: 'Punctuality', A: 85, fullMark: 100 },
  { subject: 'Consistency', A: 92, fullMark: 100 },
  { subject: 'Reliability', A: 88, fullMark: 100 },
  { subject: 'Compliance', A: 95, fullMark: 100 },
  { subject: 'Activity', A: 70, fullMark: 100 },
]

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [employeeAttendance, setEmployeeAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isEnrolling, setIsEnrolling] = useState(false)

  async function loadEmployeeData() {
    try {
      setLoading(true)
      const empData = await db.employees.getByEmpId(employeeId)
      setEmployee(empData as any)

      if (empData?.id) {
        const attendance = await db.attendance.getEmployeeRecords(empData.id, 30)
        setEmployeeAttendance(attendance as any)
      }
    } catch (error: any) {
      console.error("Error loading employee data:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        error
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployeeData()
  }, [employeeId])

  const handleScanComplete = async (cred: BiometricCredential) => {
    if (!employee) return

    try {
      await db.biometric.register({
        employee_id: employee.id,
        credential_id: cred.credentialId,
        fingerprint_id: `FP-${employee.emp_id}-${cred.credentialId.slice(0, 8)}`,
        public_key: cred.publicKey,
        counter: cred.counter,
        device_type: cred.deviceType || "slk20r",
        is_active: true,
      })

      toast.success("Biometric registered successfully")
      setIsEnrolling(false)
      loadEmployeeData() // Refresh to show the new credential
    } catch (error) {
      console.error("Error saving biometric:", error)
      toast.error("Failed to save biometric credential")
    }
  }

  const handleScanError = (error: string) => {
    toast.error(error)
    setIsEnrolling(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 pb-20">
        {/* Header Banner Skeleton */}
        <div className="h-64 bg-slate-900 border-b relative overflow-hidden">
          <div className="container mx-auto px-8 h-full flex flex-col justify-between py-8 relative z-0">
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-36 bg-white/10" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 bg-white/10" />
                <Skeleton className="h-9 w-28 bg-white/10" />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-8 -mt-20 relative">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row items-end gap-6">
              <Skeleton className="h-40 w-40 rounded-2xl" />
              <div className="pb-4 flex-1 space-y-3">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-5 w-96" />
              </div>
            </div>

            <Skeleton className="h-10 w-48" />

            <Card className="rounded-xl border-none shadow-sm">
              <CardHeader className="pb-4">
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
                <div className="space-y-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-5 w-48" />
                    </div>
                  ))}
                </div>
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-5 w-48" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground mb-4">Employee record not found.</p>
        <Link href="/dashboard/employees">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Employees
          </Button>
        </Link>
      </div>
    )
  }

  const onTimeCount = employeeAttendance.filter((r) => r.status === "on_time").length
  const attendanceRate =
    employeeAttendance.length > 0 ? ((onTimeCount / employeeAttendance.length) * 100).toFixed(1) : 0

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      {/* Search/Breadcrumb Header */}
      <div className="bg-background border-b px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/employees">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <p className="text-sm font-medium text-muted-foreground">Employee Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <Button size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-8 py-8">
        <div className="flex flex-col gap-8">

          {/* Profile Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-background p-8 rounded-xl border shadow-sm">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24 rounded-full border shadow-sm">
                <AvatarImage src="/employee_profile_photo.png" className="object-cover" />
                <AvatarFallback className="bg-primary/5">
                  <User className="h-10 w-10 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight">{employee.name}</h1>
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">
                    Active
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5">
                    <Building className="h-4 w-4 opacity-70" />
                    {employee.department?.name || "N/A"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 opacity-70" />
                    {employee.agency?.name || "Independent"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="h-4 w-4 opacity-70" />
                    ID: {employee.emp_id}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex-1 md:w-48 p-4 bg-muted/50 rounded-lg border flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-background flex items-center justify-center text-muted-foreground border">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email</p>
                  <p className="text-xs font-semibold truncate">{employee.email || "N/A"}</p>
                </div>
              </div>
              <div className="flex-1 md:w-48 p-4 bg-muted/50 rounded-lg border flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-background flex items-center justify-center text-muted-foreground border">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Contact</p>
                  <p className="text-xs font-semibold">+233 24 000 0000</p>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="personal">Details</TabsTrigger>
              <TabsTrigger value="biometrics">Biometrics</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-0 space-y-8 focus-visible:outline-none">
              {/* Personal Information Card */}
              <Card className="rounded-xl border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Fullname</p>
                      <p className="font-semibold text-slate-800">{employee.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="font-semibold text-slate-800">{employee.gender || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Marital Status</p>
                      <p className="font-semibold text-slate-800">{employee.marital_status || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-semibold text-slate-800">{employee.address || "N/A"}</p>
                    </div>
                  </div>
                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Languages Spoken</p>
                      <p className="font-semibold text-slate-800">English</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Education</p>
                      <p className="font-semibold text-slate-800">{employee.education || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Emergency Contact</p>
                      <p className="font-semibold text-slate-800 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-emerald-600" />
                        {employee.emergency_contact || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Professional Information Card */}
              <Card className="rounded-xl border-none shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold">Professional Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Employment ID</p>
                      <p className="font-semibold text-slate-800">{employee.emp_id}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Employment Type</p>
                      <p className="font-semibold text-slate-800">{employee.employment_type || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date Join</p>
                      <p className="font-semibold text-slate-800">
                        {employee.date_join
                          ? new Date(employee.date_join).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : new Date(employee.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Job Title</p>
                      <p className="font-semibold text-slate-800">{employee.job_title || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-semibold text-slate-800">{employee.department?.name || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className="bg-emerald-50 text-emerald-700 border-none hover:bg-emerald-50 font-semibold">Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="biometrics" className="mt-0 space-y-8 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Biometric Status & Registration */}
                <div className="lg:col-span-4 space-y-6">
                  {employee.biometric_credential && employee.biometric_credential.length > 0 ? (
                    <Card className="rounded-xl border-none shadow-sm overflow-hidden border-t-4 border-t-emerald-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                          <ShieldCheck className="h-5 w-5" />
                          <span className="text-xs font-bold uppercase tracking-wider">Credential Verified</span>
                        </div>
                        <CardTitle className="text-lg font-bold">Fingerprint Active</CardTitle>
                        <CardDescription>Biometric authentication is configured</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-center p-8 bg-slate-50 rounded-xl mb-6">
                          <Fingerprint className="h-20 w-20 text-emerald-600 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Device Type</span>
                            <span className="font-bold">{employee.biometric_credential[0].device_type || "SLK20R Scanner"}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Enrolled At</span>
                            <span className="font-bold">{new Date(employee.biometric_credential[0].created_at).toLocaleDateString()}</span>
                          </div>
                          <Button variant="outline" className="w-full mt-4 font-bold text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100">
                            Revoke Access
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : isEnrolling ? (
                    <Card className="rounded-xl border-none shadow-sm overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold">Enrolling Fingerprint</CardTitle>
                        <CardDescription>Follow the instructions on the scanner</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <SLK20RScanner
                          onScanComplete={handleScanComplete}
                          onError={handleScanError}
                          employeeId={employee.id}
                          employeeName={employee.name}
                          employeeEmail={employee.email ?? ""}
                        />
                        <Button
                          variant="ghost"
                          className="w-full mt-4 text-muted-foreground"
                          onClick={() => setIsEnrolling(false)}
                        >
                          Cancel Enrollment
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="rounded-xl border-none shadow-sm overflow-hidden border-t-4 border-t-orange-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-orange-600 mb-2">
                          <Clock className="h-5 w-5" />
                          <span className="text-xs font-bold uppercase tracking-wider">Pending Enrollment</span>
                        </div>
                        <CardTitle className="text-lg font-bold">Register Biometrics</CardTitle>
                        <CardDescription>No fingerprint credential found</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="p-8 bg-slate-50 rounded-xl mb-6 text-center">
                          <Fingerprint className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                          <p className="text-sm text-muted-foreground font-medium">Connect SLK20R scanner to begin enrollment</p>
                        </div>
                        <Button
                          className="w-full font-bold h-11 shadow-lg shadow-primary/20"
                          onClick={() => setIsEnrolling(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Enroll Fingerprint
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="rounded-xl border-none shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Access Security</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Biometric data is encrypted and stored securely. Fingerprint templates cannot be converted back to images.
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-blue-50/50 rounded-lg">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        <span className="text-[10px] font-bold text-blue-800 uppercase">FIPS 201 Compliant</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Attendance History (Biometric Logs) */}
                <div className="lg:col-span-8">
                  <Card className="rounded-xl border-none shadow-sm overflow-hidden h-full">
                    <CardHeader className="border-b bg-white/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold">Biometric Attendance Logs</CardTitle>
                          <CardDescription>Verified clock-in events for this terminal</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="font-bold text-primary">Export Logs</Button>
                      </div>
                    </CardHeader>
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead className="font-bold text-[11px] uppercase tracking-wider">Date</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase tracking-wider">Clock In</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase tracking-wider">Clock Out</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase tracking-wider">Work Hours</TableHead>
                          <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeAttendance.slice(0, 10).map((record, i) => (
                          <TableRow key={i} className="hover:bg-slate-50/50">
                            <TableCell className="font-medium text-slate-700">{new Date(record.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</TableCell>
                            <TableCell className="font-medium">
                              {record.clock_in_time ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  {new Date(record.clock_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              ) : "--:--"}
                            </TableCell>
                            <TableCell className="font-medium text-slate-500">
                              {record.clock_out_time ? (
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                  {new Date(record.clock_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              ) : "--:--"}
                            </TableCell>
                            <TableCell className="font-medium">{record.total_hours?.toFixed(1) || "0.0"}h</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={`rounded-md font-bold px-2.5 py-0.5 border-none ${record.status === 'on_time' ? 'bg-emerald-50 text-emerald-700' :
                                record.status === 'late' ? 'bg-orange-50 text-orange-700' :
                                  'bg-blue-50 text-blue-700'
                                }`}>
                                {record.status === 'on_time' ? 'On Time' :
                                  record.status === 'late' ? 'Late' :
                                    'Punctual'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        {employeeAttendance.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="h-48 text-center">
                              <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <History className="h-10 w-10 mb-4 opacity-20" />
                                <p>No biometric attendance logs recorded.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </div>
    </div>
  )
}
