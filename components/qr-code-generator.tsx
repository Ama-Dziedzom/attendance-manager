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

// ← NEW: Agency list with codes
const AGENCIES = [
  { id: "head-office", name: "Head Office", code: "HO" },
  { id: "branch-accra", name: "Accra Branch", code: "AC" },
  { id: "branch-kumasi", name: "Kumasi Branch", code: "KU" },
  { id: "branch-takoradi", name: "Takoradi Branch", code: "TA" },
  { id: "branch-tema", name: "Tema Branch", code: "TE" },
  { id: "remote", name: "Remote/WFH", code: "RE" }
]

export interface Employee {
  id: string
  empId: string
  name: string
  department: string
  email: string
  agency: string // ← NEW
  timestamp: string
  hash: string
  qrCode?: string
}

export function QRCodeGenerator() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("") // ← NEW
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

  // ← NEW: Generate unique employee ID based on agency
  const generateEmployeeId = (agencyId: string): string => {
    const agency = AGENCIES.find(a => a.id === agencyId)
    const agencyCode = agency?.code || "XX"
    
    // Get existing employee IDs for this agency
    const existingIds = employees
      .filter(e => e.empId.startsWith(agencyCode))
      .map(e => {
        const numPart = e.empId.substring(2)
        return parseInt(numPart, 10)
      })
      .filter(num => !isNaN(num))
    
    // Find next available number
    let nextNumber = 1
    while (existingIds.includes(nextNumber)) {
      nextNumber++
    }
    
    // Format as 4-digit number with leading zeros
    const numberPart = nextNumber.toString().padStart(4, '0')
    
    return `${agencyCode}${numberPart}`
  }

  // ← NEW: Check if employee ID already exists
  const isDuplicateEmployeeId = (empId: string): boolean => {
    return employees.some(emp => emp.empId.toLowerCase() === empId.toLowerCase())
  }

  // ← MODIFIED: Updated to include agency parameter
  const handleAddEmployee = (formData: { 
    name: string
    department: string
    email: string
    agency: string // ← NEW
  }) => {
    // Generate employee ID based on selected agency
    const generatedEmpId = generateEmployeeId(formData.agency)
    
    // Double-check for duplicates (shouldn't happen with auto-generation)
    if (isDuplicateEmployeeId(generatedEmpId)) {
      setErrorMessage(`Error: Generated Employee ID "${generatedEmpId}" already exists. Please try again.`)
      setTimeout(() => setErrorMessage(""), 5000)
      return
    }

    const timestamp = new Date().toISOString()
    const hash = generateHash(generatedEmpId, timestamp)
    const agency = AGENCIES.find(a => a.id === formData.agency)
    
    const newEmployee: Employee = {
      id: `emp_${Date.now()}`,
      empId: generatedEmpId,
      name: formData.name,
      department: formData.department,
      email: formData.email,
      agency: agency?.name || formData.agency, // ← NEW
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
      setErrorMessage(`Warning: Employee may not have been saved correctly`)
      setTimeout(() => setErrorMessage(""), 5000)
    } else {
      setSuccessMessage(`QR Code generated successfully for ${newEmployee.name} (ID: ${generatedEmpId})`)
      setTimeout(() => setSuccessMessage(""), 5000)
    }
    
    setEmployees([newEmployee, ...employees])
    setSelectedEmployee(newEmployee)
  }

  // ← MODIFIED: Updated CSV upload to include agency
  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").slice(1)
      const newEmployees: Employee[] = []
      const errors: string[] = []

      lines.forEach((line, index) => {
        if (!line.trim()) return
        
        // CSV format: name,department,email,agencyId
        const [name, department, email, agencyId] = line.split(",").map((s) => s.trim())
        
        if (name && agencyId) {
          // Validate agency exists
          const agency = AGENCIES.find(a => a.id === agencyId || a.name === agencyId)
          
          if (!agency) {
            errors.push(`Line ${index + 2}: Invalid agency "${agencyId}"`)
            return
          }
          
          // Generate employee ID
          const generatedEmpId = generateEmployeeId(agency.id)
          
          const timestamp = new Date().toISOString()
          const hash = generateHash(generatedEmpId, timestamp)
          
          newEmployees.push({
            id: `emp_${Date.now()}_${Math.random()}`,
            empId: generatedEmpId,
            name,
            department: department || "",
            email: email || "",
            agency: agency.name,
            timestamp,
            hash,
          })
        } else {
          errors.push(`Line ${index + 2}: Missing name or agency`)
        }
      })

      if (errors.length > 0) {
        setErrorMessage(`CSV Upload Errors:\n${errors.join('\n')}`)
        setTimeout(() => setErrorMessage(""), 8000)
      }

      if (newEmployees.length > 0) {
        // Save all to storage
        const allEmployeesToSave = [...newEmployees, ...employees] as StorageEmployee[]
        employeeStorage.saveAll(allEmployeesToSave)
        
        // Verify employees were saved
        console.log(`Saved ${allEmployeesToSave.length} employees to storage`)
        const savedCount = employeeStorage.getAll().length
        console.log(`Verified: ${savedCount} employees in storage`)
        
        setEmployees([...newEmployees, ...employees])
        setSuccessMessage(`${newEmployees.length} QR codes generated successfully${errors.length > 0 ? ` (${errors.length} errors)` : ''}`)
        setTimeout(() => setSuccessMessage(""), 5000)
      }
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

      {/* ← NEW: Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-4 mt-4 rounded">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-medium whitespace-pre-line">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <Card className="p-6 border-blue-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Single Employee</h2>
              {/* FIX: Fix type mismatch by adjusting onSubmit prop to match EmployeeForm expected type */}
              <EmployeeForm
                onSubmit={(data) => {
                  // data: { name: string; department: string; email: string; agency: string }
                  // Safe forward: matches required type, do not add empId here.
                  handleAddEmployee({
                    name: data.name,
                    department: data.department,
                    email: data.email,
                    agency: data.agency,
                  })
                } } agencies={[]}              />
              
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
                {/* ← MODIFIED: Updated CSV format instructions */}
                <p className="text-xs text-gray-500 mt-2">
                  CSV format: name,department,email,agencyId
                </p>
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                  <p className="font-semibold mb-1">Valid Agency IDs:</p>
                  <ul className="space-y-0.5">
                    {AGENCIES.map(a => (
                      <li key={a.id}>• {a.id} ({a.code}) - {a.name}</li>
                    ))}
                  </ul>
                </div>
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
                  <p className="text-sm text-gray-500 mt-2">Employee IDs will be auto-generated based on agency</p>
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

// Export both named and default
export default QRCodeGenerator