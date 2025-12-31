"use client"

/**
 * Bulk Upload Sheet
 * Side drawer for bulk CSV/Excel employee import
 * Handles file validation, preview, and batch import
 */

import { useState, useRef } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { db } from "@/lib/supabase/db"
import {
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Loader2,
    Info,
    Fingerprint,
    ArrowLeft,
    Users,
    FileWarning,
    Trash2,
} from "lucide-react"
import Papa from "papaparse"

interface BulkUploadSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

interface UploadedEmployee {
    id: string
    empId: string
    name: string
    email: string
    departmentId: string
    departmentName?: string
    agencyId: string
    agencyName?: string
    gender?: string | null
    maritalStatus?: string | null
    address?: string | null
    emergencyContact?: string | null
    education?: string | null
    jobTitle?: string | null
    employmentType?: string | null
    dateJoin?: string | null
    status: "pending" | "imported" | "exists" | "error"
    error?: string
}

type Step = "upload" | "preview" | "importing" | "complete"

// Parse date from DD/MM/YYYY or DD-MM-YYYY format to YYYY-MM-DD format
function parseDateToISO(dateStr: string | null): string | null {
    if (!dateStr) return null

    const trimmed = dateStr.trim()
    if (!trimmed) return null

    // Try DD/MM/YYYY or DD-MM-YYYY format
    const parts = trimmed.split(/[\/\-]/)
    if (parts.length === 3) {
        const [day, month, year] = parts
        if (day && month && year && day.length <= 2 && month.length <= 2 && year.length === 4) {
            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            // Validate it's a valid date
            const parsed = new Date(isoDate)
            if (!isNaN(parsed.getTime())) {
                return isoDate
            }
        }
    }

    // Try ISO format directly
    const isoParsed = new Date(trimmed)
    if (!isNaN(isoParsed.getTime())) {
        return trimmed
    }

    return null
}

export function BulkUploadSheet({ open, onOpenChange, onSuccess }: BulkUploadSheetProps) {
    const [step, setStep] = useState<Step>("upload")
    const [employees, setEmployees] = useState<UploadedEmployee[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [importProgress, setImportProgress] = useState(0)
    const [importResults, setImportResults] = useState<{ success: number; errors: number; skipped: number }>({
        success: 0,
        errors: 0,
        skipped: 0,
    })
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Lookup data
    const [agencies, setAgencies] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])

    const handleReset = () => {
        setStep("upload")
        setEmployees([])
        setImportProgress(0)
        setImportResults({ success: 0, errors: 0, skipped: 0 })
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleClose = () => {
        handleReset()
        onOpenChange(false)
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsProcessing(true)

        try {
            // Load agencies and departments for validation
            const [agenciesData, deptData] = await Promise.all([
                db.agencies.getAll(),
                db.departments.getAll(),
            ])
            setAgencies(agenciesData)
            setDepartments(deptData)

            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results: { data: any[] }) => {
                    const parsedEmployees: UploadedEmployee[] = []

                    for (const row of results.data) {
                        const name = row["Name"] || row["name"] || row["Employee Name"] || row["employee_name"]
                        const email = row["Email"] || row["email"] || row["Email Address"] || row["email_address"] || ""
                        const deptName = row["Department"] || row["department"] || row["Dept"] || row["dept"]
                        const agencyName = row["Agency"] || row["agency"] || row["Organization"] || row["organization"]

                        if (!name) continue

                        // Match department
                        const dept = deptData.find(
                            (d: any) => d.name.toLowerCase() === deptName?.toLowerCase()
                        )

                        // Match agency
                        const agency = agenciesData.find(
                            (a: any) => a.name.toLowerCase() === agencyName?.toLowerCase()
                        )

                        // Check if employee already exists
                        let status: UploadedEmployee["status"] = "pending"
                        let error: string | undefined

                        if (!dept) {
                            status = "error"
                            error = `Department "${deptName}" not found`
                        } else if (!agency) {
                            status = "error"
                            error = `Agency "${agencyName}" not found`
                        }
                        // Note: Email duplicate checking is handled by database constraints during import

                        parsedEmployees.push({
                            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            empId: "",
                            name,
                            email,
                            departmentId: dept?.id || "",
                            departmentName: dept?.name || deptName,
                            agencyId: agency?.id || "",
                            agencyName: agency?.name || agencyName,
                            gender: row["Gender"] || row["gender"] || null,
                            maritalStatus: row["Marital Status"] || row["marital_status"] || null,
                            address: row["Address"] || row["address"] || null,
                            emergencyContact: row["Emergency Contact"] || row["emergency_contact"] || null,
                            education: row["Education"] || row["education"] || null,
                            jobTitle: row["Job Title"] || row["job_title"] || row["Position"] || row["position"] || null,
                            employmentType: row["Employment Type"] || row["employment_type"] || row["Type"] || row["type"] || null,
                            dateJoin: parseDateToISO(row["Date Joined"] || row["date_join"] || row["Join Date"] || row["start_date"]),
                            status,
                            error,
                        })
                    }

                    setEmployees(parsedEmployees)
                    setStep("preview")
                    setIsProcessing(false)
                },
                error: (error) => {
                    toast.error(`Failed to parse file: ${error.message}`)
                    setIsProcessing(false)
                }
            })
        } catch (error) {
            console.error("Error processing file:", error)
            toast.error("Failed to process file")
            setIsProcessing(false)
        }
    }

    const downloadTemplate = () => {
        const headers = [
            "Name",
            "Email",
            "Agency",
            "Department",
            "Job Title",
            "Employment Type",
            "Gender",
            "Marital Status",
            "Address",
            "Emergency Contact",
            "Education",
            "Date Joined"
        ]
        const csvContent = headers.join(",") + "\n"
        const blob = new Blob([csvContent], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "employee_import_template.csv"
        a.click()
        URL.revokeObjectURL(url)
    }

    const removeEmployee = (id: string) => {
        setEmployees(employees.filter(emp => emp.id !== id))
    }

    const handleImport = async () => {
        const validEmployees = employees.filter(emp => emp.status === "pending")

        if (validEmployees.length === 0) {
            toast.error("No valid employees to import")
            return
        }

        setStep("importing")
        setImportProgress(0)

        let success = 0
        let errors = 0
        const skipped = employees.filter(emp => emp.status === "exists").length

        for (let i = 0; i < validEmployees.length; i++) {
            const emp = validEmployees[i]

            try {
                // Generate employee ID
                const agency = agencies.find(a => a.id === emp.agencyId)
                const agencyPrefix = agency?.name.slice(0, 3).toUpperCase() || "EMP"
                const empId = `${agencyPrefix}-${Date.now().toString().slice(-8)}-${i}`

                await db.employees.create({
                    emp_id: empId,
                    name: emp.name,
                    department_id: emp.departmentId,
                    agency_id: emp.agencyId,
                    email: emp.email || null,
                    gender: emp.gender?.toLowerCase() || null,
                    marital_status: emp.maritalStatus?.toLowerCase() || null,
                    address: emp.address || null,
                    emergency_contact: emp.emergencyContact || null,
                    education: emp.education || null,
                    job_title: emp.jobTitle || null,
                    employment_type: emp.employmentType?.toLowerCase() || null,
                    date_join: emp.dateJoin || null,
                    is_active: true,
                })

                success++
            } catch (error: any) {
                console.error(`Error importing ${emp.name}:`, error)
                errors++
            }

            setImportProgress(Math.round(((i + 1) / validEmployees.length) * 100))
        }

        setImportResults({ success, errors, skipped })
        setStep("complete")

        if (success > 0 && onSuccess) {
            onSuccess()
        }
    }

    const pendingCount = employees.filter(e => e.status === "pending").length
    const errorCount = employees.filter(e => e.status === "error").length
    const existsCount = employees.filter(e => e.status === "exists").length

    return (
        <Sheet open={open} onOpenChange={handleClose}>
            <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
                <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-lg">Bulk Upload Employees</SheetTitle>
                            <SheetDescription className="text-sm">
                                {step === "upload" && "Upload a CSV file with employee data"}
                                {step === "preview" && `${employees.length} employees found`}
                                {step === "importing" && "Importing employees..."}
                                {step === "complete" && "Import complete"}
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6">
                    <div className="py-6 space-y-6">
                        {/* Step 1: Upload */}
                        {step === "upload" && (
                            <div className="space-y-6">
                                {/* Drop zone */}
                                <Card
                                    className="border-2 border-dashed p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />

                                    <div className="flex flex-col items-center justify-center text-center gap-4">
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                                                <div>
                                                    <p className="font-medium">Processing file...</p>
                                                    <p className="text-sm text-muted-foreground">Validating employee data</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">Click to upload or drag and drop</p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        CSV or Excel file (max 500 employees)
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </Card>

                                {/* Template download */}
                                <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download CSV Template
                                </Button>

                                {/* Info */}
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                        <p className="font-medium mb-2">Required columns:</p>
                                        <ul className="text-muted-foreground space-y-1">
                                            <li>• <strong>Name</strong> - Employee full name</li>
                                            <li>• <strong>Agency</strong> - Must match existing agency</li>
                                            <li>• <strong>Department</strong> - Must match existing department</li>
                                        </ul>
                                    </AlertDescription>
                                </Alert>

                                <Alert variant="default" className="bg-amber-50 border-amber-200">
                                    <Fingerprint className="h-4 w-4 text-amber-600" />
                                    <AlertDescription className="text-sm text-amber-800">
                                        <strong>Note:</strong> Fingerprints cannot be bulk imported. After import, enroll each employee's biometric individually from the employee directory.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* Step 2: Preview */}
                        {step === "preview" && (
                            <div className="space-y-4">
                                {/* Summary stats */}
                                <div className="grid grid-cols-3 gap-3">
                                    <Card className="p-3 text-center">
                                        <p className="text-2xl font-bold text-green-600">{pendingCount}</p>
                                        <p className="text-xs text-muted-foreground">Ready to import</p>
                                    </Card>
                                    <Card className="p-3 text-center">
                                        <p className="text-2xl font-bold text-amber-600">{existsCount}</p>
                                        <p className="text-xs text-muted-foreground">Already exist</p>
                                    </Card>
                                    <Card className="p-3 text-center">
                                        <p className="text-2xl font-bold text-red-600">{errorCount}</p>
                                        <p className="text-xs text-muted-foreground">Errors</p>
                                    </Card>
                                </div>

                                {/* Employee list */}
                                <Card className="overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="w-10"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {employees.map((emp) => (
                                                <TableRow key={emp.id}>
                                                    <TableCell>
                                                        <div>
                                                            <p className="font-medium">{emp.name}</p>
                                                            <p className="text-xs text-muted-foreground">{emp.email || "No email"}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm">{emp.departmentName}</p>
                                                        <p className="text-xs text-muted-foreground">{emp.agencyName}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        {emp.status === "pending" && (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Ready
                                                            </Badge>
                                                        )}
                                                        {emp.status === "exists" && (
                                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                                Exists
                                                            </Badge>
                                                        )}
                                                        {emp.status === "error" && (
                                                            <div>
                                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                                    <XCircle className="w-3 h-3 mr-1" />
                                                                    Error
                                                                </Badge>
                                                                {emp.error && (
                                                                    <p className="text-xs text-red-600 mt-1">{emp.error}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => removeEmployee(emp.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Card>

                                {employees.length === 0 && (
                                    <Card className="p-8 text-center">
                                        <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-muted-foreground">No employees to import</p>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Step 3: Importing */}
                        {step === "importing" && (
                            <div className="space-y-6 py-8">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                                    <div>
                                        <h3 className="text-lg font-semibold">Importing Employees</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Please wait while employees are being added...
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Progress</span>
                                        <span>{importProgress}%</span>
                                    </div>
                                    <Progress value={importProgress} className="h-2" />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Complete */}
                        {step === "complete" && (
                            <div className="space-y-6 py-8">
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold">Import Complete!</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Employee data has been processed
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <Card className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <span className="text-2xl font-bold text-green-600">{importResults.success}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Imported</p>
                                    </Card>
                                    <Card className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <AlertCircle className="h-5 w-5 text-amber-600" />
                                            <span className="text-2xl font-bold text-amber-600">{importResults.skipped}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Skipped</p>
                                    </Card>
                                    <Card className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            <XCircle className="h-5 w-5 text-red-600" />
                                            <span className="text-2xl font-bold text-red-600">{importResults.errors}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Errors</p>
                                    </Card>
                                </div>

                                <Alert variant="default" className="bg-blue-50 border-blue-200">
                                    <Fingerprint className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-sm text-blue-800">
                                        <strong>Next step:</strong> Enroll fingerprints for imported employees using the "Add Employee" button and selecting individual registration.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer */}
                <SheetFooter className="px-6 py-4 border-t gap-3">
                    {step === "upload" && (
                        <Button variant="outline" className="flex-1" onClick={handleClose}>
                            Cancel
                        </Button>
                    )}

                    {step === "preview" && (
                        <>
                            <Button variant="outline" onClick={handleReset}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleImport}
                                disabled={pendingCount === 0}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Import {pendingCount} Employee{pendingCount !== 1 ? "s" : ""}
                            </Button>
                        </>
                    )}

                    {step === "complete" && (
                        <Button className="flex-1" onClick={handleClose}>
                            Done
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
