"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { db } from "@/lib/supabase/db"
import { mapDbEmployeeToEmployee, type Employee } from "@/lib/types"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

interface EmployeeTableProps {
  onDownload?: (employee: Employee) => void
  refreshTrigger?: number
}

export function EmployeeTable({ onDownload, refreshTrigger }: EmployeeTableProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        setIsLoading(true)
        const data = await db.employees.getAll()
        const mapped = data.map(mapDbEmployeeToEmployee)
        setEmployees(mapped)
      } catch (error) {
        console.error("Error loading employees:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEmployees()
  }, [refreshTrigger])

  if (isLoading) {
    return (
      <Card className="border-blue-100 overflow-hidden">
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  if (employees.length === 0) {
    return (
      <Card className="border-blue-100 overflow-hidden">
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">No employees found.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first employee to get started.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-blue-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Employee ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Agency</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Biometric</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Joined</th>
              {onDownload && (
                <th className="px-6 py-3 text-center text-sm font-semibold">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 text-sm font-semibold text-blue-900">
                  {emp.empId}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{emp.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {emp.department || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {emp.agency || "—"}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">
                  {emp.email || "—"}
                </td>
                <td className="px-6 py-4 text-center">
                  {emp.biometricRegistered ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Registered
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Registered
                    </Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-gray-500">
                  {new Date(emp.createdAt).toLocaleDateString()}
                </td>
                {onDownload && (
                  <td className="px-6 py-4 text-center">
                    <Button
                      size="sm"
                      onClick={() => onDownload(emp)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Download
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="bg-blue-50 px-6 py-3 border-t border-blue-100">
        <p className="text-sm text-gray-600">
          Total: <span className="font-semibold">{employees.length}</span> employees •{" "}
          <span className="text-green-600 font-semibold">
            {employees.filter(e => e.biometricRegistered).length}
          </span>{" "}
          with biometric •{" "}
          <span className="text-gray-600 font-semibold">
            {employees.filter(e => !e.biometricRegistered).length}
          </span>{" "}
          pending registration
        </p>
      </div>
    </Card>
  )
}
