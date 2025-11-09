"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface EmployeeFormProps {
  onSubmit: (data: { empId: string; name: string; department: string; email: string }) => void
}

export function EmployeeForm({ onSubmit }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    empId: "",
    name: "",
    department: "",
    email: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.empId && formData.name) {
      onSubmit(formData)
      setFormData({ empId: "", name: "", department: "", email: "" })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
        <Input
          type="text"
          name="empId"
          value={formData.empId}
          onChange={handleChange}
          placeholder="e.g., EMP001"
          required
          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <Input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
          required
          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <Input
          type="text"
          name="department"
          value={formData.department}
          onChange={handleChange}
          placeholder="Engineering"
          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <Input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="john@example.com"
          className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium">
        Generate QR Code
      </Button>
    </form>
  )
}
