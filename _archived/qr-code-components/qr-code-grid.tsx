"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QRCodeSVG } from "qrcode.react"
import type { Employee } from "./qr-code-generator"

interface QRCodeGridProps {
  employees: Employee[]
  onDownload: (employee: Employee) => void
}

export function QRCodeGrid({ employees, onDownload }: QRCodeGridProps) {
  return (
    <Card className="p-6 border-blue-100 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {employees.map((emp) => (
          <div key={emp.id} id={`qr-grid-${emp.id}`} className="flex flex-col items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
            <QRCodeSVG
              value={JSON.stringify({
                empId: emp.empId,
                name: emp.name,
                generated: emp.timestamp,
                hash: emp.hash,
              })}
              size={160}
              level="H"
              includeMargin
              fgColor="#1e40af"
              bgColor="#f8fafc"
            />
            <p className="text-sm font-semibold text-gray-900 mt-3 text-center">{emp.empId}</p>
            <p className="text-xs text-gray-600 text-center">{emp.name}</p>
            <Button
              size="sm"
              onClick={() => onDownload(emp)}
              variant="outline"
              className="mt-3 w-full text-xs border-blue-200 text-blue-600 hover:bg-blue-100"
            >
              Download
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
