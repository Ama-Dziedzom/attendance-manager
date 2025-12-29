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

/**
 * Parse date from DD/MM/YYYY or DD-MM-YYYY format to YYYY-MM-DD format
 * @param dateStr - Date string in DD/MM/YYYY or DD-MM-YYYY format
 * @returns Date string in YYYY-MM-DD format or null if invalid
 */
function parseDateToISO(dateStr: string | null): string | null {
    if (!dateStr || dateStr.trim() === "") return null

    const trimmed = dateStr.trim()

    // Try DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY format
    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{2,4})$/)
    if (ddmmyyyyMatch) {
        let [, day, month, year] = ddmmyyyyMatch
        const paddedDay = day.padStart(2, '0')
        const paddedMonth = month.padStart(2, '0')
        if (year.length === 2) year = '20' + year
        return `${year}-${paddedMonth}-${paddedDay}`
    }

    // Try YYYY-MM-DD, YYYY/MM/DD, or YYYY.MM.DD format
    const yyyymmddMatch = trimmed.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})$/)
    if (yyyymmddMatch) {
        const [, year, month, day] = yyyymmddMatch
        const paddedDay = day.padStart(2, '0')
        const paddedMonth = month.padStart(2, '0')
        return `${year}-${paddedMonth}-${paddedDay}`
    }

    console.warn(`Invalid date format: ${dateStr}`)
    return null
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
    status: "pending" | "imported" | "exists"
    biometricRegistered?: boolean
}

interface BulkUploadFlowProps {
    onEmployeeSelect: (employee: {
        id: string
        empId: string
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
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: async (results: { data: any[] }) => {
                    const csvData = results.data as any[]

                    if (csvData.length === 0) {
                        toast.error("CSV file is empty")
                        setIsUploading(false)
                        return
                    }

                    const [departments, agencies] = await Promise.all([
                        db.departments.getAll(),
                        db.agencies.getAll(),
                    ])

                    const allEmployees = await db.employees.getAll()
                    const processedEmployees: UploadedEmployee[] = []
                    const skippedRows: Array<{ row: number, reason: string }> = []

                    for (let i = 0; i < csvData.length; i++) {
                        const row = csvData[i]
                        const name = (row.name || row.Name || "").trim()
                        const email = (row.email || row.Email || "").trim() || null
                        const deptName = (row.department || row.Department || "").trim()
                        const agencyName = (row.agency || row.Agency || "").trim()
                        const gender = (row.gender || row.Gender || "").trim() || null
                        const maritalStatus = (row.marital_status || row["Marital Status"] || "").trim() || null
                        const address = (row.address || row.Address || "").trim() || null
                        const emergencyContact = (row.emergency_contact || row["Emergency Contact"] || "").trim() || null
                        const education = (row.education || row.Education || "").trim() || null
                        const jobTitle = (row.job_title || row["Job Title"] || row.position || "").trim() || null
                        const employmentType = (row.employment_type || row["Employment Type"] || "").trim() || null
                        const dateJoinRaw = (row.date_join || row["Date Join"] || row.hire_date || "").trim() || null
                        const dateJoin = parseDateToISO(dateJoinRaw)

                        if (dateJoinRaw && !dateJoin) {
                            skippedRows.push({ row: i + 2, reason: `Invalid date format: "${dateJoinRaw}". Expected DD/MM/YYYY.` })
                            continue
                        }

                        if (!name) {
                            skippedRows.push({ row: i + 2, reason: "Missing name" })
                            continue
                        }

                        const dept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase())
                        const agency = agencies.find(a => a.name.toLowerCase() === agencyName.toLowerCase())

                        if (!dept || !agency) {
                            skippedRows.push({ row: i + 2, reason: !dept ? `Department "${deptName}" not found` : `Agency "${agencyName}" not found` })
                            continue
                        }

                        const existingEmp = allEmployees.find((e: any) =>
                            (e.name.toLowerCase() === name.toLowerCase() && e.agency_id === agency.id) ||
                            (email && e.email?.toLowerCase() === email.toLowerCase())
                        )

                        if (existingEmp) {
                            // Update if changed
                            const hasChanged = existingEmp.email !== email || existingEmp.department_id !== dept.id ||
                                existingEmp.gender !== gender || existingEmp.marital_status !== maritalStatus ||
                                existingEmp.address !== address || existingEmp.emergency_contact !== emergencyContact ||
                                existingEmp.education !== education || existingEmp.job_title !== jobTitle ||
                                existingEmp.employment_type !== employmentType || existingEmp.date_join !== dateJoin

                            if (hasChanged) {
                                try {
                                    await db.employees.update(existingEmp.id, {
                                        email, department_id: dept.id, gender, marital_status: maritalStatus,
                                        address, emergency_contact: emergencyContact, education,
                                        job_title: jobTitle, employment_type: employmentType, date_join: dateJoin,
                                    })
                                } catch (err: any) {
                                    console.error(`Update failed for ${name}:`, err)
                                }
                            }

                            processedEmployees.push({
                                id: existingEmp.id,
                                empId: existingEmp.emp_id || "",
                                name: existingEmp.name,
                                email: existingEmp.email || email,
                                departmentId: dept.id,
                                departmentName: dept.name,
                                agencyId: agency.id,
                                agencyName: agency.name,
                                gender, maritalStatus, address, emergencyContact, education, jobTitle, employmentType, dateJoin,
                                status: "exists",
                                biometricRegistered: !!(existingEmp.biometric_credential as any[])?.[0],
                            })
                        } else {
                            // Create new employee
                            try {
                                const agencyPrefix = agency.name.slice(0, 3).toUpperCase()
                                const newEmp = await db.employees.create({
                                    emp_id: `${agencyPrefix}-${Date.now()}-${i}`,
                                    name, department_id: dept.id, agency_id: agency.id,
                                    email, gender, marital_status: maritalStatus, address,
                                    emergency_contact: emergencyContact, education, job_title: jobTitle,
                                    employment_type: employmentType, date_join: dateJoin, is_active: true,
                                })

                                processedEmployees.push({
                                    id: newEmp.id,
                                    empId: newEmp.emp_id || "",
                                    name: newEmp.name,
                                    email: newEmp.email || email,
                                    departmentId: dept.id,
                                    departmentName: dept.name,
                                    agencyId: agency.id,
                                    agencyName: agency.name,
                                    gender, maritalStatus, address, emergencyContact, education, jobTitle, employmentType, dateJoin,
                                    status: "imported",
                                    biometricRegistered: false,
                                })
                            } catch (err: any) {
                                console.error(`Create failed for ${name}:`, err)
                                skippedRows.push({ row: i + 2, reason: `Failed to create: ${err.message}` })
                            }
                        }
                    }

                    setEmployees(processedEmployees)
                    setUploadComplete(true)
                    setIsUploading(false)

                    const newCount = processedEmployees.filter(e => e.status === "imported").length
                    const existingCount = processedEmployees.filter(e => e.status === "exists").length

                    if (skippedRows.length > 0) {
                        console.warn(`Skipped ${skippedRows.length} rows:`, skippedRows)
                        toast.warning(`Processed ${processedEmployees.length} employees. ${skippedRows.length} rows skipped.`)
                    } else {
                        toast.success(`Processed ${processedEmployees.length} employees (${newCount} new, ${existingCount} existing)`)
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
        const template = `name,email,department,agency,gender,marital_status,address,emergency_contact,education,job_title,employment_type,date_join
John Doe,john@example.com,Engineering,Main Office,male,single,"123 Main St, City",Jane Doe - 000-111,Bachelors,Software Engineer,full-time,01/01/2023
Jane Smith,jane@example.com,HR,Main Office,female,married,"456 Park Ave, Town",John Smith - 222-333,Masters,HR Manager,full-time,15/02/2023`

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
            empId: emp.empId,
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
                                <strong>CSV Format:</strong> name, email, department, agency (required) + optional fields (gender, marital_status, address, emergency_contact, education, job_title, employment_type, date_join).
                                <br />
                                <strong>Date Format:</strong> Use DD/MM/YYYY or YYYY-MM-DD for date_join (e.g., 22/02/2023 or 2023-02-22)
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
