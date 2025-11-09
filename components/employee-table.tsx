"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Employee } from "./qr-code-generator"

interface EmployeeTableProps {
  employees: Employee[]
  onDownload: (employee: Employee) => void
}

export function EmployeeTable({ employees, onDownload }: EmployeeTableProps) {
  return (
    <Card className="border-blue-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Employee ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Department</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Generated</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 text-sm font-semibold text-blue-900">{emp.empId}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{emp.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.department || "—"}</td>
                <td className="px-6 py-4 text-sm text-gray-600 truncate">{emp.email || "—"}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{new Date(emp.timestamp).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-center">
                  <Button
                    size="sm"
                    onClick={() => onDownload(emp)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Download
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
