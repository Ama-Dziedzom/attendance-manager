"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { employeeStorage, attendanceStorage } from "@/lib/storage"

export default function EmployeeDetailPage() {
  const params = useParams()
  const employeeId = params.id as string

  const employee = employeeStorage.getByEmpId(employeeId)
  const employeeAttendance = attendanceStorage.getByEmployeeId(employeeId)

  if (!employee) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-slate-400 mb-4">Employee not found</p>
          <Link href="/dashboard/employees">
            <Button className="bg-blue-600 hover:bg-blue-700">Back to Employees</Button>
          </Link>
        </div>
      </div>
    )
  }

  const onTimeCount = employeeAttendance.filter((r) => r.status === "On Time").length
  const lateCount = employeeAttendance.filter((r) => r.status === "Late").length
  const earlyDepartureCount = employeeAttendance.filter((r) => r.status === "Early Departure").length
  const attendanceRate =
    employeeAttendance.length > 0 ? ((onTimeCount / employeeAttendance.length) * 100).toFixed(1) : 0

  const recentAttendance = employeeAttendance.slice(-5).reverse()

  const getStatusColor = (status: string) => {
    switch (status) {
      case "On Time":
        return "bg-green-950 text-green-400"
      case "Late":
        return "bg-yellow-950 text-yellow-400"
      case "Early Departure":
        return "bg-blue-950 text-blue-400"
      default:
        return "bg-slate-800 text-slate-400"
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/dashboard/employees">
          <Button variant="ghost" className="text-blue-400 hover:text-blue-300 mb-4">
            ← Back to Employees
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-white">{employee.name}</h1>
        <p className="text-slate-400 mt-1">{employee.empId}</p>
      </div>

      {/* Employee Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Department</p>
            <p className="text-xl font-bold text-white mt-2">{employee.department}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Email</p>
            <p className="text-sm font-mono text-slate-300 mt-2">{employee.email}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Attendance Records</p>
            <p className="text-xl font-bold text-blue-400 mt-2">{employeeAttendance.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">On-Time Rate</p>
            <p className="text-xl font-bold text-green-400 mt-2">{attendanceRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">On Time</span>
              <span className="text-green-400 font-semibold">{onTimeCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Late</span>
              <span className="text-yellow-400 font-semibold">{lateCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Early Departure</span>
              <span className="text-blue-400 font-semibold">{earlyDepartureCount}</span>
            </div>
            <div className="pt-4 border-t border-slate-700 flex justify-between items-center">
              <span className="text-slate-300">Total Records</span>
              <span className="text-white font-semibold">{employeeAttendance.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Devices */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">QR Code Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-400 mb-4">
              {new Date(employee.timestamp).toLocaleDateString()}
            </p>
            <p className="text-sm text-slate-400">
              QR code was generated on {new Date(employee.timestamp).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-300">On Time</span>
                <span className="text-sm text-green-400">
                  {employeeAttendance.length > 0 ? ((onTimeCount / employeeAttendance.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
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
                <span className="text-sm text-slate-300">Late</span>
                <span className="text-sm text-yellow-400">
                  {employeeAttendance.length > 0 ? ((lateCount / employeeAttendance.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
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
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Date</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Clock In</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Clock Out</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Hours</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((record, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700">
                    <td className="px-6 py-4 text-slate-300">{new Date(record.clockInTime).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(record.clockInTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {record.clockOutTime
                        ? new Date(record.clockOutTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{record.totalHours.toFixed(2)}h</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
