"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Search, LayoutGrid, Table, Upload, UserPlus, Download } from "lucide-react"
import { db } from "@/lib/supabase/db"
import { Badge } from "@/components/ui/badge"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

// Reusable components
import { PageHeader } from "@/components/ui/page-header"
import { SearchInput } from "@/components/ui/search-input"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"

// Employee sheets
import { AddEmployeeSheet } from "@/components/add-employee-sheet"
import { BulkUploadSheet } from "@/components/bulk-upload-sheet"

// Utilities
import { cn, capitalize, BIOMETRIC_STATUS, REFRESH_INTERVALS } from "@/lib/utils"
import { type Employee, mapDbEmployeeToEmployee } from "@/lib/types"

export default function EmployeesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [agencyFilter, setAgencyFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [statusFilter, setStatusFilter] = useState<"active" | "all">("active")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [agencies, setAgencies] = useState<string[]>([])

  // Sheet states
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

  const loadEmployees = useCallback(async () => {
    try {
      const [employeesData, depts, agcs] = await Promise.all([
        db.employees.getAll(statusFilter === "all"),
        db.departments.getAll(),
        db.agencies.getAll().catch(() => []),
      ])

      setEmployees(employeesData.map(mapDbEmployeeToEmployee))
      setDepartments(Array.from(new Set(depts.map((d: any) => d.name))) as string[])
      setAgencies(Array.from(new Set(agcs.map((a: any) => a.name))) as string[])
    } catch (error) {
      console.error("Error loading employees:", error)
    }
  }, [statusFilter])

  useEffect(() => {
    loadEmployees()
    const interval = setInterval(loadEmployees, REFRESH_INTERVALS.EMPLOYEES)
    return () => clearInterval(interval)
  }, [loadEmployees])

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

  // Biometric badge component
  const BiometricBadge = ({ registered }: { registered: boolean }) => {
    const config = registered ? BIOMETRIC_STATUS.registered : BIOMETRIC_STATUS.not_registered
    return (
      <Badge variant={registered ? "default" : "secondary"} className={config.badgeClass}>
        {config.label}
      </Badge>
    )
  }

  // Table columns
  const columns: ColumnDef<Employee>[] = [
    {
      key: "empId",
      header: "Employee ID",
      className: "font-medium text-foreground",
      render: (row) => row.empId,
    },
    {
      key: "name",
      header: "Name",
      className: "text-foreground",
      render: (row) => capitalize(row.name),
    },
    {
      key: "department",
      header: "Department",
      className: "text-muted-foreground",
      render: (row) => capitalize(row.department),
    },
    {
      key: "agency",
      header: "Agency",
      className: "text-muted-foreground",
      render: (row) => row.agency || "N/A",
    },
    {
      key: "jobTitle",
      header: "Job Title",
      className: "text-muted-foreground",
      render: (row) => row.jobTitle || "N/A",
    },
    {
      key: "employeeType",
      header: "Type",
      className: "text-muted-foreground",
      render: (row) => capitalize(row.employeeType),
    },
    {
      key: "email",
      header: "Email",
      className: "text-muted-foreground",
      render: (row) => row.email || "N/A",
    },
    {
      key: "biometric",
      header: "Biometric",
      align: "center",
      render: (row) => <BiometricBadge registered={row.biometricRegistered} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (row) => (
        <Link href={`/dashboard/employees/${row.empId}`}>
          <Button variant="ghost" size="sm">View Details</Button>
        </Link>
      ),
    },
  ]

  return (
    <div className="p-8 space-y-10">
      <PageHeader
        title="Employee Directory"
        description="View and manage employee attendance records"
      >
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddEmployeeOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
          <Button variant="secondary" onClick={() => setBulkUploadOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </PageHeader>

      {/* Sheet components */}
      <AddEmployeeSheet
        open={addEmployeeOpen}
        onOpenChange={setAddEmployeeOpen}
        onSuccess={() => loadEmployees()}
      />
      <BulkUploadSheet
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onSuccess={() => loadEmployees()}
      />

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <SearchInput
          inputId="employee-search"
          placeholder="Search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[160px] h-10">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
                <SelectItem key={agency} value={agency}>{agency}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[150px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="all">All Employees</SelectItem>
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
          {filteredEmployees.map((employee) => (
            <Link key={employee.id} href={`/dashboard/employees/${employee.empId}`}>
              <Card className="bg-card border-border hover:border-primary cursor-pointer transition-all h-full hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{capitalize(employee.name)}</h3>
                      <p className="text-sm text-muted-foreground">{employee.empId}</p>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-full">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Department</p>
                      <p className="text-sm text-foreground">{capitalize(employee.department)}</p>
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
                      <p className="text-xs text-muted-foreground mb-1">Job Title</p>
                      <p className="text-sm text-foreground">{employee.jobTitle || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Employment Type</p>
                      <p className="text-sm text-foreground">{capitalize(employee.employeeType)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Biometric Status</p>
                      <BiometricBadge registered={employee.biometricRegistered} />
                    </div>
                  </div>

                  <Button className="w-full mt-4" variant="secondary" asChild>
                    <span>View Details</span>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          data={filteredEmployees}
          columns={columns}
          emptyMessage="No employees found matching your criteria"
        />
      )}

      {/* Empty State */}
      {filteredEmployees.length === 0 && viewMode === "grid" && (
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
