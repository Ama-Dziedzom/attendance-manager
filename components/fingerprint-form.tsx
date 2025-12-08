"use client"

import { useState } from "react"
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

interface Agency {
    id: string
    name: string
    code: string
}

interface FingerprintFormProps {
    onSubmit: (data: {
        name: string
        department: string
        email: string
        agency: string
    }) => void
    agencies: Agency[]
    isScanning?: boolean
}

export function FingerprintForm({ onSubmit, agencies, isScanning = false }: FingerprintFormProps) {
    const [formData, setFormData] = useState({
        name: "",
        department: "",
        email: "",
        agency: "",
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        // Validate all fields
        if (!formData.name.trim()) {
            toast.error("Please enter employee name")
            return
        }

        if (!formData.agency) {
            toast.error("Please select an agency")
            return
        }

        onSubmit(formData)

        // Reset form
        setFormData({
            name: "",
            department: "",
            email: "",
            agency: "",
        })
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
                        value={formData.agency}
                        onValueChange={(value) => setFormData({ ...formData, agency: value })}
                        disabled={isScanning}
                    >
                        <SelectTrigger id="agency" className="w-full">
                            <SelectValue placeholder="Select agency..." />
                        </SelectTrigger>
                        <SelectContent>
                            {agencies.map((agency) => (
                                <SelectItem key={agency.id} value={agency.id}>
                                    {agency.name} ({agency.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {formData.agency && (
                    <p className="text-xs text-muted-foreground mt-1">
                        Employee ID will start with: <span className="font-semibold">{agencies.find(a => a.id === formData.agency)?.code}</span>
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor="department">
                    Department
                </Label>
                <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Engineering"
                    className="mt-1"
                    disabled={isScanning}
                />
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
                    <span className="font-semibold text-foreground">Note:</span> Employee ID will be automatically generated based on the selected agency (e.g., HO0001, AC0001).
                </p>
            </div>
        </form>
    )
}
