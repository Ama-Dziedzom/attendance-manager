"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Agency {
  id: string
  name: string
  code: string
}

interface EmployeeFormProps {
  onSubmit: (data: { 
    name: string
    department: string
    email: string
    agency: string
  }) => void
  agencies: Agency[]
}

export function EmployeeForm({ onSubmit, agencies }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    department: "",
    email: "",
    agency: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    if (!formData.name.trim()) {
      alert("Please enter employee name")
      return
    }
    
    if (!formData.agency) {
      alert("Please select an agency")
      return
    }
    
    onSubmit(formData)
    
    // Reset form
    setFormData({
      name: "",
      department: "",
      email: "",
      agency: "",
    })
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
            value={formData.agency}
            onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
            className="w-full h-10 px-3 pr-10 border border-input rounded-md bg-background text-foreground appearance-none cursor-pointer hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            required
          >
            <option value="" disabled>Select agency...</option>
            {agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name} ({agency.code})
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {formData.agency && (
          <p className="text-xs text-muted-foreground mt-1">
            Employee ID will start with: <span className="font-semibold">{agencies.find(a => a.id === formData.agency)?.code}</span>
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="department" className="text-gray-700">
          Department
        </Label>
        <Input
          id="department"
          type="text"
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          placeholder="Engineering"
          className="mt-1"
        />
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
        />
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
        Generate QR Code
      </Button>
      
      {/* Info box about auto-generated IDs */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-xs text-blue-800">
          <span className="font-semibold">Note:</span> Employee ID will be automatically generated based on the selected agency (e.g., HO0001, AC0001).
        </p>
      </div>
    </form>
  )
}