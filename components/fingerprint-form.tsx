"use client"

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
    }) => void
    isScanning?: boolean
}

export function FingerprintForm({ onSubmit, isScanning = false }: FingerprintFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        departmentId: "",
        email: "",
        agencyId: "",
    })

    const [agencies, setAgencies] = useState<any[]>([])
    const [departments, setDepartments] = useState<any[]>([])
    const [isLoadingData, setIsLoadingData] = useState(true)

    // Load agencies and departments from Supabase
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoadingData(true)
                const [agenciesData, deptData] = await Promise.all([
                    db.agencies.getAll(),
                    db.departments.getAll(),
                ])

                setAgencies(agenciesData)
                setDepartments(deptData)
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
