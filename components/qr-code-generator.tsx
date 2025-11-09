"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EmployeeForm } from "./employee-form"
import { QRCodeDisplay } from "./qr-code-display"
import { EmployeeTable } from "./employee-table"
import { QRCodeGrid } from "./qr-code-grid"
import { QRCodeSVG } from "qrcode.react"
import { employeeStorage, type Employee as StorageEmployee } from "@/lib/storage"

export interface Employee {
  id: string
  empId: string
  name: string
  department: string
  email: string
  timestamp: string
  hash: string
  qrCode?: string
}

export function QRCodeGenerator() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load employees from storage on mount
  useEffect(() => {
    const storedEmployees = employeeStorage.getAll()
    if (storedEmployees.length > 0) {
      setEmployees(storedEmployees as Employee[])
    }
  }, [])

  const generateHash = (empId: string, timestamp: string): string => {
    const data = `${empId}:${timestamp}:SECURE_TOKEN`
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).slice(0, 16)
  }

  const generateQRCodeData = (employee: Employee): string => {
    return JSON.stringify({
      empId: employee.empId,
      name: employee.name,
      generated: employee.timestamp,
      hash: employee.hash,
    })
  }

  const handleAddEmployee = (formData: { empId: string; name: string; department: string; email: string }) => {
    const timestamp = new Date().toISOString()
    const hash = generateHash(formData.empId, timestamp)
    const newEmployee: Employee = {
      id: `emp_${Date.now()}`,
      empId: formData.empId,
      name: formData.name,
      department: formData.department,
      email: formData.email,
      timestamp,
      hash,
    }

    // Save to storage
    employeeStorage.save(newEmployee as StorageEmployee)
    
    // Verify it was saved
    const savedEmployee = employeeStorage.getByEmpId(newEmployee.empId)
    console.log("Employee saved:", newEmployee)
    console.log("Employee retrieved from storage:", savedEmployee)
    
    if (!savedEmployee) {
      console.error("ERROR: Employee was not saved to storage!")
      setSuccessMessage(`Warning: Employee may not have been saved correctly`)
    } else {
      setSuccessMessage(`QR Code generated successfully for ${newEmployee.name}`)
    }
    
    setEmployees([newEmployee, ...employees])
    setSelectedEmployee(newEmployee)
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").slice(1)
      const newEmployees: Employee[] = []

      lines.forEach((line) => {
        if (!line.trim()) return
        const [empId, name, department, email] = line.split(",").map((s) => s.trim())
        if (empId && name) {
          const timestamp = new Date().toISOString()
          const hash = generateHash(empId, timestamp)
          newEmployees.push({
            id: `emp_${Date.now()}_${Math.random()}`,
            empId,
            name,
            department: department || "",
            email: email || "",
            timestamp,
            hash,
          })
        }
      })

      // Save all to storage
      const allEmployeesToSave = [...newEmployees, ...employees] as StorageEmployee[]
      employeeStorage.saveAll(allEmployeesToSave)
      
      // Verify employees were saved
      console.log(`Saved ${allEmployeesToSave.length} employees to storage`)
      const savedCount = employeeStorage.getAll().length
      console.log(`Verified: ${savedCount} employees in storage`)
      
      setEmployees([...newEmployees, ...employees])
      setSuccessMessage(`${newEmployees.length} QR codes generated successfully`)
      setTimeout(() => setSuccessMessage(""), 3000)
    }

    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadSingleQR = (employee: Employee) => {
    try {
      // Try multiple possible element IDs
      let element = document.getElementById(`qr-${employee.id}`)
      if (!element) {
        element = document.getElementById(`qr-display-${employee.id}`)
      }
      if (!element) {
        element = document.getElementById(`qr-grid-${employee.id}`)
      }
      if (!element) {
        // Try finding by employee ID in QR code grid - find the one that matches
        const allQRCodes = document.querySelectorAll('[id^="qr-"]')
        for (const qrEl of allQRCodes) {
          if (qrEl.id.includes(employee.id)) {
            const svg = qrEl.querySelector("svg")
            if (svg) {
              element = qrEl as HTMLElement
              break
            }
          }
        }
      }
      
      if (!element) {
        console.error("QR code element not found for employee:", employee.empId)
        alert(`QR code not found for ${employee.name}. Please ensure the QR code is visible on the page.`)
        return
      }

      // Find SVG element
      const svg = element.querySelector("svg")
      if (!svg) {
        console.error("SVG element not found in:", element)
        alert("QR code SVG not found. Please try again.")
        return
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svg.cloneNode(true) as SVGElement
      
      // Get SVG as string
      const svgData = new XMLSerializer().serializeToString(clonedSvg)
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
      const svgUrl = URL.createObjectURL(svgBlob)

      // Create a canvas to convert SVG to PNG
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        // Set canvas size
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw image on canvas
        if (ctx) {
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0)
          
          // Download as PNG
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const link = document.createElement("a")
              link.href = url
              link.download = `${employee.empId}_QRCode.png`
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
              URL.revokeObjectURL(url)
            }
            URL.revokeObjectURL(svgUrl)
          }, "image/png")
        }
      }

      img.onerror = () => {
        // Fallback: download as SVG
        const link = document.createElement("a")
        link.href = svgUrl
        link.download = `${employee.empId}_QRCode.svg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(svgUrl)
      }

      img.src = svgUrl
    } catch (error) {
      console.error("Error downloading QR code:", error)
      alert("Failed to download QR code. Please try again.")
    }
  }

  const downloadAllQR = async () => {
    for (const employee of employees) {
      downloadSingleQR(employee)
      // Wait between downloads to avoid browser blocking multiple downloads
      await new Promise((resolve) => setTimeout(resolve, 300))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">QR</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Employee QR Code Generator</h1>
          </div>
          <p className="text-gray-600 ml-13">Generate and manage attendance QR codes for your employees</p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mx-4 mt-4 rounded">
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 border-blue-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Single Employee</h2>
              <EmployeeForm onSubmit={handleAddEmployee} />

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Bulk Upload</h3>
                <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  Upload CSV
                </Button>
                <p className="text-xs text-gray-500 mt-2">CSV format: employeeId,name,department,email</p>
              </div>
            </Card>
          </div>

          {/* QR Display Section */}
          <div className="lg:col-span-2">
            {selectedEmployee ? (
              <QRCodeDisplay employee={selectedEmployee} onDownload={downloadSingleQR} />
            ) : (
              <Card className="p-12 border-blue-100 flex flex-col items-center justify-center min-h-96">
                <div className="text-center">
                  <div className="text-blue-300 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 9v2m0 4v2m0 4v2M6 9h12M3 3h18v18H3z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-600">Add an employee or upload a CSV to generate QR codes</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Grid View and Download */}
        {employees.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Generated QR Codes</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowGrid(!showGrid)}
                  variant="outline"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  {showGrid ? "Hide Grid" : "View Grid"}
                </Button>
                {employees.length > 1 && (
                  <Button onClick={downloadAllQR} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Download All ({employees.length})
                  </Button>
                )}
              </div>
            </div>

            {showGrid && <QRCodeGrid employees={employees} onDownload={downloadSingleQR} />}

            {/* Employee Table */}
            <EmployeeTable employees={employees} onDownload={downloadSingleQR} />
          </>
        )}
      </div>

      {/* Hidden QR Storage */}
      <div className="hidden">
        {employees.map((emp) => (
          <div key={emp.id} id={`qr-${emp.id}`}>
            <QRCodeSVG
              value={JSON.stringify({
                empId: emp.empId,
                name: emp.name,
                generated: emp.timestamp,
                hash: emp.hash,
              })}
              size={256}
              level="H"
              includeMargin
            />
          </div>
        ))}
      </div>
    </div>
  )
}
