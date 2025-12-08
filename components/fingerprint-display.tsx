"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { BiometricCredential } from "@/lib/storage"
import { Fingerprint, CheckCircle2, User, Building, Mail, Calendar, ShieldCheck } from "lucide-react"

interface Employee {
    id: string
    empId: string
    name: string
    department: string
    email: string
    agency: string
    timestamp: string
    fingerprintId?: string
    fingerprintRegistered?: boolean
    biometricCredential?: BiometricCredential
}

interface FingerprintDisplayProps {
    employee: Employee
}

export function FingerprintDisplay({ employee }: FingerprintDisplayProps) {
    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString()
    }

    return (
        <Card className="p-8 border-border bg-card shadow-sm">
            <div className="flex flex-col items-center space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Fingerprint className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">Fingerprint Registered</h2>
                </div>

                {/* Fingerprint Visual */}
                <div className="w-48 h-48 bg-muted rounded-full flex items-center justify-center shadow-inner">
                    <Fingerprint className="w-32 h-32 text-primary/80" />
                </div>

                {/* Employee Details */}
                <div className="w-full max-w-md space-y-4 bg-muted/40 p-6 rounded-lg border">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Employee ID</p>
                            <p className="font-semibold text-foreground">{employee.empId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Fingerprint ID</p>
                            <p className="font-semibold text-primary font-mono text-sm">{employee.fingerprintId}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                            <p className="text-sm text-muted-foreground">Name</p>
                            <p className="font-semibold text-foreground">{employee.name}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-start gap-2">
                            <Building className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <p className="text-sm text-muted-foreground">Agency</p>
                                <p className="font-semibold text-foreground">{employee.agency}</p>
                            </div>
                        </div>
                        {employee.department && (
                            <div>
                                <p className="text-sm text-muted-foreground">Department</p>
                                <p className="font-semibold text-foreground">{employee.department}</p>
                            </div>
                        )}
                    </div>

                    {employee.email && (
                        <div className="flex items-start gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground mt-1" />
                            <div>
                                <p className="text-sm text-muted-foreground">Email</p>
                                <p className="font-semibold text-foreground">{employee.email}</p>
                            </div>
                        </div>
                    )}

                    {employee.biometricCredential && (
                        <div className="pt-3 border-t">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                <p className="text-sm font-semibold text-foreground">Biometric Credential</p>
                            </div>
                            <div className="space-y-2 pl-6">
                                <div>
                                    <p className="text-xs text-muted-foreground">Credential ID</p>
                                    <p className="text-[10px] font-mono text-foreground break-all">
                                        {employee.biometricCredential.credentialId.substring(0, 40)}...
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Device Type</p>
                                        <p className="text-xs font-semibold text-foreground capitalize">
                                            {employee.biometricCredential.deviceType}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Registered</p>
                                        <p className="text-xs font-semibold text-foreground">
                                            {formatDate(employee.biometricCredential.registeredAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground mt-1" />
                        <div>
                            <p className="text-sm text-muted-foreground">Registered On</p>
                            <p className="font-semibold text-foreground">{formatDate(employee.timestamp)}</p>
                        </div>
                    </div>
                </div>

                {/* Success Badge */}
                <Badge variant="outline" className="px-4 py-2 bg-green-50 text-green-700 border-green-200 gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Fingerprint Successfully Registered
                </Badge>

                {/* Privacy Notice */}
                <div className="text-center max-w-sm">
                    <p className="text-xs text-muted-foreground">
                        <span className="font-semibold">Privacy:</span> Biometric data is stored securely on your device using Windows Hello. Only cryptographic credentials are stored in our system.
                    </p>
                </div>
            </div>
        </Card>
    )
}
