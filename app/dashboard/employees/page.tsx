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
import { User, Search, LayoutGrid, Table, Upload, UserPlus, Building, Building2, Briefcase } from "lucide-react"
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
  const [biometricFilter, setBiometricFilter] = useState<"all" | "registered" | "not_registered">("all")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [agencies, setAgencies] = useState<string[]>([])

  // Sheet states
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

  const loadEmployees = useCallback(async () => {
    try {
      const [employeesData, depts, agcs] = await Promise.all([
        db.employees.getAll(true), // Fetch all employees
        db.departments.getAll(),
        db.agencies.getAll().catch(() => []),
      ])

      setEmployees(employeesData.map(mapDbEmployeeToEmployee))
      setDepartments(Array.from(new Set(depts.map((d: any) => d.name))) as string[])
      setAgencies(Array.from(new Set(agcs.map((a: any) => a.name))) as string[])
    } catch (error) {
      console.error("Error loading employees:", error)
    }
  }, [])

  useEffect(() => {
    loadEmployees()
    const interval = setInterval(loadEmployees, REFRESH_INTERVALS.EMPLOYEES)
    return () => clearInterval(interval)
  }, [loadEmployees])

  const [currentPage, setCurrentPage] = useState(1)

  const filteredEmployees = useMemo(() => {
    const filtered = employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.empId.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesDept = departmentFilter === "all" || emp.department === departmentFilter
      const matchesAgency = agencyFilter === "all" || emp.agency === agencyFilter

      const matchesBiometric =
        biometricFilter === "all" ||
        (biometricFilter === "registered" && emp.biometricRegistered) ||
        (biometricFilter === "not_registered" && !emp.biometricRegistered)

      return matchesSearch && matchesDept && matchesAgency && matchesBiometric
    })

    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === "department") {
      filtered.sort((a, b) => (a.department || "").localeCompare(b.department || ""))
    }

    return filtered
  }, [searchTerm, departmentFilter, agencyFilter, sortBy, biometricFilter, employees])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE)
  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  }, [filteredEmployees, currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, departmentFilter, agencyFilter, sortBy, biometricFilter])

  // Biometric badge component
  const BiometricBadge = ({ registered, className }: { registered: boolean; className?: string }) => {
    const config = registered ? BIOMETRIC_STATUS.registered : BIOMETRIC_STATUS.not_registered
    return (
      <Badge variant={registered ? "default" : "secondary"} className={cn(config.badgeClass, className)}>
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

          <Select value={biometricFilter} onValueChange={(v: any) => setBiometricFilter(v)}>
            <SelectTrigger className="w-[180px] h-10">
              <SelectValue placeholder="Biometric Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Biometrics</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="not_registered">Not Registered</SelectItem>
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
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {paginatedEmployees.map((employee) => (
              <Link key={employee.id} href={`/dashboard/employees/${employee.empId}`}>
                <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/40 cursor-pointer transition-all duration-300 h-full hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden">
                  {/* Subtle accent line on hover */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-center gap-3.5 mb-5">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary transition-all duration-300 shadow-sm">
                        <User className="w-5.5 h-5.5 text-primary group-hover:text-white transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-bold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                          {capitalize(employee.name)}
                        </h3>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70 mt-0.5">
                          {employee.empId}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      <div className="flex items-center gap-2.5 text-muted-foreground/80 group-hover:text-muted-foreground transition-colors">
                        <div className="p-1 rounded-md bg-muted/30">
                          <Building className="h-3 w-3 shrink-0" />
                        </div>
                        <span className="text-[12.5px] truncate">{capitalize(employee.department)}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-muted-foreground/80 group-hover:text-muted-foreground transition-colors">
                        <div className="p-1 rounded-md bg-muted/30">
                          <Building2 className="h-3 w-3 shrink-0" />
                        </div>
                        <span className="text-[12.5px] truncate">{employee.agency || "N/A"}</span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/50 leading-none">Status</span>
                        <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 bg-background font-semibold border-border/60">
                          {capitalize(employee.employeeType || "Staff")}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/50 leading-none">Biometric</span>
                        <BiometricBadge registered={employee.biometricRegistered} className="h-5 px-2 text-[10px] font-semibold" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {filteredEmployees.length > 0 && (
            <div className="flex items-center justify-between mt-8 px-2">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)}
                </span>{" "}
                of <span className="font-medium text-foreground">{filteredEmployees.length}</span> results
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm font-medium">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <DataTable
          data={filteredEmployees}
          columns={columns}
          emptyMessage="No employees found matching your criteria"
          pagination
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
