"use client"

/**
 * Employee Enrollment Flow
 * Orchestrates the complete employee registration process with two modes:
 * 1. Bulk Upload - Import CSV of employees, then select for biometric registration
 * 2. Individual Registration - Register one employee at a time
 */

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FingerprintForm } from "./fingerprint-form"
import { SLK20RScanner } from "./slk20r-scanner"
import { FingerprintDisplay } from "./fingerprint-display"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/supabase/db"
import { toast } from "sonner"
import type { BiometricCredential } from "@/lib/webauthn-helper"
import type { Employee } from "@/lib/types"
import { Upload, UserPlus, Users } from "lucide-react"
import { BulkUploadFlow } from "@/components/bulk-upload-flow"

type EnrollmentMode = "bulk" | "individual"
type Step = "select" | "scan" | "display"

export function EnrollmentFlow() {
    const [mode, setMode] = useState<EnrollmentMode>("bulk")
    const [step, setStep] = useState<Step>("select")

    // Individual registration state
    const [employeeData, setEmployeeData] = useState<{
        name: string
        departmentId: string
        email: string
        agencyId: string
        gender?: string
        maritalStatus?: string
        address?: string
        emergencyContact?: string
        education?: string
        jobTitle?: string
        employmentType?: string
        dateJoin?: string
    } | null>(null)

    // Bulk upload state
    const [selectedEmployee, setSelectedEmployee] = useState<{
        id: string
        name: string
        departmentId: string
        email: string
        agencyId: string
        gender?: string | null
        maritalStatus?: string | null
        address?: string | null
        emergencyContact?: string | null
        education?: string | null
        jobTitle?: string | null
        employmentType?: string | null
        dateJoin?: string | null
    } | null>(null)

    const [registeredEmployee, setRegisteredEmployee] = useState<Employee | null>(null)
    const [isScanning, setIsScanning] = useState(false)

    // Handle individual form submission
    const handleFormSubmit = (data: {
        name: string
        departmentId: string
        email: string
        agencyId: string
        gender?: string
        maritalStatus?: string
        address?: string
        emergencyContact?: string
        education?: string
        jobTitle?: string
        employmentType?: string
        dateJoin?: string
    }) => {
        setEmployeeData(data)
        setIsScanning(true)
        setStep("scan")
    }

    // Handle employee selection from bulk upload
    const handleEmployeeSelect = (employee: {
        id: string
        name: string
        departmentId: string
        email: string
        agencyId: string
        gender?: string | null
        maritalStatus?: string | null
        address?: string | null
        emergencyContact?: string | null
        education?: string | null
        jobTitle?: string | null
        employmentType?: string | null
        dateJoin?: string | null
    }) => {
        setSelectedEmployee(employee)
        setIsScanning(true)
        setStep("scan")
    }

    const handleScanComplete = async (cred: BiometricCredential) => {
        setIsScanning(false)

        // Get employee data from either individual form or bulk selection
        const empData = mode === "individual" ? employeeData : selectedEmployee

        if (!empData) {
            toast.error("Employee data missing")
            return
        }

        try {
            let newEmployee: any
            let empId: string

            // For bulk upload, employee already exists in DB
            if (mode === "bulk" && selectedEmployee) {
                const existingEmployee = await db.employees.getById(selectedEmployee.id)
                if (!existingEmployee) {
                    toast.error("Employee not found in database")
                    return
                }
                newEmployee = existingEmployee
                empId = existingEmployee.emp_id || selectedEmployee.id
            } else {
                // Individual registration - create new employee
                const agencies = await db.agencies.getAll()
                const agency = agencies.find(a => a.id === empData.agencyId)
                const agencyPrefix = agency?.name.slice(0, 3).toUpperCase() || "EMP"
                empId = `${agencyPrefix}-${Date.now().toString().slice(-8)}`

                newEmployee = await db.employees.create({
                    emp_id: empId,
                    name: empData.name,
                    department_id: empData.departmentId,
                    agency_id: empData.agencyId,
                    email: empData.email || null,
                    gender: empData.gender || null,
                    marital_status: empData.maritalStatus || null,
                    address: empData.address || null,
                    emergency_contact: empData.emergencyContact || null,
                    education: empData.education || null,
                    job_title: empData.jobTitle || null,
                    employment_type: empData.employmentType || null,
                    date_join: empData.dateJoin || null,
                    is_active: true,
                })
            }

            // Register biometric credential
            await db.biometric.register({
                employee_id: newEmployee.id,
                credential_id: cred.credentialId,
                fingerprint_id: `FP-${newEmployee.emp_id}-${cred.credentialId.slice(0, 8)}`,
                public_key: cred.publicKey,
                counter: cred.counter,
                device_type: cred.deviceType || "windows-hello",
                is_active: true,
            })

            // Get department and agency for display
            const departments = await db.departments.getAll()
            const agencies = await db.agencies.getAll()
            const deptData = departments.find(d => d.id === empData.departmentId)
            const agency = agencies.find(a => a.id === empData.agencyId)

            // Map to Employee type for display
            const employeeForDisplay: Employee = {
                id: newEmployee.id,
                empId: newEmployee.emp_id || empId,
                name: newEmployee.name,
                email: newEmployee.email || null,
                department: deptData?.name || null,
                departmentId: empData.departmentId,
                agency: agency?.name || null,
                agencyId: empData.agencyId,
                jobTitle: null,
                location: null,
                employeeType: null,
                hireDate: null,
                isActive: true,
                createdAt: newEmployee.created_at || new Date().toISOString(),
                biometricRegistered: true,
                fingerprintId: cred.credentialId,
                biometricDeviceType: cred.deviceType || "windows-hello",
                biometricRegisteredAt: new Date().toISOString(),
            }

            setRegisteredEmployee(employeeForDisplay)
            toast.success(`Biometric registered for ${empData.name}`)
            setStep("display")
        } catch (error: any) {
            console.error("Error saving employee:")
            console.error("  Message:", error?.message)
            console.error("  Code:", error?.code)
            console.error("  Details:", error?.details)
            console.error("  Hint:", error?.hint)
            console.error("  Full error:", JSON.stringify(error, null, 2))

            const errorMessage = error?.message || "Failed to save employee data"
            toast.error(errorMessage)
        }
    }

    const handleScanError = (error: string) => {
        toast.error(error)
        setIsScanning(false)
    }

    const handleReset = () => {
        setStep("select")
        setEmployeeData(null)
        setSelectedEmployee(null)
        setRegisteredEmployee(null)
        setIsScanning(false)
    }

    const handleModeChange = (newMode: string) => {
        setMode(newMode as EnrollmentMode)
        handleReset()
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Employee Biometric Enrollment</h1>
                    <p className="text-muted-foreground mt-2">
                        Register employee biometrics using ZKTeco Eco SLK20R Fingerprint Reader
                    </p>
                </div>

                <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="bulk" className="flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Bulk Upload
                        </TabsTrigger>
                        <TabsTrigger value="individual" className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4" />
                            Individual Registration
                        </TabsTrigger>
                    </TabsList>

                    {/* Bulk Upload Tab */}
                    <TabsContent value="bulk" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Users className="h-5 w-5" />
                                    {step === "select" && "Bulk Employee Upload"}
                                    {step === "scan" && "Fingerprint Enrollment"}
                                    {step === "display" && "Enrollment Complete"}
                                </CardTitle>
                                <CardDescription>
                                    {step === "select" && "Upload CSV file with employee details, then select employees to register biometrics"}
                                    {step === "scan" && "Place finger on SLK20R reader"}
                                    {step === "display" && "Employee successfully enrolled in system"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {step === "select" && (
                                    <BulkUploadFlow onEmployeeSelect={handleEmployeeSelect} />
                                )}

                                {step === "scan" && selectedEmployee && (
                                    <SLK20RScanner
                                        onScanComplete={handleScanComplete}
                                        onError={handleScanError}
                                        employeeId={selectedEmployee.id}
                                        employeeName={selectedEmployee.name}
                                        employeeEmail={selectedEmployee.email}
                                    />
                                )}

                                {step === "display" && registeredEmployee && (
                                    <div className="space-y-4">
                                        <FingerprintDisplay employee={registeredEmployee} />
                                        <Button onClick={handleReset} className="w-full">
                                            Register Another Employee
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Individual Registration Tab */}
                    <TabsContent value="individual" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {step === "select" && "Employee Information"}
                                    {step === "scan" && "Fingerprint Enrollment"}
                                    {step === "display" && "Enrollment Complete"}
                                </CardTitle>
                                <CardDescription>
                                    {step === "select" && "Enter employee details to begin enrollment"}
                                    {step === "scan" && "Place finger on SLK20R reader"}
                                    {step === "display" && "Employee successfully enrolled in system"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {step === "select" && (
                                    <FingerprintForm
                                        onSubmit={handleFormSubmit}
                                        isScanning={isScanning}
                                    />
                                )}

                                {step === "scan" && employeeData && (
                                    <SLK20RScanner
                                        onScanComplete={handleScanComplete}
                                        onError={handleScanError}
                                        employeeId={employeeData.agencyId}
                                        employeeName={employeeData.name}
                                        employeeEmail={employeeData.email}
                                    />
                                )}

                                {step === "display" && registeredEmployee && (
                                    <div className="space-y-4">
                                        <FingerprintDisplay employee={registeredEmployee} />
                                        <Button onClick={handleReset} className="w-full">
                                            Enroll Another Employee
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

