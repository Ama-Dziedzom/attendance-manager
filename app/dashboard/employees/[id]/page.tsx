"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/supabase/db"

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
import { capitalize, cn } from "@/lib/utils"
import { StatusBadge } from "@/components/ui/status-badge"
import { Employee, AttendanceRecord, mapDbEmployeeToEmployee, mapDbAttendanceToAttendance } from "@/lib/types"

const MIDDLEWARE_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL || "http://localhost:3001"


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

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [employeeAttendance, setEmployeeAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isEnrolling, setIsEnrolling] = useState(false)

  async function loadEmployeeData() {
    try {
      setLoading(true)
      console.log("Fetching employee data for:", employeeId)
      const empData = await db.employees.getByEmpId(employeeId)
      console.log("Raw empData result:", empData)
      if (empData) {
        const biometric = empData.biometric_credential && Array.isArray(empData.biometric_credential)
          ? empData.biometric_credential[0]
          : empData.biometric_credential

        const hardwareFingerprint = empData.employee_fingerprints && Array.isArray(empData.employee_fingerprints)
          ? empData.employee_fingerprints[0]
          : empData.employee_fingerprints

        const mapped = mapDbEmployeeToEmployee(empData)
        console.log("Mapped employee object:", mapped)
        setEmployee(mapped)
        const attendanceData = await db.attendance.getEmployeeRecords(empData.id, 30)
        console.log("Attendance records found:", attendanceData.length)
        const mappedAttendance = attendanceData.map((r: any) => mapDbAttendanceToAttendance(r))
        setEmployeeAttendance(mappedAttendance)
      }
    } catch (error: any) {
      console.error("Error loading employee data:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployeeData()
  }, [employeeId])

  const handleScanComplete = async (cred: { template: string; quality: number }) => {
    if (!employee) return

    try {
      // 1. Send to Middleware for DB storage and terminal sync
      console.log(`[Enroll] Sending request to ${MIDDLEWARE_URL}/api/fingerprints/enroll for ID: ${employee.id}`);
      const response = await fetch(`${MIDDLEWARE_URL}/api/fingerprints/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: employee.id,
          fingerIndex: 0,
          template: cred.template
        })
      });

      const result = await response.json();
      console.log("[Enroll] Middleware response:", result);

      if (!result.success) {
        console.error("[Enroll] Middleware reported failure:", result.error);
        throw new Error(result.error || "Enrollment failed on middleware");
      }

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
      <div className="min-h-screen bg-muted/30 pb-20">
        {/* Search/Breadcrumb Header Skeleton */}
        <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-8 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="container mx-auto px-8 py-8">
          <div className="flex flex-col gap-8">
            {/* Profile Header Section Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-background p-8 rounded-xl border shadow-sm">
              <div className="flex items-center gap-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 w-full md:w-auto">
                <Skeleton className="h-16 w-full md:w-48 rounded-lg" />
                <Skeleton className="h-16 w-full md:w-48 rounded-lg" />
              </div>
            </div>

            {/* Tabs Skeleton */}
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>

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
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-8 py-4 flex items-center justify-between sticky top-0 z-10 border-b border-border/40">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/employees">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
          <p className="text-sm font-medium text-muted-foreground">Employee Details</p>
        </div>
        <div className="flex items-center gap-2">
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
                    {capitalize(employee.department)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 opacity-70" />
                    {employee.agency || "Independent"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Fingerprint className="h-4 w-4 opacity-70" />
                    ID: {employee.empId}
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
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="font-semibold text-slate-800">{capitalize(employee.name)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="font-semibold text-slate-800">{capitalize(employee.gender)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Marital Status</p>
                      <p className="font-semibold text-slate-800">{capitalize(employee.maritalStatus)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-semibold text-slate-800">{capitalize(employee.address)}</p>
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
                      <p className="font-semibold text-slate-800">{capitalize(employee.education)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Emergency Contact</p>
                      <p className="font-semibold text-slate-800 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-emerald-600" />
                        {employee.emergencyContact || "N/A"}
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
                      <p className="font-semibold text-slate-800">{employee.empId}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Employment Type</p>
                      <p className="font-semibold text-slate-800">{capitalize(employee.employeeType)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date Join</p>
                      <p className="font-semibold text-slate-800">
                        {employee.dateJoin
                          ? new Date(employee.dateJoin).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : new Date(employee.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {/* Right Column */}
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Job Title</p>
                      <p className="font-semibold text-slate-800">{employee.jobTitle || "N/A"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-semibold text-slate-800">{capitalize(employee.department)}</p>
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
                  {employee.biometricRegistered ? (
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
                            <span className="font-bold">{employee.biometricDeviceType || "SLK20R Scanner"}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Enrolled At</span>
                            <span className="font-bold">{employee.biometricRegisteredAt ? new Date(employee.biometricRegisteredAt).toLocaleDateString() : 'N/A'}</span>
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
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-border">
                          <tr className="bg-muted/50">
                            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clock In</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clock Out</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Hours</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {employeeAttendance.slice(0, 10).map((record, i) => (
                            <tr key={i} className="hover:bg-muted/50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-slate-700">{new Date(record.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                              <td className="px-6 py-4 text-sm font-medium">
                                {record.clockInTime ? (
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {new Date(record.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                ) : "--:--"}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                {record.clockOutTime ? (
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                    {new Date(record.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                ) : "--:--"}
                              </td>
                              <td className="px-6 py-4 text-sm font-medium">{record.totalHours?.toFixed(1) || "0.0"}h</td>
                              <td className="px-6 py-4 text-right">
                                <StatusBadge status={record.status} variant="pill" />
                              </td>
                            </tr>
                          ))}
                          {employeeAttendance.length === 0 && (
                            <tr>
                              <td colSpan={5} className="px-6 py-24 text-center">
                                <div className="flex flex-col items-center justify-center text-muted-foreground">
                                  <History className="h-10 w-10 mb-4 opacity-20" />
                                  <p>No biometric attendance logs recorded.</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
