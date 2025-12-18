"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { FingerprintForm } from "./fingerprint-form"
import { FingerprintDisplay } from "./fingerprint-display"
import { FingerprintScanner } from "./fingerprint-scanner"
import { db } from "@/lib/supabase/db"
import { mapDbEmployeeToEmployee, type Employee } from "@/lib/types"

// BiometricCredential type for Windows Hello
interface BiometricCredential {
    credentialId: string
    publicKey: string
    counter: number
    deviceType: string
    registeredAt: string
}

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Upload, Fingerprint, Eye, AlertCircle, CheckCircle2, UserPlus, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

export function FingerprintGenerator() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [pendingEmployee, setPendingEmployee] = useState<any>(null)
    const [successMessage, setSuccessMessage] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load employees from Supabase on mount
    useEffect(() => {
        loadEmployees()
    }, [])

    const loadEmployees = async () => {
        try {
            setIsLoading(true)
            const data = await db.employees.getAll()
            const mapped = data.map(mapDbEmployeeToEmployee)
            setEmployees(mapped)
        } catch (error) {
            console.error("Error loading employees:", error)
            toast.error("Failed to load employees")
        } finally {
            setIsLoading(false)
        }
    }

    // Generate unique fingerprint ID
    const generateFingerprintId = (empId: string): string => {
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 8).toUpperCase()
        return `FP-${empId}-${random}-${timestamp.toString(36).toUpperCase()}`
    }

    const handleAddEmployee = async (formData: {
        name: string
        departmentId: string
        email: string
        agencyId: string
    }) => {
        try {
            // Generate unique employee ID
            const agency = await db.agencies.getAll().then(agencies =>
                agencies.find(a => a.id === formData.agencyId)
            )

            const agencyCode = agency?.name.substring(0, 3).toUpperCase() || 'EMP'
            const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
            const generatedEmpId = `${agencyCode}-${random}`

            const timestamp = new Date().toISOString()
            const fingerprintId = generateFingerprintId(generatedEmpId)

            // Create employee in database first
            const newEmployee = await db.employees.create({
                emp_id: generatedEmpId,
                name: formData.name,
                email: formData.email || null,
                department_id: formData.departmentId,
                agency_id: formData.agencyId,
                employee_type: 'full_time',
                hire_date: new Date().toISOString().split('T')[0],
                is_active: true,
            })

            // Start scanning animation with employee data
            setPendingEmployee({
                ...newEmployee,
                fingerprintId,
            })
            setIsScanning(true)

        } catch (error: any) {
            console.error("Error creating employee:", error)
            setErrorMessage(error.message || "Failed to create employee")
            toast.error("Failed to create employee")
            setTimeout(() => setErrorMessage(""), 5000)
        }
    }

    const handleScanComplete = async (credential: BiometricCredential) => {
        if (!pendingEmployee) return

        try {
            // Save biometric credential to Supabase
            await db.biometric.register({
                employee_id: pendingEmployee.id,
                credential_id: credential.credentialId,
                fingerprint_id: pendingEmployee.fingerprintId,
                public_key: credential.publicKey,
                counter: credential.counter,
                device_type: credential.deviceType,
                is_active: true,
            })

            setSuccessMessage(
                `Fingerprint registered successfully for ${pendingEmployee.name} (ID: ${pendingEmployee.emp_id})`
            )
            toast.success("Fingerprint registered successfully!")
            setTimeout(() => setSuccessMessage(""), 5000)

            // Reload employees to get updated biometric status
            await loadEmployees()

            setIsScanning(false)
            setPendingEmployee(null)

        } catch (error: any) {
            console.error("Error saving biometric credential:", error)
            setErrorMessage(error.message || "Failed to save biometric credential")
            toast.error("Failed to save fingerprint")
            setTimeout(() => setErrorMessage(""), 5000)

            setIsScanning(false)
            setPendingEmployee(null)
        }
    }

    const handleScanError = (error: string) => {
        setErrorMessage(error)
        toast.error(error)
        setTimeout(() => setErrorMessage(""), 5000)
        setIsScanning(false)
        setPendingEmployee(null)
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading employees...</p>
                </div>
            </div>
        )
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
                                    isScanning={isScanning}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Display Section */}
                    <div className="lg:col-span-2">
                        {isScanning && pendingEmployee ? (
                            <FingerprintScanner
                                employeeId={pendingEmployee.emp_id}
                                employeeName={pendingEmployee.name}
                                employeeEmail={pendingEmployee.email || ''}
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
                                    <p className="text-muted-foreground max-w-sm mb-4">Add an employee to register their fingerprint. Select an employee from the list to view details.</p>
                                    <p className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                        All data saved to cloud database
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
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-sm">
                                    Total: {employees.length}
                                </Badge>
                                <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-300">
                                    With Biometric: {employees.filter(e => e.biometricRegistered).length}
                                </Badge>
                            </div>
                        </div>

                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Agency</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.map((emp) => (
                                        <TableRow
                                            key={emp.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setSelectedEmployee(emp)}
                                        >
                                            <TableCell className="font-medium">{emp.empId}</TableCell>
                                            <TableCell>{emp.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{emp.agency || '—'}</TableCell>
                                            <TableCell className="text-muted-foreground">{emp.department || '—'}</TableCell>
                                            <TableCell>
                                                {emp.biometricRegistered ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Registered
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-300 gap-1">
                                                        <AlertCircle className="w-3 h-3" />
                                                        Pending
                                                    </Badge>
                                                )}
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

                {/* Empty State */}
                {employees.length === 0 && !isLoading && (
                    <Card className="p-12">
                        <div className="text-center">
                            <Fingerprint className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">No Employees Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Register your first employee using the form above.
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}

// Export both named and default
export default FingerprintGenerator
