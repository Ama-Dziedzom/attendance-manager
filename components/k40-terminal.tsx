"use client"

import { useState, useEffect } from "react"
import { Clock, AlertCircle, CheckCircle, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { db } from "@/lib/supabase/db"
import { verifyFingerprint, isPlatformAuthenticatorAvailable } from "@/lib/webauthn-helper"
import { toast } from "sonner"

/**
 * ZKTeco K40 Terminal Component
 * Handles employee clock in/out via fingerprint scanning
 * Uses WebAuthn for biometric verification
 */

interface ScanResult {
    employeeId: string
    name: string
    timestamp: string
    type: "in" | "out"
    agency: string
    department: string
}

export function K40Terminal() {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [scanResult, setScanResult] = useState<ScanResult | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSupported, setIsSupported] = useState(false)

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    useEffect(() => {
        checkFingerprint()
    }, [])

    const checkFingerprint = async () => {
        const supported = await isPlatformAuthenticatorAvailable()
        setIsSupported(supported)
        if (!supported) {
            setError("K40 Terminal not detected. Please ensure device is connected.")
        }
    }

    const handleFingerprintScan = async () => {
        setIsScanning(true)
        setError(null)
        setScanResult(null)

        try {
            const credential = await verifyFingerprint()

            // Get biometric credential to find employee
            const bioCred = await db.biometric.getByCredentialId(credential.credentialId)

            if (!bioCred) {
                throw new Error("Fingerprint not recognized. Please enroll first.")
            }

            // Get full employee data
            const employee = await db.employees.getById(bioCred.employee_id)

            if (!employee || !employee.is_active) {
                throw new Error("Employee account not found or inactive.")
            }

            // Get today's status to determine if clocking in or out
            const status = await db.attendance.getStatusToday(employee.emp_id)
            const attendanceType: "in" | "out" = status?.clocked_in ? "out" : "in"

            // Use RPC functions for clock in/out
            if (attendanceType === "in") {
                await db.attendance.clockIn(employee.emp_id, "fingerprint")
            } else {
                await db.attendance.clockOut(employee.emp_id)
            }

            setScanResult({
                employeeId: employee.emp_id,
                name: employee.name,
                timestamp: new Date().toLocaleTimeString(),
                type: attendanceType,
                agency: employee.agency?.name || "N/A",
                department: employee.department?.name || "N/A"
            })

            toast.success(`Clock ${attendanceType === "in" ? "In" : "Out"} recorded successfully`)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Fingerprint verification failed"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsScanning(false)
        }
    }

    const resetScanner = () => {
        setScanResult(null)
        setError(null)
    }

    if (!isSupported) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8 flex items-center justify-center">
                <Card className="max-w-md p-8 bg-white">
                    <div className="text-center space-y-4">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                        <h2 className="text-xl font-bold text-gray-900">K40 Terminal Not Detected</h2>
                        <p className="text-gray-600">
                            Please ensure the ZKTeco K40 Terminal is connected and configured properly.
                        </p>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2">
                        <Clock className="w-10 h-10 text-white" />
                        <h1 className="text-6xl font-bold text-white">
                            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </h1>
                    </div>
                    <p className="text-2xl text-slate-300">
                        {currentTime.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="text-lg text-slate-400">ZKTeco K40 Terminal</p>
                </div>

                {!scanResult && !error && (
                    <Card className="p-12 bg-white">
                        <div className="text-center space-y-6">
                            <div className="flex justify-center">
                                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${isScanning ? "bg-blue-100 animate-pulse" : "bg-slate-100"}`}>
                                    <Fingerprint className={`w-16 h-16 ${isScanning ? "text-blue-600" : "text-slate-400"}`} />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {isScanning ? "Scanning Fingerprint..." : "Place Finger on K40 Sensor"}
                            </h2>
                            <p className="text-gray-600">
                                {isScanning ? "Please hold still" : "Press the button to scan your fingerprint"}
                            </p>
                            <Button
                                onClick={handleFingerprintScan}
                                disabled={isScanning}
                                size="lg"
                                className="w-full max-w-sm"
                            >
                                <Fingerprint className="w-5 h-5 mr-2" />
                                {isScanning ? "Scanning..." : "Scan Fingerprint"}
                            </Button>
                        </div>
                    </Card>
                )}

                {scanResult && (
                    <Card className="p-12 bg-white">
                        <div className="text-center space-y-6">
                            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">{scanResult.name}</h2>
                                <p className="text-xl text-gray-600 mt-2">{scanResult.agency} • {scanResult.department}</p>
                                <p className="text-sm text-gray-500 mt-1">ID: {scanResult.employeeId}</p>
                            </div>
                            <div className={`inline-block px-8 py-4 rounded-lg ${scanResult.type === "in" ? "bg-green-100" : "bg-blue-100"}`}>
                                <p className={`text-2xl font-bold ${scanResult.type === "in" ? "text-green-700" : "text-blue-700"}`}>
                                    CLOCKED {scanResult.type.toUpperCase()}
                                </p>
                                <p className="text-gray-600 mt-1">at {scanResult.timestamp}</p>
                            </div>
                            <Button onClick={resetScanner} variant="outline" className="w-full max-w-sm">
                                Next Employee
                            </Button>
                        </div>
                    </Card>
                )}

                {error && (
                    <Card className="p-12 bg-white">
                        <div className="text-center space-y-6">
                            <AlertCircle className="w-20 h-20 text-red-500 mx-auto" />
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Scan Failed</h2>
                                <p className="text-gray-600 mt-2">{error}</p>
                            </div>
                            <Button onClick={resetScanner} variant="outline" className="w-full max-w-sm">
                                Try Again
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    )
}
