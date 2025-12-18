"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { QRCodeSVG } from "qrcode.react"
import type { Employee } from "./qr-code-generator"

interface QRCodeDisplayProps {
  employee: Employee
  onDownload: (employee: Employee) => void
}

export function QRCodeDisplay({ employee, onDownload }: QRCodeDisplayProps) {
  return (
    <Card className="p-8 border-blue-100">
      <div className="flex flex-col items-center">
        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg border-2 border-blue-100 mb-6" id={`qr-display-${employee.id}`}>
          <QRCodeSVG
            value={JSON.stringify({
              empId: employee.empId,
              name: employee.name,
              generated: employee.timestamp,
              hash: employee.hash,
            })}
            size={280}
            level="H"
            includeMargin
            fgColor="#1e40af"
            bgColor="#f8fafc"
          />
        </div>

        {/* Employee Details */}
        <div className="w-full bg-blue-50 rounded-lg p-4 mb-6 border border-blue-100">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Employee ID</p>
              <p className="text-lg font-bold text-blue-900">{employee.empId}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</p>
              <p className="text-lg font-bold text-blue-900">{employee.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</p>
              <p className="text-lg font-bold text-blue-900">{employee.department || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</p>
              <p className="text-sm font-bold text-blue-900 truncate">{employee.email || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Security Info */}
        <div className="w-full text-center text-xs text-gray-600 mb-6 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="font-mono text-xs">Hash: {employee.hash}</p>
          <p className="text-xs mt-1">{new Date(employee.timestamp).toLocaleString()}</p>
        </div>

        {/* Download Button */}
        <Button
          onClick={() => onDownload(employee)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
        >
          Download QR Code
        </Button>
      </div>
    </Card>
  )
}
