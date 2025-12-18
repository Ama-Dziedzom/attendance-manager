"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Clock, AlertCircle, CheckCircle, Building, Fingerprint } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { employeeStorage, attendanceStorage } from "@/lib/storage"
import { verifyFingerprint, isPlatformAuthenticatorAvailable } from "@/lib/webauthn-helper"

interface ScanResult {
    employeeId: string
    name: string
    photo?: string
    timestamp: string
    type: "in" | "out"
    agency: string
}

interface DeviceFingerprint {
    id: string
    userAgent: string
    screenResolution: string
    timezone: string
    language: string
}

interface Employee {
    id: string
    name: string
    registeredDevices: DeviceFingerprint[]
    lastScan?: ScanResult
}

// Agency list
const AGENCIES = [
    { id: "ninani-group", name: "Ninani Group" },
    { id: "rezultz", name: "Rezultz" },
    { id: "id", name: "ID" },
    { id: "tpmc", name: "TPMC" },
    { id: "innovaddb", name: "InnovaDDB" },
    { id: "brandalert", name: "BrandAlert" },
    { id: "p2p", name: "P2P" }
]

export function BiometricScanner() {
    const [scanState, setScanState] = useState<"agency-select" | "ready" | "scanning" | "success" | "error">("agency-select")
    const [selectedAgency, setSelectedAgency] = useState<string>("")
    const [currentTime, setCurrentTime] = useState<string>("")
    const [clockInMode, setClockInMode] = useState(true)
    const [scanResult, setScanResult] = useState<ScanResult | null>(null)
    const [errorMessage, setErrorMessage] = useState("")
    const [isMounted, setIsMounted] = useState(false)
    const [isFingerprintAvailable, setIsFingerprintAvailable] = useState(false)

    // Set mounted state to avoid hydration mismatch
    useEffect(() => {
        setIsMounted(true)
        setCurrentTime(new Date().toLocaleTimeString())
    }, [])

    // Update current time every second (only on client)
    useEffect(() => {
        if (!isMounted) return

        const timer = setInterval(() => {
            setCurrentTime(new Date().toLocaleTimeString())
        }, 1000)
        return () => clearInterval(timer)
    }, [isMounted])

    // Check fingerprint availability on mount
    useEffect(() => {
        const checkFingerprint = async () => {
            const available = await isPlatformAuthenticatorAvailable()
            setIsFingerprintAvailable(available)
            if (!available) {
                setErrorMessage("Biometric authentication is not available on this device. Please ensure Windows Hello or a compatible biometric device is configured.")
            }
        }
        checkFingerprint()
    }, [])

    // Handle agency selection
    const handleAgencySelect = (agencyId: string) => {
        setSelectedAgency(agencyId)
        setScanState("ready")
        console.log("🏢 Agency selected:", agencyId)
    }

    // Resume scanning after success/error
    const resumeScanning = useCallback(() => {
        setScanState("ready")
        setScanResult(null)
        setErrorMessage("")
    }, [])

    // Back to agency selection
    const backToAgencySelect = () => {
        setScanState("agency-select")
        setSelectedAgency("")
        setScanResult(null)
        setErrorMessage("")
    }

    // Handle fingerprint verification
    const handleFingerprintScan = async () => {
        setScanState("scanning")
        setErrorMessage("")

        try {
            console.log("👆 Starting fingerprint verification...")
            const result = await verifyFingerprint()
            console.log("✅ Fingerprint verified:", result.credentialId)

            // Find employee by credential ID
            const employee = employeeStorage.getByCredentialId(result.credentialId)

            if (!employee) {
                setScanState("error")
                setErrorMessage("Fingerprint not registered. Please register your fingerprint first.")
                setTimeout(() => resumeScanning(), 3000)
                return
            }

            console.log("👤 Employee found:", employee.name)

            // Process attendance
            const agencyName = AGENCIES.find(a => a.id === selectedAgency)?.name || selectedAgency
            let attendanceRecord

            if (clockInMode) {
                console.log("⏰ Clocking IN with fingerprint at agency:", agencyName)
                attendanceRecord = attendanceStorage.clockIn(
                    employee.empId,
                    employee.name,
                    employee.department,
                    agencyName
                )
            } else {
                console.log("⏰ Clocking OUT with fingerprint from agency:", agencyName)
                attendanceRecord = attendanceStorage.clockOut(employee.empId)

                if (!attendanceRecord) {
                    setScanState("error")
                    setErrorMessage("No clock-in record found for today")
                    setTimeout(() => resumeScanning(), 3000)
                    return
                }
            }

            console.log("✅ Attendance record:", attendanceRecord)

            // Success
            setScanState("success")
            setScanResult({
                employeeId: employee.empId,
                name: employee.name,
                timestamp: new Date().toLocaleTimeString(),
                type: clockInMode ? "in" : "out",
                agency: agencyName
            })

            console.log("🎉 SUCCESS! Clock", clockInMode ? "IN" : "OUT", "for", employee.name, "with fingerprint")

            setTimeout(() => {
                console.log("🔄 Auto-resuming...")
                resumeScanning()
            }, 3000)

        } catch (error: any) {
            console.error("❌ Fingerprint verification error:", error)
            setScanState("error")
            setErrorMessage(error.message || "Fingerprint verification failed. Please try again.")
            setTimeout(() => resumeScanning(), 3000)
        }
    }

    const resetScanner = () => {
        resumeScanning()
    }

    return (
        <div className="w-full h-screen bg-background flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Biometric Attendance</h1>
                    <p className="text-sm opacity-90">{currentTime || "--:--:--"}</p>
                </div>
                <Clock className="w-6 h-6" />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative bg-muted overflow-hidden px-4">

                {/* Agency Selection Screen */}
                {scanState === "agency-select" && (
                    <div className="w-full max-w-md">
                        <Card className="p-8">
                            <div className="text-center mb-8">
                                <Building className="w-16 h-16 mx-auto mb-4 text-primary" />
                                <h2 className="text-3xl font-bold mb-2">Clock In / Out</h2>
                                <p className="text-muted-foreground">Select your work location to continue</p>
                            </div>

                            {/* Clock In/Out Toggle */}
                            <div className="flex gap-2 mb-8">
                                <Button
                                    onClick={() => setClockInMode(true)}
                                    variant={clockInMode ? "default" : "outline"}
                                    className="flex-1 h-12"
                                >
                                    Clock In
                                </Button>
                                <Button
                                    onClick={() => setClockInMode(false)}
                                    variant={!clockInMode ? "default" : "outline"}
                                    className="flex-1 h-12"
                                >
                                    Clock Out
                                </Button>
                            </div>

                            {/* Agency Dropdown */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-2">
                                    Select Agency <span className="text-destructive">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedAgency}
                                        onChange={(e) => setSelectedAgency(e.target.value)}
                                        className="w-full h-14 px-4 pr-10 border-2 border-input rounded-lg bg-background text-foreground appearance-none cursor-pointer hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                                    >
                                        <option value="" disabled>Choose your location...</option>
                                        {AGENCIES.map((agency) => (
                                            <option key={agency.id} value={agency.id}>
                                                {agency.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                                {selectedAgency && (
                                    <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                                        <Building className="w-4 h-4" />
                                        Selected: {AGENCIES.find(a => a.id === selectedAgency)?.name}
                                    </p>
                                )}
                            </div>

                            {/* Continue Button */}
                            <Button
                                onClick={() => {
                                    if (selectedAgency) {
                                        handleAgencySelect(selectedAgency)
                                    }
                                }}
                                size="lg"
                                className="w-full h-14 text-lg"
                                disabled={!selectedAgency || !isFingerprintAvailable}
                            >
                                {isFingerprintAvailable ? "Continue" : "Biometric Authentication Unavailable"}
                            </Button>

                            {!isFingerprintAvailable && (
                                <p className="text-sm text-destructive mt-4 text-center">
                                    Please configure Windows Hello or ensure a biometric device is available.
                                </p>
                            )}
                        </Card>
                    </div>
                )}

                {/* Fingerprint Scanning Screen */}
                {scanState === "ready" && (
                    <>
                        {/* Selected Agency Badge */}
                        <div className="mb-4 px-4 py-2 bg-primary/10 rounded-full flex items-center gap-2">
                            <Building className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">
                                {AGENCIES.find(a => a.id === selectedAgency)?.name || "Unknown Agency"}
                            </span>
                            <button
                                onClick={backToAgencySelect}
                                className="ml-2 text-xs text-muted-foreground hover:text-foreground underline"
                            >
                                Change Agency
                            </button>
                        </div>

                        {/* Fingerprint Scanner Visual */}
                        <div className="w-full max-w-sm flex flex-col items-center gap-6">
                            <div className="relative w-64 h-64">
                                {/* Scanner base */}
                                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200">
                                    {/* Fingerprint icon */}
                                    <Fingerprint className="w-32 h-32 text-green-600" />
                                </div>

                                {/* Idle animation ring */}
                                <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-pulse" />
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-2">Ready to Scan</h2>
                                <p className="text-muted-foreground mb-6">
                                    Click below to authenticate with your fingerprint
                                </p>
                            </div>

                            {/* Mode Toggle */}
                            <div className="flex gap-2 mb-4 w-full">
                                <Button
                                    onClick={() => setClockInMode(true)}
                                    variant={clockInMode ? "default" : "outline"}
                                    className="flex-1"
                                >
                                    Clock In
                                </Button>
                                <Button
                                    onClick={() => setClockInMode(false)}
                                    variant={!clockInMode ? "default" : "outline"}
                                    className="flex-1"
                                >
                                    Clock Out
                                </Button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3 w-full">
                                <Button
                                    onClick={handleFingerprintScan}
                                    size="lg"
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    <Fingerprint className="w-5 h-5 mr-2" />
                                    Scan Fingerprint
                                </Button>

                                <Button
                                    onClick={backToAgencySelect}
                                    variant="outline"
                                    size="lg"
                                    className="w-full"
                                >
                                    Change Agency
                                </Button>
                            </div>

                            {/* Info */}
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md w-full">
                                <p className="text-xs text-blue-800 text-center">
                                    <span className="font-semibold">Note:</span> Make sure you have registered your fingerprint in the employee registration section first.
                                </p>
                            </div>
                        </div>
                    </>
                )}

                {/* Scanning State */}
                {scanState === "scanning" && (
                    <>
                        {/* Selected Agency Badge */}
                        <div className="mb-4 px-4 py-2 bg-primary/10 rounded-full flex items-center gap-2">
                            <Building className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">
                                {AGENCIES.find(a => a.id === selectedAgency)?.name || "Unknown Agency"}
                            </span>
                        </div>

                        {/* Fingerprint Scanner Visual - Scanning */}
                        <div className="w-full max-w-sm flex flex-col items-center gap-6">
                            <div className="relative w-64 h-64">
                                {/* Scanner base */}
                                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200">
                                    {/* Fingerprint icon */}
                                    <Fingerprint className="w-32 h-32 text-green-600" />
                                </div>

                                {/* Active scanning animation ring */}
                                <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping" />
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-2">Scanning...</h2>
                                <p className="text-muted-foreground mb-6">
                                    Follow the Windows Hello prompts to authenticate
                                </p>
                            </div>

                            {/* Loading indicator */}
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    </>
                )}

                {/* Success State */}
                {scanState === "success" && scanResult && (
                    <div className="w-full max-w-sm flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                            <CheckCircle className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-center">Clocked {scanResult.type === "in" ? "In" : "Out"}</h2>
                        <Card className="w-full p-4">
                            <img
                                src={scanResult.photo || "/placeholder.svg"}
                                alt={scanResult.name}
                                className="w-20 h-20 rounded-full mx-auto mb-3"
                            />
                            <p className="text-center font-semibold text-lg">{scanResult.name}</p>
                            <p className="text-center text-sm text-muted-foreground">{scanResult.employeeId}</p>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <Building className="w-4 h-4 text-muted-foreground" />
                                <p className="text-center text-sm text-muted-foreground">{scanResult.agency}</p>
                            </div>
                            <p className="text-center text-xs text-muted-foreground mt-2">{scanResult.timestamp}</p>
                        </Card>
                    </div>
                )}

                {/* Error State */}
                {scanState === "error" && (
                    <div className="w-full max-w-sm flex flex-col items-center gap-4">
                        <div className="w-24 h-24 rounded-full bg-destructive flex items-center justify-center">
                            <AlertCircle className="w-12 h-12 text-destructive-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold text-center text-destructive">Error</h2>
                        <p className="text-center text-sm text-muted-foreground px-4">
                            {errorMessage || "An error occurred. Please try again."}
                        </p>
                        <div className="flex flex-col gap-2 w-full px-4">
                            <Button onClick={resumeScanning} size="lg" className="w-full">
                                <Fingerprint className="w-5 h-5 mr-2" />
                                Try Again
                            </Button>
                            <Button
                                onClick={backToAgencySelect}
                                variant="ghost"
                                size="lg"
                                className="w-full"
                            >
                                Back to Agency Selection
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer - Status Messages */}
            <div className="flex-shrink-0 bg-card border-t border-border px-4 py-4 gap-3 flex">
                {scanState === "agency-select" ? (
                    <div className="w-full text-center py-2">
                        <p className="text-sm text-muted-foreground">Select your agency to continue</p>
                    </div>
                ) : scanState === "scanning" ? (
                    <div className="w-full text-center py-2">
                        <p className="text-sm text-muted-foreground">Verifying fingerprint...</p>
                    </div>
                ) : scanState === "success" ? (
                    <Button onClick={resetScanner} size="lg" variant="outline" className="w-full bg-transparent">
                        Continue Scanning
                    </Button>
                ) : scanState === "error" ? (
                    <div className="w-full text-center py-2">
                        <p className="text-sm text-muted-foreground">Authentication failed</p>
                    </div>
                ) : (
                    <div className="w-full text-center py-2">
                        <p className="text-sm text-muted-foreground">Ready for biometric scan</p>
                    </div>
                )}
            </div>
        </div>
    )
}
