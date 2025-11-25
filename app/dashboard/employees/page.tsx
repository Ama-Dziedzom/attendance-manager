"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { employeeStorage, attendanceStorage } from "@/lib/storage"
import { User } from "lucide-react"

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [employees, setEmployees] = useState(employeeStorage.getAll())

  const departments = ["Engineering", "HR", "Sales", "Marketing", "Finance"]

  // Refresh employees data
  useEffect(() => {
    const loadEmployees = () => {
      setEmployees(employeeStorage.getAll())
    }
    loadEmployees()
    const interval = setInterval(loadEmployees, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.empId.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter

      return matchesSearch && matchesDept
    })

    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "department") {
      filtered.sort((a, b) => a.department.localeCompare(b.department))
    }

    return filtered
  }, [searchTerm, departmentFilter, sortBy])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Employee Directory</h1>
        <p className="text-gray-500 mt-1">View and manage employee attendance records</p>
      </div>

      {/* Filters */}
      <Card className="bg-white border-blue-100">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Search by name or ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-white border-blue-100 text-white placeholder:text-slate-500"
            />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 bg-white border border-blue-100 rounded text-slate-500 text-sm min-w-48"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-white border border-blue-100 rounded text-slate-500 text-sm min-w-48"
            >
              <option value="name">Sort by: Name</option>
              <option value="department">Sort by: Department</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => {
          const employeeAttendance = attendanceStorage.getByEmployeeId(employee.empId)
          const attendanceRate =
            employeeAttendance.length > 0
              ? (
                  (employeeAttendance.filter((r) => r.status === "On Time").length / employeeAttendance.length) *
                  100
                ).toFixed(0)
              : 0

          return (
            <Link key={employee.id} href={`/dashboard/employees/${employee.empId}`}>
              <Card className="bg-white border-blue-100 hover:border-blue-600 cursor-pointer transition-all h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-600">{employee.name}</h3>
                      <p className="text-sm text-gray-600">{employee.empId}</p>
                    </div>
                    <User className="w-8 h-8 opacity-50 text-slate-400" />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Department</p>
                      <p className="text-sm text-slate-300">{employee.department || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 mb-1">Email</p>
                      <p className="text-sm text-slate-300">{employee.email || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400 mb-2">Attendance Rate</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-blue-100 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-900 to-blue-500"
                            style={{ width: `${attendanceRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-green-400">{attendanceRate}%</span>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full mt-4 bg-blue-900 hover:bg-blue-700 text-white" asChild>
                    <span>View Details</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-8 text-center">
            <p className="text-slate-400">No employees found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
