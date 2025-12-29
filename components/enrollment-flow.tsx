"use client"

/**
 * Employee Enrollment Flow
 * Orchestrates the complete employee registration process:
 * 1. Collect employee information
 * 2. Capture fingerprint with SLK20R
 * 3. Display success confirmation
 */

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FingerprintForm } from "./fingerprint-form"
import { SLK20RScanner } from "./slk20r-scanner"
import { FingerprintDisplay } from "./fingerprint-display"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/supabase/db"
import { toast } from "sonner"
import type { BiometricCredential } from "@/lib/webauthn-helper"
import type { Employee } from "@/lib/types"

export function EnrollmentFlow() {
    const [step, setStep] = useState<"form" | "scan" | "display">("form")
    const [employeeData, setEmployeeData] = useState<{
        name: string
        departmentId: string
        email: string
        agencyId: string
    } | null>(null)

    const [registeredEmployee, setRegisteredEmployee] = useState<Employee | null>(null)
    const [isScanning, setIsScanning] = useState(false)

    const handleFormSubmit = (data: {
        name: string
        departmentId: string
        email: string
        agencyId: string
    }) => {
        setEmployeeData(data)
        setIsScanning(true)
        setStep("scan")
    }

    const handleScanComplete = async (cred: BiometricCredential) => {
        setIsScanning(false)

        if (!employeeData) {
            toast.error("Employee data missing")
            return
        }

        try {
            // Get agency for emp_id generation
            const agencies = await db.agencies.getAll()
            const agency = agencies.find(a => a.id === employeeData.agencyId)
            const agencyPrefix = agency?.name.slice(0, 3).toUpperCase() || "EMP"

            // Generate emp_id (format: AGY-TIMESTAMP)
            const empId = `${agencyPrefix}-${Date.now().toString().slice(-8)}`

            // Create employee first
            const newEmployee = await db.employees.create({
                emp_id: empId,
                name: employeeData.name,
                department_id: employeeData.departmentId,
                agency_id: employeeData.agencyId,
                email: employeeData.email || null,
                is_active: true,
            })

            // Register biometric credential separately
            await db.biometric.register({
                employee_id: newEmployee.id,
                credential_id: cred.credentialId,
                public_key: cred.publicKey,
                counter: cred.counter,
                device_type: cred.deviceType || "windows-hello",
                is_active: true,
            })

            // Get department for display
            const departments = await db.departments.getAll()
            const deptData = departments.find(d => d.id === employeeData.departmentId)

            // Map to Employee type for display
            const employeeForDisplay: Employee = {
                id: newEmployee.id,
                empId: newEmployee.emp_id || empId,
                name: newEmployee.name,
                email: newEmployee.email || null,
                department: deptData?.name || null,
                departmentId: employeeData.departmentId,
                agency: agency?.name || null,
                agencyId: employeeData.agencyId,
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
            toast.success("Fingerprint enrolled successfully")
            setStep("display")
        } catch (error: any) {
            // Log detailed error information for debugging
            console.error("Error saving employee:")
            console.error("  Message:", error?.message)
            console.error("  Code:", error?.code)
            console.error("  Details:", error?.details)
            console.error("  Hint:", error?.hint)
            console.error("  Full error:", JSON.stringify(error, null, 2))

            // Show user-friendly error message
            const errorMessage = error?.message || "Failed to save employee data"
            toast.error(errorMessage)
        }
    }

    const handleScanError = (error: string) => {
        toast.error(error)
        setIsScanning(false)
    }

    const handleReset = () => {
        setStep("form")
        setEmployeeData(null)
        setRegisteredEmployee(null)
        setIsScanning(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted p-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">ZKTeco SLK20R Enrollment</h1>
                    <p className="text-muted-foreground mt-2">
                        Register employee biometrics using ZKTeco Eco SLK20R Fingerprint Reader
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>
                            {step === "form" && "Employee Information"}
                            {step === "scan" && "Fingerprint Enrollment"}
                            {step === "display" && "Enrollment Complete"}
                        </CardTitle>
                        <CardDescription>
                            {step === "form" && "Enter employee details to begin enrollment"}
                            {step === "scan" && "Place finger on SLK20R reader"}
                            {step === "display" && "Employee successfully enrolled in system"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === "form" && (
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
            </div>
        </div>
    )
}

