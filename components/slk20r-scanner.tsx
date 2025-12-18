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

/**
 * ZKTeco SLK20R Fingerprint Scanner Component
 * Handles biometric enrollment for new employees
 * Captures fingerprint using WebAuthn platform authenticator
 */

interface SLK20RScannerProps {
    onScanComplete: (credential: BiometricCredential) => void
    onError: (error: string) => void
    employeeId: string
    employeeName: string
    employeeEmail: string
}

export function SLK20RScanner({
    onScanComplete,
    onError,
    employeeId,
    employeeName,
    employeeEmail
}: SLK20RScannerProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [scanSuccess, setScanSuccess] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const [isSupported, setIsSupported] = useState(false)
    const [isChecking, setIsChecking] = useState(true)
    const [instructions, setInstructions] = useState<string[]>([])

    useEffect(() => {
        checkWindowsHello()
    }, [])

    const checkWindowsHello = async () => {
        setIsChecking(true)
        try {
            const available = await isPlatformAuthenticatorAvailable()
            setIsSupported(available)

            if (!available) {
                const setup = getWindowsHelloInstructions()
                setInstructions(setup)
            }
        } catch (error) {
            setIsSupported(false)
        } finally {
            setIsChecking(false)
        }
    }

    const handleStartScan = async () => {
        setIsScanning(true)
        setScanError(null)

        try {
            const credential = await registerFingerprint(employeeId, employeeName, employeeEmail)
            setScanSuccess(true)
            setTimeout(() => {
                onScanComplete(credential)
            }, 1500)
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Failed to scan fingerprint"
            setScanError(errorMsg)
            onError(errorMsg)
            setIsScanning(false)
        }
    }

    const handleRetry = () => {
        setScanError(null)
        setScanSuccess(false)
    }

    if (isChecking) {
        return (
            <Card className="p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Checking SLK20R connection...</p>
                </div>
            </Card>
        )
    }

    if (!isSupported) {
        return (
            <Card className="p-8 space-y-4">
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription>
                        <div className="space-y-2">
                            <p className="font-semibold">SLK20R Reader Not Detected</p>
                            <p className="text-sm">Ensure the ZKTeco Eco SLK20R is properly connected and configured:</p>
                        </div>
                    </AlertDescription>
                </Alert>

                <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">Setup Instructions:</p>
                    {instructions.map((instruction, index) => (
                        <p key={index}>{index + 1}. {instruction}</p>
                    ))}
                </div>

                <Button onClick={checkWindowsHello} variant="outline" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Connection Test
                </Button>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* Scanner Interface */}
            <Card className="p-8">
                <div className="flex flex-col items-center justify-center space-y-4">
                    {!isScanning && !scanSuccess && !scanError && (
                        <>
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                                <Fingerprint className="w-12 h-12 text-primary" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">Ready to Enroll</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Click below and place finger on SLK20R sensor
                                </p>
                            </div>
                        </>
                    )}

                    {isScanning && !scanSuccess && (
                        <>
                            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                                <Fingerprint className="w-12 h-12 text-primary" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold">Scanning...</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Hold finger steady on reader
                                </p>
                            </div>
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </>
                    )}

                    {scanSuccess && (
                        <>
                            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-12 h-12 text-green-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-green-600">Enrollment Successful!</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Fingerprint captured and stored
                                </p>
                            </div>
                        </>
                    )}

                    {scanError && (
                        <>
                            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center">
                                <XCircle className="w-12 h-12 text-red-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-red-600">Enrollment Failed</h3>
                                <p className="text-sm text-muted-foreground mt-1">{scanError}</p>
                            </div>
                        </>
                    )}
                </div>
            </Card>

            {/* Action Buttons */}
            {!isScanning && !scanSuccess && (
                <Button
                    onClick={handleStartScan}
                    className="w-full"
                    size="lg"
                    disabled={!!scanError}
                >
                    <Fingerprint className="w-4 h-4 mr-2" />
                    Start Enrollment
                </Button>
            )}

            {scanError && (
                <Button
                    onClick={handleRetry}
                    variant="outline"
                    className="w-full"
                    size="lg"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                </Button>
            )}

            {/* Info Card */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    <p className="text-sm">
                        <strong>ZKTeco SLK20R:</strong> Ensure the device is connected via USB and the driver is installed. The reader will capture and store the fingerprint template.
                    </p>
                </AlertDescription>
            </Alert>
        </div>
    )
}
