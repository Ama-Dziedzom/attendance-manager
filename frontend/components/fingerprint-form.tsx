"use client"

/**
 * Employee Information Form
 * Used during enrollment to collect basic employee details
 * Part of the SLK20R enrollment workflow
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Info } from "lucide-react"
import { db } from "@/lib/supabase/db"

interface FingerprintFormProps {
    onSubmit: (data: {
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
    }) => void
    isScanning?: boolean
}

export function FingerprintForm({ onSubmit, isScanning = false }: FingerprintFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        departmentId: "",
        email: "",
        agencyId: "",
        gender: "",
        maritalStatus: "",
        address: "",
        emergencyContact: "",
        education: "",
        jobTitle: "",
        employmentType: "",
        dateJoin: "",
    })

    const [agencies, setAgencies] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [genders, setGenders] = useState<any[]>([])
    const [maritalStatuses, setMaritalStatuses] = useState<any[]>([])
    const [employmentTypes, setEmploymentTypes] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)

    // Load agencies, departments and lookups from Supabase
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoadingData(true)
                const [
                    agenciesData,
                    deptData,
                    gendersData,
                    maritalData,
                    employmentData
                ] = await Promise.all([
                    db.agencies.getAll(),
                    db.departments.getAll(),
                    db.lookups.getGenders(),
                    db.lookups.getMaritalStatuses(),
                    db.lookups.getEmploymentTypes(),
                ])

                setAgencies(agenciesData)
                setDepartments(deptData)
                setGenders(gendersData)
                setMaritalStatuses(maritalData)
                setEmploymentTypes(employmentData)
            } catch (error) {
                console.error("Error loading data:", error)
                toast.error("Failed to load form data")
            } finally {
                setIsLoadingData(false)
            }
        }

        loadData()
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Validate all fields
        if (!formData.name.trim()) {
            toast.error("Please enter employee name")
            return
        }

        if (!formData.agencyId) {
            toast.error("Please select an agency")
            return
        }

        if (!formData.departmentId) {
            toast.error("Please select a department")
            return
        }

        onSubmit(formData)

        // Reset form
        setFormData({
            name: "",
            departmentId: "",
            email: "",
            agencyId: "",
            gender: "",
            maritalStatus: "",
            address: "",
            emergencyContact: "",
            education: "",
            jobTitle: "",
            employmentType: "",
            dateJoin: "",
        })
    }

    if (isLoadingData) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">
                    Employee Name <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="mt-1"
                    disabled={isScanning}
                />
            </div>

            {/* Agency Dropdown */}
            <div>
                <Label htmlFor="agency">
                    Agency <span className="text-destructive">*</span>
                </Label>
                <div className="mt-1">
                    <Select
                        value={formData.agencyId}
                        onValueChange={(value) => setFormData({ ...formData, agencyId: value })}
                        disabled={isScanning}
                    >
                        <SelectTrigger id="agency" className="w-full">
                            <SelectValue placeholder="Select agency..." />
                        </SelectTrigger>
                        <SelectContent>
                            {agencies.map((agency) => (
                                <SelectItem key={agency.id} value={agency.id}>
                                    {agency.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {formData.agencyId && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Selected: <span className="font-semibold">{agencies.find(a => a.id === formData.agencyId)?.name}</span>
                    </p>
                )}
            </div>

            {/* Department Dropdown */}
            <div>
                <Label htmlFor="department">
                    Department <span className="text-destructive">*</span>
                </Label>
                <div className="mt-1">
                    <Select
                        value={formData.departmentId}
                        onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
                        disabled={isScanning}
                    >
                        <SelectTrigger id="department" className="w-full">
                            <SelectValue placeholder="Select department..." />
                        </SelectTrigger>
                        <SelectContent>
                            {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                    {dept.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label htmlFor="email">
                    Email
                </Label>
                <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john.doe@company.com"
                    className="mt-1"
                    disabled={isScanning}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                        value={formData.gender}
                        onValueChange={(value) => setFormData({ ...formData, gender: value })}
                        disabled={isScanning}
                    >
                        <SelectTrigger id="gender" className="mt-1">
                            <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                            {genders.map((g) => (
                                <SelectItem key={g.id} value={g.name.toLowerCase()}>
                                    {g.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label htmlFor="marital_status">Marital Status</Label>
                    <Select
                        value={formData.maritalStatus}
                        onValueChange={(value) => setFormData({ ...formData, maritalStatus: value })}
                        disabled={isScanning}
                    >
                        <SelectTrigger id="marital_status" className="mt-1">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            {maritalStatuses.map((ms) => (
                                <SelectItem key={ms.id} value={ms.name.toLowerCase()}>
                                    {ms.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label htmlFor="address">Address</Label>
                <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main St, City"
                    className="mt-1"
                    disabled={isScanning}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="emergency_contact">Emergency Contact</Label>
                    <Input
                        id="emergency_contact"
                        value={formData.emergencyContact}
                        onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                        placeholder="Name - Phone"
                        className="mt-1"
                        disabled={isScanning}
                    />
                </div>

                <div>
                    <Label htmlFor="education">Education</Label>
                    <Input
                        id="education"
                        value={formData.education}
                        onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                        placeholder="Degree/Qualification"
                        className="mt-1"
                        disabled={isScanning}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                        id="job_title"
                        value={formData.jobTitle}
                        onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                        placeholder="Software Engineer"
                        className="mt-1"
                        disabled={isScanning}
                    />
                </div>

                <div>
                    <Label htmlFor="employment_type">Employment Type</Label>
                    <Select
                        value={formData.employmentType}
                        onValueChange={(value) => setFormData({ ...formData, employmentType: value })}
                        disabled={isScanning}
                    >
                        <SelectTrigger id="employment_type" className="mt-1">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            {employmentTypes.map((et) => (
                                <SelectItem key={et.id} value={et.name.toLowerCase()}>
                                    {et.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div>
                <Label htmlFor="date_join">Date Joined</Label>
                <Input
                    id="date_join"
                    type="date"
                    value={formData.dateJoin}
                    onChange={(e) => setFormData({ ...formData, dateJoin: e.target.value })}
                    className="mt-1"
                    disabled={isScanning}
                />
            </div>

            <Button
                type="submit"
                className="w-full"
                disabled={isScanning}
            >
                {isScanning ? "Scanning..." : "Register Fingerprint"}
            </Button>

            {/* Info box about auto-generated IDs */}
            <div className="p-3 bg-muted border rounded-md flex gap-2 items-start">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Note:</span> Employee ID will be automatically generated based on the selected agency.
                </p>
            </div>
        </form>
    )
}
