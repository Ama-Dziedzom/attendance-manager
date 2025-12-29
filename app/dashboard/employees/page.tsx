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
import { User, Search, Filter, LayoutGrid, Table, Download, RotateCw, Layers, ListFilter, Command, Upload } from "lucide-react"
import { db } from "@/lib/supabase/db"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BulkUploadFlow } from "@/components/bulk-upload-flow"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

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
  const [agencyFilter, setAgencyFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [agencies, setAgencies] = useState<string[]>([])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault()
        document.getElementById("employee-search")?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const loadEmployees = async () => {
    try {
      const [employeesData, depts, agcs] = await Promise.all([
        db.employees.getAll(),
        db.departments.getAll(),
        db.agencies.getAll().catch((err) => {
          console.warn("Error loading agencies, using empty array:", err)
          return []
        }),
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
        biometricRegistered: !!(emp.biometric_credential as any[])?.length,
      }))

      setEmployees(mappedEmployees)

      // Set unique departments
      const uniqueDepts = Array.from(new Set(depts.map((d: any) => d.name))) as string[]
      setDepartments(uniqueDepts)

      // Set unique agencies
      const uniqueAgencies = Array.from(new Set(agcs.map((a: any) => a.name))) as string[]
      setAgencies(uniqueAgencies)
    } catch (error) {
      console.error("Error loading employees:", error)
    }
  }

  // Load employees from Supabase
  useEffect(() => {
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
      const matchesAgency = agencyFilter === "all" || emp.agency === agencyFilter

      return matchesSearch && matchesDept && matchesAgency
    })

    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "department") {
      filtered.sort((a, b) => (a.department || "").localeCompare(b.department || ""))
    }

    return filtered
  }, [searchTerm, departmentFilter, agencyFilter, sortBy, employees])

  return (
    <div className="p-8 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Directory</h1>
          <p className="text-muted-foreground mt-1">View and manage employee attendance records</p>
        </div>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Export
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="employee-search"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-12 bg-background border-input focus:ring-1 focus:ring-primary h-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-50 select-none pointer-events-none">
            <Kbd className="bg-transparent border-none text-[10px]">⌘</Kbd>
            <Kbd className="bg-transparent border-none text-[10px]">F</Kbd>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px] h-10">
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

          <Select value={agencyFilter} onValueChange={setAgencyFilter}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="All Agencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Agencies</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency} value={agency}>
                  {agency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-10">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="department">Department</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "table" | "grid")}
            className="border border-input rounded-md h-10 p-1 bg-background"
          >
            <ToggleGroupItem value="table" className={cn("h-8 px-2.5", viewMode === "table" && "bg-muted")}>
              <Table className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="grid" className={cn("h-8 px-2.5", viewMode === "grid" && "bg-muted")}>
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
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
                        <p className="text-xs text-muted-foreground mb-1">Agency</p>
                        <p className="text-sm text-foreground">{employee.agency || "N/A"}</p>
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
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card className="bg-card border-border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr className="bg-muted/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Agency</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Biometric</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{employee.empId}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{employee.name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{employee.department || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{employee.agency || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{employee.email || "N/A"}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge
                        variant={employee.biometricRegistered ? "default" : "secondary"}
                        className={employee.biometricRegistered
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                        }
                      >
                        {employee.biometricRegistered ? "Registered" : "Not Registered"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/dashboard/employees/${employee.empId}`}>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
