"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FingerprintForm } from "./fingerprint-form"
import { FingerprintDisplay } from "./fingerprint-display"
import { FingerprintScanner } from "./fingerprint-scanner"
import { employeeStorage, type Employee as StorageEmployee, type BiometricCredential } from "@/lib/storage"

// Agency list with codes
const AGENCIES = [
    { id: "ninani-group", name: "Ninani Group", code: "NG" },
    { id: "rezultz", name: "Rezultz", code: "RZ" },
    { id: "id", name: "ID", code: "ID" },
    { id: "tpmc", name: "TPMC", code: "TP" },
    { id: "innovaddb", name: "InnovaDDB", code: "IN" },
    { id: "brandalert", name: "BrandAlert", code: "BA" },
    { id: "p2p", name: "P2P", code: "P2" }
]

export interface Employee {
    id: string
    empId: string
    name: string
    department: string
    email: string
    agency: string
    timestamp: string
    hash: string
    fingerprintId?: string
    fingerprintRegistered?: boolean
    fingerprintTimestamp?: string
    biometricCredential?: BiometricCredential
}

export function FingerprintGenerator() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [pendingEmployee, setPendingEmployee] = useState<Employee | null>(null)
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
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

    // Generate unique fingerprint ID
    const generateFingerprintId = (empId: string): string => {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8).toUpperCase()
        return `FP-${empId}-${random}-${timestamp.toString(36).toUpperCase()}`
    }

    // Generate unique employee ID based on agency
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

    // Check if employee ID already exists
    const isDuplicateEmployeeId = (empId: string): boolean => {
        return employees.some(emp => emp.empId.toLowerCase() === empId.toLowerCase())
    }

    const handleAddEmployee = (formData: {
        name: string
        department: string
        email: string
        agency: string
    }) => {
        // Generate employee ID based on selected agency
        const generatedEmpId = generateEmployeeId(formData.agency)

        // Double-check for duplicates
        if (isDuplicateEmployeeId(generatedEmpId)) {
            setErrorMessage(`Error: Generated Employee ID "${generatedEmpId}" already exists. Please try again.`)
            setTimeout(() => setErrorMessage(""), 5000)
            return
        }

        const timestamp = new Date().toISOString()
        const hash = generateHash(generatedEmpId, timestamp)
        const fingerprintId = generateFingerprintId(generatedEmpId)
        const agency = AGENCIES.find(a => a.id === formData.agency)

        const newEmployee: Employee = {
            id: `emp_${Date.now()}`,
            empId: generatedEmpId,
            name: formData.name,
            department: formData.department,
            email: formData.email,
            agency: agency?.name || formData.agency,
            timestamp,
            hash,
            fingerprintId,
            fingerprintRegistered: true,
            fingerprintTimestamp: timestamp,
        }

        // Start scanning animation
        setPendingEmployee(newEmployee)
        setIsScanning(true)
    }

    const handleScanComplete = (credential: BiometricCredential) => {
        if (!pendingEmployee) return

        // Add biometric credential to employee
        const employeeWithCredential: Employee = {
            ...pendingEmployee,
            biometricCredential: credential,
            fingerprintRegistered: true,
            fingerprintTimestamp: credential.registeredAt,
        }

        // Save to storage
        employeeStorage.save(employeeWithCredential as StorageEmployee)

        // Verify it was saved
        const savedEmployee = employeeStorage.getByEmpId(employeeWithCredential.empId)
        console.log("Employee saved:", employeeWithCredential)
        console.log("Employee retrieved from storage:", savedEmployee)

        if (!savedEmployee) {
            console.error("ERROR: Employee was not saved to storage!")
            setErrorMessage(`Warning: Employee may not have been saved correctly`)
            setTimeout(() => setErrorMessage(""), 5000)
        } else {
            setSuccessMessage(`Fingerprint registered successfully for ${employeeWithCredential.name} (ID: ${employeeWithCredential.empId})`)
            setTimeout(() => setSuccessMessage(""), 5000)
        }

        setEmployees([employeeWithCredential, ...employees])
        setSelectedEmployee(employeeWithCredential)
        setIsScanning(false)
        setPendingEmployee(null)
    }

    const handleScanError = (error: string) => {
        setErrorMessage(error)
        setTimeout(() => setErrorMessage(""), 5000)
        setIsScanning(false)
        setPendingEmployee(null)
    }

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
                    const fingerprintId = generateFingerprintId(generatedEmpId)

                    newEmployees.push({
                        id: `emp_${Date.now()}_${Math.random()}`,
                        empId: generatedEmpId,
                        name,
                        department: department || "",
                        email: email || "",
                        agency: agency.name,
                        timestamp,
                        hash,
                        fingerprintId,
                        fingerprintRegistered: true,
                        fingerprintTimestamp: timestamp,
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
                setSuccessMessage(`${newEmployees.length} fingerprints registered successfully${errors.length > 0 ? ` (${errors.length} errors)` : ''}`)
                setTimeout(() => setSuccessMessage(""), 5000)
            }
        }

        reader.readAsText(file)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
            {/* Header */}
            <div className="bg-white border-b border-green-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm3 8V7c0-1.654-1.346-3-3-3S9 5.346 9 7v3h6z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">Employee Fingerprint Registration</h1>
                    </div>
                    <p className="text-gray-600 ml-13">Register and manage employee fingerprints for attendance</p>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mx-4 mt-4 rounded">
                    <p className="text-green-800 font-medium">{successMessage}</p>
                </div>
            )}

            {/* Error Message */}
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
                        <Card className="p-6 border-green-100">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Register Employee</h2>
                            <FingerprintForm
                                onSubmit={handleAddEmployee}
                                agencies={AGENCIES}
                                isScanning={isScanning}
                            />

                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Bulk Upload</h3>
                                <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    variant="outline"
                                    className="w-full text-green-600 border-green-200 hover:bg-green-50"
                                    disabled={isScanning}
                                >
                                    Upload CSV
                                </Button>
                                <p className="text-xs text-gray-500 mt-2">
                                    CSV format: name,department,email,agencyId
                                </p>
                                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
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

                    {/* Display Section */}
                    <div className="lg:col-span-2">
                        {isScanning && pendingEmployee ? (
                            <FingerprintScanner
                                employeeId={pendingEmployee.empId}
                                employeeName={pendingEmployee.name}
                                employeeEmail={pendingEmployee.email}
                                onScanComplete={handleScanComplete}
                                onError={handleScanError}
                            />
                        ) : selectedEmployee ? (
                            <FingerprintDisplay employee={selectedEmployee} />
                        ) : (
                            <Card className="p-12 border-green-100 flex flex-col items-center justify-center min-h-96">
                                <div className="text-center">
                                    <div className="text-green-300 mb-4">
                                        <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm3 8V7c0-1.654-1.346-3-3-3S9 5.346 9 7v3h6z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-600">Add an employee or upload a CSV to register fingerprints</p>
                                    <p className="text-sm text-gray-500 mt-2">Employee IDs will be auto-generated based on agency</p>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Employee List */}
                {employees.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Registered Employees</h2>
                        <Card className="p-6 border-green-100">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee ID</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Agency</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fingerprint ID</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Registered</th>
                                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.map((emp) => (
                                            <tr key={emp.id} className="border-b border-gray-100 hover:bg-green-50 transition-colors">
                                                <td className="py-3 px-4 text-sm font-medium text-gray-900">{emp.empId}</td>
                                                <td className="py-3 px-4 text-sm text-gray-900">{emp.name}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600">{emp.agency}</td>
                                                <td className="py-3 px-4 text-sm text-green-600 font-mono">{emp.fingerprintId}</td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                        </svg>
                                                        Registered
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <Button
                                                        onClick={() => setSelectedEmployee(emp)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 border-green-200 hover:bg-green-50"
                                                    >
                                                        View
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}

// Export both named and default
export default FingerprintGenerator
