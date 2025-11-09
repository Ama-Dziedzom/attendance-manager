"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { employeeStorage, attendanceStorage } from "@/lib/storage"

export default function DevicesPage() {
  const [searchEmployee, setSearchEmployee] = useState("")
  const [sortBy, setSortBy] = useState("lastUsed")
  const [filterStatus, setFilterStatus] = useState("all")

  // Get devices from attendance records (simplified - in production this would be a separate device table)
  const employees = employeeStorage.getAll()
  const allAttendance = attendanceStorage.getAll()
  
  const extendedDevices = employees.flatMap((emp, idx) => {
    const empAttendance = allAttendance.filter(a => a.employeeId === emp.empId)
    const lastRecord = empAttendance.length > 0 ? empAttendance[empAttendance.length - 1] : null
    
    return [{
      id: `Device-${emp.empId}`,
      employeeId: emp.empId,
      employeeName: emp.name,
      name: "Mobile Device",
      type: "mobile",
      userAgent: typeof window !== "undefined" ? navigator.userAgent : "N/A",
      registeredDate: new Date(emp.timestamp).toISOString().split("T")[0],
      lastUsed: lastRecord ? lastRecord.date : new Date(emp.timestamp).toISOString().split("T")[0],
      ipAddress: "N/A",
      status: lastRecord ? "active" : "inactive",
    }]
  })

  const filteredDevices = useMemo(() => {
    const filtered = extendedDevices.filter((device) => {
      const matchesSearch =
        device.employeeName.toLowerCase().includes(searchEmployee.toLowerCase()) ||
        device.employeeId.toLowerCase().includes(searchEmployee.toLowerCase())

      const matchesStatus = filterStatus === "all" || device.status === filterStatus

      return matchesSearch && matchesStatus
    })

    // Sort
    if (sortBy === "lastUsed") {
      filtered.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
    } else if (sortBy === "registered") {
      filtered.sort((a, b) => new Date(b.registeredDate).getTime() - new Date(a.registeredDate).getTime())
    }

    return filtered
  }, [searchEmployee, sortBy, filterStatus])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-950 text-green-400 border-green-800"
      case "inactive":
        return "bg-gray-950 text-gray-400 border-gray-800"
      case "flagged":
        return "bg-red-950 text-red-400 border-red-800"
      default:
        return "bg-slate-800 text-slate-400 border-slate-700"
    }
  }

  const stats = {
    totalDevices: extendedDevices.length,
    activeDevices: extendedDevices.filter((d) => d.status === "active").length,
    flaggedDevices: extendedDevices.filter((d) => d.status === "flagged").length,
    inactiveDevices: extendedDevices.filter((d) => d.status === "inactive").length,
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Device Management</h1>
        <p className="text-slate-400 mt-1">Monitor and manage registered employee devices</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Total Devices</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{stats.totalDevices}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Active Devices</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{stats.activeDevices}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Inactive</p>
            <p className="text-3xl font-bold text-gray-400 mt-2">{stats.inactiveDevices}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Flagged</p>
            <p className="text-3xl font-bold text-red-400 mt-2">{stats.flaggedDevices}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search by employee name or ID"
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              <option value="lastUsed">Sort by: Last Used</option>
              <option value="registered">Sort by: Registered</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card className="bg-slate-800 border-slate-700 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-white">Registered Devices ({filteredDevices.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Employee</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Device Name</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Type</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Registered</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Last Used</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">IP Address</th>
                  <th className="px-6 py-3 text-left text-slate-300 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device, idx) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700 transition-colors">
                    <td className="px-6 py-4 text-white">{device.employeeName}</td>
                    <td className="px-6 py-4 text-slate-300">{device.name}</td>
                    <td className="px-6 py-4">
                      <span className="text-slate-300">{device.type === "mobile" ? "📱 Mobile" : "💻 Desktop"}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{device.registeredDate}</td>
                    <td className="px-6 py-4 text-slate-300">{device.lastUsed}</td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">{device.ipAddress}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(device.status)}`}
                      >
                        {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Device Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              action: "Device Registered",
              user: "John Doe",
              device: "iPhone 14",
              time: "2 hours ago",
              status: "success",
            },
            {
              action: "Unauthorized Login Attempt",
              user: "Jane Smith",
              device: "Unknown Device",
              time: "5 hours ago",
              status: "warning",
            },
            {
              action: "Device Deregistered",
              user: "Bob Johnson",
              device: "MacBook Pro",
              time: "1 day ago",
              status: "info",
            },
            {
              action: "IP Address Change",
              user: "Alice Brown",
              device: "iPad Pro",
              time: "2 days ago",
              status: "warning",
            },
          ].map((log, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600"
            >
              <div className="flex-1">
                <p className="text-white font-semibold">{log.action}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {log.user} - {log.device}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{log.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
