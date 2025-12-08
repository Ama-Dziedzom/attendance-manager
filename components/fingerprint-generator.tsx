"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FingerprintForm } from "./fingerprint-form"
import { FingerprintDisplay } from "./fingerprint-display"
import { FingerprintScanner } from "./fingerprint-scanner"
import { employeeStorage, type Employee as StorageEmployee, type BiometricCredential } from "@/lib/storage"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Fingerprint, Eye, Search, AlertCircle, CheckCircle2, UserPlus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b border-border shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                            <Fingerprint className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-3xl font-bold text-foreground">Employee Fingerprint Registration</h1>
                    </div>
                    <p className="text-muted-foreground ml-13">Register and manage employee fingerprints for attendance</p>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <Alert variant="default" className="border-green-200 bg-green-50 text-green-900">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertTitle>Success</AlertTitle>
                        <AlertDescription>{successMessage}</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Error Message */}
            {errorMessage && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription className="whitespace-pre-line">{errorMessage}</AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Form Section */}
                    <div className="lg:col-span-1">
                        <Card className="h-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-primary" />
                                    Register Employee
                                </CardTitle>
                                <CardDescription>Enter details to register new fingerprint</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FingerprintForm
                                    onSubmit={handleAddEmployee}
                                    agencies={AGENCIES}
                                    isScanning={isScanning}
                                />

                                <div className="mt-6 pt-6 border-t border-border">
                                    <h3 className="text-sm font-semibold text-foreground mb-3">Bulk Upload</h3>
                                    <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        variant="outline"
                                        className="w-full"
                                        disabled={isScanning}
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Upload CSV
                                    </Button>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        CSV format: name,department,email,agencyId
                                    </p>
                                    <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                                        <p className="font-semibold mb-1 text-foreground">Valid Agency IDs:</p>
                                        <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                                            {AGENCIES.map(a => (
                                                <li key={a.id}>• {a.id} ({a.code}) - {a.name}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
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
                            <Card className="flex flex-col items-center justify-center min-h-[400px]">
                                <CardContent className="flex flex-col items-center text-center p-10">
                                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                                        <Fingerprint className="w-12 h-12 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-2">Fingerprint Registration Manager</h3>
                                    <p className="text-muted-foreground max-w-sm mb-4">Add an employee or upload a CSV to register fingerprints. Select an employee from the list to view details.</p>
                                    <p className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                        Employee IDs auto-generated based on agency
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Employee List */}
                {employees.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground">Registered Employees</h2>
                            <Badge variant="secondary" className="text-sm">
                                Total: {employees.length}
                            </Badge>
                        </div>

                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Agency</TableHead>
                                        <TableHead>Fingerprint ID</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.map((emp) => (
                                        <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedEmployee(emp)}>
                                            <TableCell className="font-medium">{emp.empId}</TableCell>
                                            <TableCell>{emp.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{emp.agency}</TableCell>
                                            <TableCell className="font-mono text-sm text-primary">{emp.fingerprintId}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Registered
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedEmployee(emp)
                                                    }}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}

// Export both named and default
export default FingerprintGenerator
