"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { employeeStorage, attendanceStorage } from "@/lib/storage"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Smartphone, Laptop, Search, AlertTriangle, CheckCircle, Info, ShieldAlert } from "lucide-react"

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
  }, [searchEmployee, sortBy, filterStatus, extendedDevices])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100/80 border-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>
      case "inactive":
        return <Badge variant="secondary"><Info className="w-3 h-3 mr-1" /> Inactive</Badge>
      case "flagged":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Flagged</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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
        <h1 className="text-3xl font-bold text-foreground">Device Management</h1>
        <p className="text-muted-foreground mt-1">Monitor and manage registered employee devices</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm font-medium">Total Devices</p>
            <p className="text-3xl font-bold text-primary mt-2">{stats.totalDevices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm font-medium">Active Devices</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeDevices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm font-medium">Inactive</p>
            <p className="text-3xl font-bold text-muted-foreground mt-2">{stats.inactiveDevices}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm font-medium">Flagged</p>
            <p className="text-3xl font-bold text-destructive mt-2">{stats.flaggedDevices}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or ID"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lastUsed">Sort by: Last Used</SelectItem>
                <SelectItem value="registered">Sort by: Registered</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Devices ({filteredDevices.length})</CardTitle>
          <CardDescription>List of all devices currently registered for attendance</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Device Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDevices.map((device, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{device.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{device.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {device.type === "mobile" ? <Smartphone className="h-4 w-4" /> : <Laptop className="h-4 w-4" />}
                      <span className="capitalize">{device.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{device.registeredDate}</TableCell>
                  <TableCell>{device.lastUsed}</TableCell>
                  <TableCell className="font-mono text-xs">{device.ipAddress}</TableCell>
                  <TableCell>
                    {getStatusBadge(device.status)}
                  </TableCell>
                </TableRow>
              ))}
              {filteredDevices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No devices found matching criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Device Audit Log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${log.status === 'success' ? 'bg-green-100 text-green-600' :
                    log.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                  }`}>
                  {log.status === 'success' ? <CheckCircle className="h-4 w-4" /> :
                    log.status === 'warning' ? <ShieldAlert className="h-4 w-4" /> :
                      <Info className="h-4 w-4" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{log.action}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {log.user} • {log.device}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{log.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
