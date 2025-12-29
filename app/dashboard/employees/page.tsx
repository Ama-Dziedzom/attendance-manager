"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Search, Filter } from "lucide-react"
import { db } from "@/lib/supabase/db"

interface Employee {
  id: string
  empId: string
  name: string
  email: string | null
  department: string | null
  departmentId: string
  agency: string | null
  agencyId: string
  isActive: boolean
  biometricRegistered: boolean
}

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<string[]>([])

  // Load employees from Supabase
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const [employeesData, depts] = await Promise.all([
          db.employees.getAll(),
          db.departments.getAll(),
        ])

        // Map to Employee interface
        const mappedEmployees: Employee[] = employeesData.map((emp: any) => ({
          id: emp.id,
          empId: emp.emp_id || "N/A",
          name: emp.name,
          email: emp.email,
          department: emp.department?.name || null,
          departmentId: emp.department_id,
          agency: emp.agency?.name || null,
          agencyId: emp.agency_id,
          isActive: emp.is_active,
          biometricRegistered: !!emp.biometric_credential,
        }))

        setEmployees(mappedEmployees)

        // Set unique departments
        const uniqueDepts = Array.from(new Set(depts.map((d: any) => d.name))) as string[]
        setDepartments(uniqueDepts)
      } catch (error) {
        console.error("Error loading employees:", error)
      }
    }

    loadEmployees()
    const interval = setInterval(loadEmployees, 30000)
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
      filtered.sort((a, b) => (a.department || "").localeCompare(b.department || ""))
    }

    return filtered
  }, [searchTerm, departmentFilter, sortBy, employees])

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Employee Directory</h1>
        <p className="text-muted-foreground mt-1">View and manage employee attendance records</p>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-input"
              />
            </div>
            <div className="flex gap-4">
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by: Name</SelectItem>
                  <SelectItem value="department">Sort by: Department</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => {
          return (
            <Link key={employee.id} href={`/dashboard/employees/${employee.empId}`}>
              <Card className="bg-card border-border hover:border-primary cursor-pointer transition-all h-full hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{employee.name}</h3>
                      <p className="text-sm text-muted-foreground">{employee.empId}</p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Department</p>
                      <p className="text-sm text-foreground">{employee.department || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <p className="text-sm text-foreground">{employee.email || "N/A"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Biometric Status</p>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-semibold ${employee.biometricRegistered
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                          }`}>
                          {employee.biometricRegistered ? "Registered" : "Not Registered"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full mt-4" variant="secondary" asChild>
                    <span>View Details</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <Card className="bg-muted/50 border-dashed border-muted-foreground/25">
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="flex justify-center mb-4">
              <Search className="h-10 w-10 opacity-20" />
            </div>
            <p>No employees found matching your criteria</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
