"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    registerFingerprint,
    isPlatformAuthenticatorAvailable,
    getWindowsHelloInstructions,
    type BiometricCredential
} from "@/lib/webauthn-helper"

interface FingerprintScannerProps {
    onScanComplete: (credential: BiometricCredential) => void
    onError: (error: string) => void
    employeeId: string
    employeeName: string
    employeeEmail: string
}

export function FingerprintScanner({
    onScanComplete,
    onError,
    employeeId,
    employeeName,
    employeeEmail
}: FingerprintScannerProps) {
    const [scanStatus, setScanStatus] = useState<"checking" | "ready" | "scanning" | "complete" | "error">("checking")
    const [errorMessage, setErrorMessage] = useState("")
    const [isWindowsHelloAvailable, setIsWindowsHelloAvailable] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)

    useEffect(() => {
        checkWindowsHello()
    }, [])

    const checkWindowsHello = async () => {
        try {
            const available = await isPlatformAuthenticatorAvailable()
            setIsWindowsHelloAvailable(available)

            if (available) {
                setScanStatus("ready")
            } else {
                setScanStatus("error")
                setErrorMessage("Windows Hello is not set up on this device")
            }
        } catch (error) {
            setScanStatus("error")
            setErrorMessage("Failed to check Windows Hello availability")
        }
    }

    const handleStartScan = async () => {
        setScanStatus("scanning")
        setErrorMessage("")

        try {
            // Register fingerprint using Windows Hello
            const credential = await registerFingerprint(employeeId, employeeName, employeeEmail)

            setScanStatus("complete")

            // Wait a moment to show success animation
            setTimeout(() => {
                onScanComplete(credential)
            }, 1500)
        } catch (error: any) {
            console.error("Fingerprint scan error:", error)
            setScanStatus("error")
            const message = error.message || "Failed to register fingerprint"
            setErrorMessage(message)
            onError(message)
        }
    }

    const handleRetry = () => {
        setErrorMessage("")
        setScanStatus("ready")
    }

    return (
        <Card className="p-8 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <div className="flex flex-col items-center space-y-6">
                {/* Header */}
                <h3 className="text-xl font-semibold text-gray-900">
                    {scanStatus === "checking" && "Checking Windows Hello..."}
                    {scanStatus === "ready" && "Ready to Scan Fingerprint"}
                    {scanStatus === "scanning" && "Place Your Finger on the Sensor"}
                    {scanStatus === "complete" && "Fingerprint Registered!"}
                    {scanStatus === "error" && "Setup Required"}
                </h3>

                <p className="text-sm text-gray-600 text-center max-w-md">
                    {scanStatus === "checking" && "Verifying Windows Hello is available..."}
                    {scanStatus === "ready" && `Registering fingerprint for: ${employeeName}`}
                    {scanStatus === "scanning" && "Follow the prompts from Windows Hello to scan your fingerprint"}
                    {scanStatus === "complete" && "Your fingerprint has been successfully registered"}
                    {scanStatus === "error" && errorMessage}
                </p>

                {/* Fingerprint Scanner Visual */}
                <div className="relative w-48 h-48">
                    {/* Scanner base */}
                    <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-all duration-300 ${scanStatus === "complete" ? "bg-gradient-to-br from-green-400 to-green-500" :
                            scanStatus === "error" ? "bg-gradient-to-br from-red-100 to-red-200" :
                                scanStatus === "scanning" ? "bg-gradient-to-br from-blue-100 to-blue-200" :
                                    "bg-gradient-to-br from-green-100 to-green-200"
                        }`}>
                        {/* Fingerprint icon */}
                        <svg
                            className={`w-32 h-32 transition-all duration-300 ${scanStatus === "complete" ? "text-white" :
                                    scanStatus === "error" ? "text-red-500" :
                                        scanStatus === "scanning" ? "text-blue-500" :
                                            "text-green-500"
                                }`}
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm3 8V7c0-1.654-1.346-3-3-3S9 5.346 9 7v3h6z" />
                        </svg>
                    </div>

                    {/* Scanning animation ring */}
                    {scanStatus === "scanning" && (
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500 animate-ping" />
                    )}

                    {/* Success checkmark */}
                    {scanStatus === "complete" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center animate-bounce">
                                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>
                    )}

                    {/* Error icon */}
                    {scanStatus === "error" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {scanStatus === "ready" && (
                        <Button
                            onClick={handleStartScan}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C9.243 2 7 4.243 7 7v3H6c-1.103 0-2 .897-2 2v8c0 1.103.897 2 2 2h12c1.103 0 2-.897 2-2v-8c0-1.103-.897-2-2-2h-1V7c0-2.757-2.243-5-5-5zm3 8V7c0-1.654-1.346-3-3-3S9 5.346 9 7v3h6z" />
                            </svg>
                            Start Fingerprint Scan
                        </Button>
                    )}

                    {scanStatus === "error" && !isWindowsHelloAvailable && (
                        <>
                            <Button
                                onClick={() => setShowInstructions(!showInstructions)}
                                variant="outline"
                                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {showInstructions ? "Hide" : "Show"} Setup Instructions
                            </Button>

                            {showInstructions && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                                    <p className="font-semibold text-blue-900 mb-2">Windows Hello Setup:</p>
                                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                        {getWindowsHelloInstructions().map((instruction, index) => (
                                            <li key={index}>{instruction}</li>
                                        ))}
                                    </ol>
                                </div>
                            )}

                            <Button
                                onClick={checkWindowsHello}
                                variant="outline"
                                className="w-full border-green-300 text-green-700 hover:bg-green-50"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Check Again
                            </Button>
                        </>
                    )}

                    {scanStatus === "error" && isWindowsHelloAvailable && (
                        <Button
                            onClick={handleRetry}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Try Again
                        </Button>
                    )}

                    {scanStatus === "scanning" && (
                        <div className="flex items-center justify-center gap-2 text-blue-600">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="font-semibold">Waiting for Windows Hello...</span>
                        </div>
                    )}
                </div>

                {/* Info boxes */}
                {scanStatus === "ready" && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md w-full max-w-md">
                        <p className="text-xs text-blue-800">
                            <span className="font-semibold">Tip:</span> Register multiple fingers in Windows Hello for better reliability. You can add more fingers in Windows Settings after this registration.
                        </p>
                    </div>
                )}

                {scanStatus === "complete" && (
                    <div className="flex items-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Fingerprint successfully registered!</span>
                    </div>
                )}

                {/* Compliance Notice */}
                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md w-full max-w-md">
                    <p className="text-xs text-gray-600 text-center">
                        <span className="font-semibold">Privacy Notice:</span> Your biometric data is stored securely on this device using Windows Hello and never leaves your computer. Only cryptographic credentials are stored in our system.
                    </p>
                </div>
            </div>
        </Card>
    )
}
