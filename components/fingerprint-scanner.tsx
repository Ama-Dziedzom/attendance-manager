"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Fingerprint, CheckCircle2, XCircle, RefreshCw, Info, Loader2, ShieldAlert } from "lucide-react"
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
        <Card className="p-8 border-border bg-card shadow-sm">
            <div className="flex flex-col items-center space-y-6">
                {/* Header */}
                <h3 className="text-xl font-semibold text-foreground text-center">
                    {scanStatus === "checking" && "Checking Windows Hello..."}
                    {scanStatus === "ready" && "Ready to Scan Fingerprint"}
                    {scanStatus === "scanning" && "Place Your Finger on the Sensor"}
                    {scanStatus === "complete" && "Fingerprint Registered!"}
                    {scanStatus === "error" && "Setup Required"}
                </h3>

                <p className="text-sm text-muted-foreground text-center max-w-md">
                    {scanStatus === "checking" && "Verifying Windows Hello is available..."}
                    {scanStatus === "ready" && `Registering fingerprint for: ${employeeName}`}
                    {scanStatus === "scanning" && "Follow the prompts from Windows Hello to scan your fingerprint"}
                    {scanStatus === "complete" && "Your fingerprint has been successfully registered"}
                    {scanStatus === "error" && errorMessage}
                </p>

                {/* Fingerprint Scanner Visual */}
                <div className="relative w-48 h-48">
                    {/* Scanner base */}
                    <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-all duration-300 ${scanStatus === "complete" ? "bg-green-100 dark:bg-green-900/20" :
                        scanStatus === "error" ? "bg-destructive/10" :
                            scanStatus === "scanning" ? "bg-primary/10" :
                                "bg-muted"
                        }`}>
                        {/* Fingerprint icon */}
                        <Fingerprint
                            className={`w-32 h-32 transition-all duration-300 ${scanStatus === "complete" ? "text-green-600 dark:text-green-400" :
                                scanStatus === "error" ? "text-destructive" :
                                    scanStatus === "scanning" ? "text-primary animate-pulse" :
                                        "text-muted-foreground"
                                }`}
                        />
                    </div>

                    {/* Scanning animation ring */}
                    {scanStatus === "scanning" && (
                        <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
                    )}

                    {/* Success checkmark */}
                    {scanStatus === "complete" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-lg animate-bounce duration-300">
                                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    )}

                    {/* Error icon */}
                    {scanStatus === "error" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-lg">
                                <XCircle className="w-10 h-10 text-destructive" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 w-full max-w-xs">
                    {scanStatus === "ready" && (
                        <Button
                            onClick={handleStartScan}
                            className="w-full"
                            size="lg"
                        >
                            <Fingerprint className="w-5 h-5 mr-2" />
                            Start Fingerprint Scan
                        </Button>
                    )}

                    {scanStatus === "error" && !isWindowsHelloAvailable && (
                        <>
                            <Button
                                onClick={() => setShowInstructions(!showInstructions)}
                                variant="outline"
                                className="w-full"
                            >
                                <Info className="w-5 h-5 mr-2" />
                                {showInstructions ? "Hide" : "Show"} Setup Instructions
                            </Button>

                            {showInstructions && (
                                <Alert className="text-left">
                                    <AlertDescription>
                                        <p className="font-semibold mb-2">Windows Hello Setup:</p>
                                        <ol className="text-sm list-decimal list-inside space-y-1">
                                            {getWindowsHelloInstructions().map((instruction, index) => (
                                                <li key={index}>{instruction}</li>
                                            ))}
                                        </ol>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                onClick={checkWindowsHello}
                                variant="secondary"
                                className="w-full"
                            >
                                <RefreshCw className="w-5 h-5 mr-2" />
                                Check Again
                            </Button>
                        </>
                    )}

                    {scanStatus === "error" && isWindowsHelloAvailable && (
                        <Button
                            onClick={handleRetry}
                            className="w-full"
                        >
                            <RefreshCw className="w-5 h-5 mr-2" />
                            Try Again
                        </Button>
                    )}

                    {scanStatus === "scanning" && (
                        <div className="flex items-center justify-center gap-2 text-primary">
                            <Loader2 className="animate-spin w-5 h-5" />
                            <span className="font-semibold">Waiting for Windows Hello...</span>
                        </div>
                    )}
                </div>

                {/* Info boxes */}
                {scanStatus === "ready" && (
                    <Alert className="bg-primary/5 border-primary/10">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-muted-foreground ml-2">
                            <span className="font-semibold text-primary">Tip:</span> Register multiple fingers in Windows Hello for better reliability.
                        </AlertDescription>
                    </Alert>
                )}

                {scanStatus === "complete" && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold">Fingerprint successfully registered!</span>
                    </div>
                )}

                {/* Compliance Notice */}
                <div className="mt-4 p-3 bg-muted/50 border rounded-md w-full max-w-md">
                    <p className="text-xs text-muted-foreground text-center">
                        <span className="font-semibold">Privacy Notice:</span> Your biometric data is stored securely on this device using Windows Hello and never leaves your computer. Only cryptographic credentials are stored in our system.
                    </p>
                </div>
            </div>
        </Card>
    )
}
