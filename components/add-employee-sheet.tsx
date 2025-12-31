"use client"

/**
 * Add Employee Sheet
 * Side drawer for single employee registration with fingerprint enrollment
 * Multi-step wizard: 1. Basic Info → 2. Fingerprint → 3. Success
 * Reuses FingerprintForm and SLK20RScanner components
 */

import { useState } from "react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { db } from "@/lib/supabase/db"
import { cn, STATUS_COLORS } from "@/lib/utils"
import {
    UserPlus,
    ArrowLeft,
    CheckCircle2,
    Loader2,
    User,
    Building,
    Fingerprint,
} from "lucide-react"

// Reuse existing components
import { FingerprintForm } from "@/components/fingerprint-form"
import { SLK20RScanner } from "@/components/slk20r-scanner"
import type { BiometricCredential } from "@/lib/webauthn-helper"
import type { Employee } from "@/lib/types"

interface AddEmployeeSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (employee: Employee) => void
}

type Step = 1 | 2 | 3

interface EmployeeFormData {
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
}

export function AddEmployeeSheet({ open, onOpenChange, onSuccess }: AddEmployeeSheetProps) {
    const [step, setStep] = useState<Step>(1)
    const [formData, setFormData] = useState<EmployeeFormData | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null)

    // Lookup data for display
    const [agencies, setAgencies] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])

    const handleReset = () => {
        setStep(1)
        setFormData(null)
        setCreatedEmployee(null)
        setIsSubmitting(false)
    }

    const handleClose = () => {
        handleReset()
        onOpenChange(false)
    }

    // Handle form submission from FingerprintForm (Step 1 complete)
    const handleFormSubmit = async (data: EmployeeFormData) => {
        // Load agencies and departments for later display
        try {
            const [agenciesData, deptsData] = await Promise.all([
                db.agencies.getAll(),
                db.departments.getAll(),
            ])
            setAgencies(agenciesData)
            setDepartments(deptsData)
        } catch (error) {
            console.error("Error loading lookup data:", error)
        }

        setFormData(data)
        setStep(2)
    }

    // Handle fingerprint scan completion (Step 2 complete)
    const handleScanComplete = async (credential: BiometricCredential) => {
        if (!formData) {
            toast.error("Employee data missing")
            return
        }

        setIsSubmitting(true)

        try {
            // Create employee - emp_id is now generated automatically by the DB trigger
            const newEmployee = await db.employees.create({
                name: formData.name,
                department_id: formData.departmentId,
                agency_id: formData.agencyId,
                email: formData.email || null,
                gender: formData.gender || null,
                marital_status: formData.maritalStatus || null,
                address: formData.address || null,
                emergency_contact: formData.emergencyContact || null,
                education: formData.education || null,
                job_title: formData.jobTitle || null,
                employment_type: formData.employmentType || null,
                date_join: formData.dateJoin || null,
                is_active: true,
            })

            const empId = newEmployee.emp_id || "PENDING";

            // Register biometric credential
            await db.biometric.register({
                employee_id: newEmployee.id,
                credential_id: credential.credentialId,
                fingerprint_id: `FP-${empId}-${credential.credentialId.slice(0, 8)}`,
                public_key: credential.publicKey,
                counter: credential.counter,
                device_type: credential.deviceType || "windows-hello",
                is_active: true,
            })

            // Get agency name (re-fetching from agencies loaded in handleFormSubmit)
            const agency = agencies.find(a => a.id === formData.agencyId)
            // Get department name for display
            const dept = departments.find(d => d.id === formData.departmentId)

            const employeeForDisplay: Employee = {
                id: newEmployee.id,
                empId: empId,
                name: newEmployee.name,
                email: newEmployee.email || null,
                department: dept?.name || null,
                departmentId: formData.departmentId,
                agency: agency?.name || null,
                agencyId: formData.agencyId,
                jobTitle: formData.jobTitle || null,
                location: null,
                employeeType: formData.employmentType || null,
                gender: formData.gender || null,
                maritalStatus: formData.maritalStatus || null,
                address: formData.address || null,
                emergencyContact: formData.emergencyContact || null,
                education: formData.education || null,
                dateJoin: formData.dateJoin || null,
                isActive: true,
                createdAt: newEmployee.created_at || new Date().toISOString(),
                biometricRegistered: true,
                fingerprintId: credential.credentialId,
                biometricDeviceType: credential.deviceType || "windows-hello",
                biometricRegisteredAt: new Date().toISOString(),
            }

            setCreatedEmployee(employeeForDisplay)
            setStep(3)
            toast.success(`Employee ${formData.name} registered successfully!`)

            if (onSuccess) {
                onSuccess(employeeForDisplay)
            }
        } catch (error: any) {
            console.error("Error creating employee:", error)
            toast.error(error?.message || "Failed to create employee")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleScanError = (error: string) => {
        toast.error(error)
    }

    const progressValue = step === 1 ? 33 : step === 2 ? 66 : 100

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-lg">Add New Employee</SheetTitle>
                            <SheetDescription className="text-sm">
                                {step === 1 && "Enter employee information"}
                                {step === 2 && "Enroll fingerprint biometric"}
                                {step === 3 && "Registration complete"}
                            </SheetDescription>
                        </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span className={step >= 1 ? "text-primary font-medium" : ""}>1. Details</span>
                            <span className={step >= 2 ? "text-primary font-medium" : ""}>2. Fingerprint</span>
                            <span className={step >= 3 ? "text-primary font-medium" : ""}>3. Complete</span>
                        </div>
                        <Progress value={progressValue} className="h-1.5" />
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6">
                    <div className="py-6">
                        {/* Step 1: Employee Form - Reuses FingerprintForm component */}
                        {step === 1 && (
                            <FingerprintForm onSubmit={handleFormSubmit} isScanning={false} />
                        )}

                        {/* Step 2: Fingerprint Scanner - Reuses SLK20RScanner component */}
                        {step === 2 && formData && (
                            <div className="space-y-4">
                                {/* Employee summary card */}
                                <Card className="p-4 bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <User className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium">{formData.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formData.email || "No email provided"}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                {isSubmitting ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-sm text-muted-foreground">Creating employee...</p>
                                    </div>
                                ) : (
                                    <SLK20RScanner
                                        onScanComplete={handleScanComplete}
                                        onError={handleScanError}
                                        employeeId={formData.agencyId}
                                        employeeName={formData.name}
                                        employeeEmail={formData.email || ""}
                                    />
                                )}
                            </div>
                        )}

                        {/* Step 3: Success State */}
                        {step === 3 && createdEmployee && (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center text-center py-4">
                                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold">Employee Registered!</h3>
                                    <p className="text-muted-foreground mt-1">
                                        {createdEmployee.name} has been added successfully
                                    </p>
                                </div>

                                <Card className="p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Employee ID</p>
                                            <p className="font-medium">{createdEmployee.empId}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Department</p>
                                            <p className="font-medium">{createdEmployee.department}</p>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-muted-foreground">Agency</p>
                                                <p className="font-medium">{createdEmployee.agency}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <Fingerprint className="w-4 h-4 text-primary mt-0.5" />
                                            <div>
                                                <p className="text-muted-foreground">Biometric</p>
                                                <Badge variant="outline" className={cn("gap-1.5 px-2.5 py-0.5 font-bold shadow-xs transition-colors", STATUS_COLORS.success)}>
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Registered
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={handleReset}>
                                        Add Another
                                    </Button>
                                    <Button className="flex-1" onClick={handleClose}>
                                        Done
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer - only show back button on step 2 */}
                {step === 2 && !isSubmitting && (
                    <SheetFooter className="px-6 py-4 border-t">
                        <Button variant="outline" onClick={() => setStep(1)}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Details
                        </Button>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    )
}
