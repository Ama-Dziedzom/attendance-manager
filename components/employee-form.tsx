"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { db } from "@/lib/supabase/db"
import { toast } from "sonner"

interface Department {
  id: string
  name: string
}

interface Agency {
  id: string
  name: string
}

interface EmployeeFormProps {
  onSubmit: (employee: any) => void
  onSuccess?: () => void
}

export function EmployeeForm({ onSubmit, onSuccess }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    departmentId: "",
    email: "",
    agencyId: "",
  })

  const [departments, setDepartments] = useState<Department[]>([])
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Load departments and agencies from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingData(true)
        const [depts, ags] = await Promise.all([
          db.departments.getAll(),
          db.agencies.getAll(),
        ])

        setDepartments(depts)
        setAgencies(ags)
      } catch (error) {
        console.error("Error loading data:", error)
        toast.error("Failed to load departments and agencies")
      } finally {
        setIsLoadingData(false)
      }
    }

    loadData()
  }, [])

  const generateEmpId = () => {
    // Generate employee ID based on agency
    const agency = agencies.find(a => a.id === formData.agencyId)
    if (!agency) return ""

    // Use first 3 chars of agency name + random number
    const prefix = agency.name.substring(0, 3).toUpperCase()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `${prefix}-${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    if (!formData.name.trim()) {
      toast.error("Please enter employee name")
      return
    }

    if (!formData.agencyId) {
      toast.error("Please select an agency")
      return
    }

    if (!formData.departmentId) {
      toast.error("Please select a department")
      return
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address")
      return
    }

    setIsLoading(true)

    try {
      // Generate employee ID
      const empId = generateEmpId()

      // Create employee in Supabase
      const newEmployee = await db.employees.create({
        emp_id: empId,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        department_id: formData.departmentId,
        agency_id: formData.agencyId,
        employee_type: 'full_time',
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
      })

      toast.success(`Employee ${newEmployee.name} created successfully!`)

      // Call parent callback
      onSubmit(newEmployee)
      onSuccess?.()

      // Reset form
      setFormData({
        name: "",
        departmentId: "",
        email: "",
        agencyId: "",
      })
    } catch (error: any) {
      console.error("Error creating employee:", error)
      toast.error(error.message || "Failed to create employee")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-gray-700">
          Employee Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="John Doe"
          className="mt-1"
          required
          disabled={isLoading}
        />
      </div>

      {/* Agency Dropdown */}
      <div>
        <Label htmlFor="agency" className="text-gray-700">
          Agency <span className="text-red-500">*</span>
        </Label>
        <div className="relative mt-1">
          <select
            id="agency"
            value={formData.agencyId}
            onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
            className="w-full h-10 px-3 pr-10 border border-input rounded-md bg-background text-foreground appearance-none cursor-pointer hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            required
            disabled={isLoading}
          >
            <option value="" disabled>Select agency...</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {formData.agencyId && (
          <p className="text-xs text-muted-foreground mt-1">
            Selected: <span className="font-semibold">{agencies.find(a => a.id === formData.agencyId)?.name}</span>
          </p>
        )}
      </div>

      {/* Department Dropdown */}
      <div>
        <Label htmlFor="department" className="text-gray-700">
          Department <span className="text-red-500">*</span>
        </Label>
        <div className="relative mt-1">
          <select
            id="department"
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            className="w-full h-10 px-3 pr-10 border border-input rounded-md bg-background text-foreground appearance-none cursor-pointer hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            required
            disabled={isLoading}
          >
            <option value="" disabled>Select department...</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="email" className="text-gray-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="john.doe@company.com"
          className="mt-1"
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Creating Employee...
          </>
        ) : (
          "Create Employee"
        )}
      </Button>

      {/* Info box about auto-generated IDs */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Note:</span> Employee ID will be automatically generated based on the selected agency.
        </p>
      </div>
    </form>
  )
}