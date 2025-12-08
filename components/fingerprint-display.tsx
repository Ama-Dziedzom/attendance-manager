"use client"

import { Card } from "@/components/ui/card"
import type { BiometricCredential } from "@/lib/storage"

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
        <Card className="p-8 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <div className="flex flex-col items-center space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm3 8V7c0-1.654-1.346-3-3-3S9 5.346 9 7v3h6z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Fingerprint Registered</h2>
                </div>

                {/* Fingerprint Visual */}
                <div className="w-48 h-48 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-lg">
                    <svg className="w-32 h-32 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm3 8V7c0-1.654-1.346-3-3-3S9 5.346 9 7v3h6z" />
                    </svg>
                </div>

                {/* Employee Details */}
                <div className="w-full max-w-md space-y-3 bg-white p-6 rounded-lg border border-green-200">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Employee ID</p>
                            <p className="font-semibold text-gray-900">{employee.empId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Fingerprint ID</p>
                            <p className="font-semibold text-green-600">{employee.fingerprintId}</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-sm text-gray-500">Name</p>
                        <p className="font-semibold text-gray-900">{employee.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Agency</p>
                            <p className="font-semibold text-gray-900">{employee.agency}</p>
                        </div>
                        {employee.department && (
                            <div>
                                <p className="text-sm text-gray-500">Department</p>
                                <p className="font-semibold text-gray-900">{employee.department}</p>
                            </div>
                        )}
                    </div>

                    {employee.email && (
                        <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-semibold text-gray-900">{employee.email}</p>
                        </div>
                    )}

                    {employee.biometricCredential && (
                        <div className="pt-3 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Biometric Credential</p>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-gray-500">Credential ID</p>
                                    <p className="text-xs font-mono text-gray-900 break-all">
                                        {employee.biometricCredential.credentialId.substring(0, 40)}...
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Device Type</p>
                                        <p className="text-xs font-semibold text-gray-900 capitalize">
                                            {employee.biometricCredential.deviceType}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Registered</p>
                                        <p className="text-xs font-semibold text-gray-900">
                                            {formatDate(employee.biometricCredential.registeredAt)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-sm text-gray-500">Registered On</p>
                        <p className="font-semibold text-gray-900">{formatDate(employee.timestamp)}</p>
                    </div>
                </div>

                {/* Success Badge */}
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-300 rounded-full">
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-semibold text-green-700">Fingerprint Successfully Registered</span>
                </div>

                {/* Privacy Notice */}
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md w-full max-w-md">
                    <p className="text-xs text-gray-600 text-center">
                        <span className="font-semibold">Privacy:</span> Biometric data is stored securely on your device using Windows Hello. Only cryptographic credentials are stored in our system.
                    </p>
                </div>
            </div>
        </Card>
    )
}
