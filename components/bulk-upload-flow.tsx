"use client"

/**
 * Bulk Upload Flow Component
 * Handles CSV upload of employee data and displays selectable list for biometric registration
 */

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { db } from "@/lib/supabase/db"
import { toast } from "sonner"
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Download,
    Fingerprint,
    User
} from "lucide-react"
import Papa from "papaparse"

interface UploadedEmployee {
    id: string
    name: string
    email: string
    departmentId: string
    departmentName?: string
    agencyId: string
    agencyName?: string
    status: "pending" | "imported" | "exists"
    biometricRegistered?: boolean
}

interface BulkUploadFlowProps {
    onEmployeeSelect: (employee: {
        id: string
        name: string
        departmentId: string
        email: string
        agencyId: string
    }) => void
}

export function BulkUploadFlow({ onEmployeeSelect }: BulkUploadFlowProps) {
    const [employees, setEmployees] = useState<UploadedEmployee[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [uploadComplete, setUploadComplete] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.endsWith('.csv')) {
            toast.error("Please upload a CSV file")
            return
        }

        setIsUploading(true)

        try {
            // Parse CSV file
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results: { data: any[] }) => {
                    const csvData = results.data as any[]

                    console.log("CSV Parse Results:", results)
                    console.log("CSV Data Length:", csvData.length)
                    console.log("First Row:", csvData[0])

                    if (csvData.length === 0) {
                        toast.error("CSV file is empty")
                        setIsUploading(false)
                        return
                    }

                    // Fetch reference data
                    const [departments, agencies] = await Promise.all([
                        db.departments.getAll(),
                        db.agencies.getAll(),
                    ])

                    console.log("Available Departments:", departments.map(d => d.name))
                    console.log("Available Agencies:", agencies.map(a => a.name))

                    const processedEmployees: UploadedEmployee[] = []
                    const skippedRows: Array<{ row: number, reason: string, data: any }> = []
                    let rowNumber = 0

                    for (const row of csvData) {
                        rowNumber++

                        // Map CSV columns (flexible mapping)
                        const name = row.name || row.Name || row.employee_name || row["Employee Name"]
                        const email = row.email || row.Email || row.employee_email || ""
                        const deptName = row.department || row.Department || row.dept
                        const agencyName = row.agency || row.Agency || row.agency_name

                        console.log(`Row ${rowNumber}:`, { name, email, deptName, agencyName })

                        if (!name) {
                            skippedRows.push({
                                row: rowNumber,
                                reason: "Missing name",
                                data: row
                            })
                            console.warn(`Row ${rowNumber}: Skipping - no name found`)
                            continue
                        }

                        // Find department and agency by name
                        const dept = departments.find(d =>
                            d.name.toLowerCase() === deptName?.toLowerCase()
                        )
                        const agency = agencies.find(a =>
                            a.name.toLowerCase() === agencyName?.toLowerCase()
                        )

                        if (!dept) {
                            skippedRows.push({
                                row: rowNumber,
                                reason: `Department "${deptName}" not found`,
                                data: row
                            })
                            console.warn(`Row ${rowNumber}: Department "${deptName}" not found`)
                        }

                        if (!agency) {
                            skippedRows.push({
                                row: rowNumber,
                                reason: `Agency "${agencyName}" not found`,
                                data: row
                            })
                            console.warn(`Row ${rowNumber}: Agency "${agencyName}" not found`)
                        }

                        if (!dept || !agency) {
                            continue
                        }

                        // Check if employee already exists
                        const allEmployees = await db.employees.getAll()
                        const existingEmployees = allEmployees.filter((e: any) => e.agency_id === agency.id)
                        const existingEmp = existingEmployees.find((e: { name: string; department_id: any }) =>
                            e.name.toLowerCase() === name.toLowerCase() &&
                            e.department_id === dept.id
                        )

                        if (existingEmp) {
                            // Check if biometric is registered
                            const biometric = await db.biometric.getByEmployeeId(existingEmp.id)
                            const hasBiometric = !!biometric

                            processedEmployees.push({
                                id: existingEmp.id,
                                name: existingEmp.name,
                                email: existingEmp.email || email,
                                departmentId: dept.id,
                                departmentName: dept.name,
                                agencyId: agency.id,
                                agencyName: agency.name,
                                status: "exists",
                                biometricRegistered: hasBiometric,
                            })
                        } else {
                            // Create new employee
                            const agencyPrefix = agency.name.slice(0, 3).toUpperCase()
                            const empId = `${agencyPrefix}-${Date.now().toString().slice(-8)}`

                            const newEmp = await db.employees.create({
                                emp_id: empId,
                                name: name,
                                department_id: dept.id,
                                agency_id: agency.id,
                                email: email || null,
                                is_active: true,
                            })

                            processedEmployees.push({
                                id: newEmp.id,
                                name: newEmp.name,
                                email: newEmp.email || email,
                                departmentId: dept.id,
                                departmentName: dept.name,
                                agencyId: agency.id,
                                agencyName: agency.name,
                                status: "imported",
                                biometricRegistered: false,
                            })
                        }
                    }

                    setEmployees(processedEmployees)
                    setUploadComplete(true)
                    setIsUploading(false)

                    const newCount = processedEmployees.filter(e => e.status === "imported").length
                    const existingCount = processedEmployees.filter(e => e.status === "exists").length

                    console.log("Processing Summary:")
                    console.log(`Total rows in CSV: ${csvData.length}`)
                    console.log(`Successfully processed: ${processedEmployees.length}`)
                    console.log(`Skipped: ${skippedRows.length}`)

                    if (skippedRows.length > 0) {
                        console.log("Skipped rows details:", skippedRows)
                    }

                    if (processedEmployees.length === 0) {
                        toast.error(
                            `No employees could be processed. ${skippedRows.length} rows skipped. Check console for details.`
                        )
                    } else if (skippedRows.length > 0) {
                        toast.warning(
                            `Processed ${processedEmployees.length} employees (${newCount} new, ${existingCount} existing). ${skippedRows.length} rows skipped - check console for details.`
                        )
                    } else {
                        toast.success(
                            `Processed ${processedEmployees.length} employees (${newCount} new, ${existingCount} existing)`
                        )
                    }
                },
                error: (error: any) => {
                    console.error("CSV Parse Error:", error)
                    toast.error("Failed to parse CSV file")
                    setIsUploading(false)
                }
            })
        } catch (error: any) {
            console.error("Upload Error:", error)
            toast.error(error.message || "Failed to upload file")
            setIsUploading(false)
        }
    }

    const downloadTemplate = () => {
        const template = `name,email,department,agency
John Doe,john@example.com,Engineering,Main Office
Jane Smith,jane@example.com,HR,Main Office`

        const blob = new Blob([template], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'employee_template.csv'
        a.click()
        window.URL.revokeObjectURL(url)
    }

    const handleSelectEmployee = (emp: UploadedEmployee) => {
        if (emp.biometricRegistered) {
            toast.info(`${emp.name} already has biometric registered`)
            return
        }

        onEmployeeSelect({
            id: emp.id,
            name: emp.name,
            departmentId: emp.departmentId,
            email: emp.email,
            agencyId: emp.agencyId,
        })
    }

    const handleReset = () => {
        setEmployees([])
        setUploadComplete(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    return (
        <div className="space-y-6">
            {!uploadComplete ? (
                <>
                    {/* Upload Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="csv-upload" className="text-base font-medium">
                                Upload Employee CSV
                            </Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={downloadTemplate}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download Template
                            </Button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <Input
                                    id="csv-upload"
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    className="cursor-pointer"
                                />
                            </div>
                            {isUploading && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <FileSpreadsheet className="h-5 w-5 animate-pulse" />
                                    <span>Processing...</span>
                                </div>
                            )}
                        </div>

                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="space-y-2">
                                    <p className="font-medium">CSV Format Requirements:</p>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        <li>Columns: <code>name</code>, <code>email</code>, <code>department</code>, <code>agency</code></li>
                                        <li>Department and agency names must match existing records</li>
                                        <li>Existing employees will be detected automatically</li>
                                    </ul>
                                </div>
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Upload Area */}
                    <div
                        className="border-2 border-dashed rounded-lg p-12 text-center hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium mb-2">
                            Drop your CSV file here or click to browse
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Supported format: CSV
                        </p>
                    </div>
                </>
            ) : (
                <>
                    {/* Employee List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Uploaded Employees ({employees.length})
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Select an employee to register their biometrics
                                </p>
                            </div>
                            <Button variant="outline" onClick={handleReset}>
                                Upload New File
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {employees.map((emp) => (
                                <Card key={emp.id} className="p-4 hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium">{emp.name}</p>
                                                    {emp.status === "imported" && (
                                                        <Badge variant="default" className="text-xs">
                                                            New
                                                        </Badge>
                                                    )}
                                                    {emp.biometricRegistered && (
                                                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Biometric Registered
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                    <span>{emp.email}</span>
                                                    <span>•</span>
                                                    <span>{emp.departmentName}</span>
                                                    <span>•</span>
                                                    <span>{emp.agencyName}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleSelectEmployee(emp)}
                                            disabled={emp.biometricRegistered}
                                            className="flex items-center gap-2"
                                        >
                                            <Fingerprint className="h-4 w-4" />
                                            {emp.biometricRegistered ? "Registered" : "Register Biometric"}
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
