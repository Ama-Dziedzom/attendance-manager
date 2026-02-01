"use client"

import { useState, useEffect } from "react"
import { io } from "socket.io-client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Fingerprint, CheckCircle2, XCircle, RefreshCw, Info, Loader2, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * ZKTeco SLK20R Fingerprint Scanner Component
 * Handles biometric enrollment for new employees via Direct USB Hardware
 */

interface SLK20RScannerProps {
    onScanComplete: (data: { template: string; quality: number }) => void
    onError: (error: string) => void
    employeeId: string
    employeeName: string
}

const MIDDLEWARE_URL = process.env.NEXT_PUBLIC_MIDDLEWARE_URL || "http://localhost:3001"

export function SLK20RScanner({
    onScanComplete,
    onError,
    employeeId,
    employeeName
}: SLK20RScannerProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [scanSuccess, setScanSuccess] = useState(false)
    const [scanError, setScanError] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [isChecking, setIsChecking] = useState(true)
    const [statusText, setStatusText] = useState<string>("Initializing...")

    useEffect(() => {
        checkScannerConnection()

        // Setup Socket.IO for real-time progress updates
        const socket = io(MIDDLEWARE_URL)

        socket.on('connect', () => {
            console.log('[Scanner UI] Connected to middleware WebSocket')
        })

        socket.on('scanner:progress', (data: { status: string }) => {
            console.log('[Scanner UI] Progress:', data.status)
            setStatusText(data.status)
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    const checkScannerConnection = async () => {
        setIsChecking(true)
        try {
            const response = await fetch(`${MIDDLEWARE_URL}/health`)
            if (response.ok) {
                setIsConnected(true)
                setScanError(null)
            } else {
                setIsConnected(false)
            }
        } catch (error) {
            console.error('Middleware connection error:', error)
            setIsConnected(false)
        } finally {
            setIsChecking(false)
        }
    }

    const handleStartScan = async () => {
        setIsScanning(true)
        setScanError(null)
        setStatusText("Ready to capture. Place finger on sensor...")

        try {
            // 1. Trigger the physical scanner to capture
            const response = await fetch(`${MIDDLEWARE_URL}/api/scanner/capture`, {
                method: 'POST'
            })

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || "Capture failed")
            }

            // 2. Enrollment Success - Send template to parent
            setScanSuccess(true)
            setStatusText("Capture successful!")

            // Allow user to see the success state before closing
            setTimeout(() => {
                onScanComplete({
                    template: result.template,
                    quality: result.quality || 100
                })
            }, 2000)

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
            <Card className="p-8 border-dashed">
                <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                    <p className="text-sm text-muted-foreground font-medium">Connecting to SLK20R Service...</p>
                </div>
            </Card>
        )
    }

    if (!isConnected) {
        return (
            <Card className="p-8 space-y-4 border-red-100 bg-red-50/10">
                <Alert variant="destructive" className="border-none bg-transparent p-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full">
                            <ShieldAlert className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <p className="font-bold text-red-900">Scanner Service Offline</p>
                            <p className="text-sm text-red-700">The SLK20R bridge is not responding.</p>
                        </div>
                    </div>
                </Alert>

                <div className="space-y-3 pt-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Troubleshooting:</div>
                    <ul className="space-y-2 text-sm text-gray-600 list-disc pl-4">
                        <li>Ensure the <strong>ZKTeco Middleware</strong> is running on this PC.</li>
                        <li>Check if the SLK20R is plugged into a USB port.</li>
                        <li>Verify that the <strong>ZKTECO_PORT</strong> is correct in .env.</li>
                    </ul>
                </div>

                <Button onClick={checkScannerConnection} variant="outline" className="w-full mt-4 hover:bg-white">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Connection Test
                </Button>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card className="p-10 border-2 border-dashed bg-gray-50/30 overflow-hidden relative">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Fingerprint className="w-32 h-32" />
                </div>

                <div className="flex flex-col items-center justify-center space-y-6 relative z-10">
                    {!isScanning && !scanSuccess && !scanError && (
                        <>
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center rotate-3 border-2 border-primary/20 shadow-lg">
                                <Fingerprint className="w-10 h-10 text-primary -rotate-3" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-gray-900">Scanner Ready</h3>
                                <p className="text-sm text-muted-foreground mt-2 max-w-[250px]">
                                    Place <strong>{employeeName}</strong>'s finger on the sensor and click start.
                                </p>
                            </div>
                        </>
                    )}

                    {isScanning && !scanSuccess && (
                        <>
                            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse border-2 border-primary/30 shadow-xl">
                                <Fingerprint className="w-10 h-10 text-primary" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold animate-pulse text-primary">{statusText.includes('/') ? `Capture ${statusText.match(/\d\/\d/)?.[0]}` : 'Processing...'}</h3>
                                <p className="text-sm font-medium text-muted-foreground mt-2">
                                    {statusText}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3].map(i => {
                                    const currentStep = statusText.match(/(\d)\/3/)?.[1];
                                    const isDone = currentStep ? parseInt(currentStep) > i : false;
                                    const isActive = currentStep ? parseInt(currentStep) === i : false;

                                    return (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-3 h-3 rounded-full transition-all duration-300",
                                                isDone ? "bg-green-500 scale-110" :
                                                    isActive ? "bg-primary animate-bounce" : "bg-gray-200"
                                            )}
                                        />
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {scanSuccess && (
                        <>
                            <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center border-2 border-green-200 shadow-lg">
                                <CheckCircle2 className="w-10 h-10 text-green-600" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-green-700">Capture Complete!</h3>
                                <p className="text-sm font-medium text-green-600/70 mt-1">
                                    Biometric data successfully extracted.
                                </p>
                            </div>
                        </>
                    )}

                    {scanError && (
                        <>
                            <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center border-2 border-red-200">
                                <XCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <div className="text-center px-4">
                                <h3 className="text-xl font-bold text-red-700">Error Occurred</h3>
                                <p className="text-sm font-medium text-red-600/70 mt-2">{scanError}</p>
                            </div>
                        </>
                    )}
                </div>
            </Card>

            {!isScanning && !scanSuccess && (
                <Button
                    onClick={handleStartScan}
                    className="w-full h-12 text-md font-bold shadow-lg"
                    size="lg"
                    disabled={!!scanError}
                >
                    <Fingerprint className="w-5 h-5 mr-3" />
                    Start Hardware Capture
                </Button>
            )}

            {scanError && (
                <div className="flex gap-3">
                    <Button onClick={handleRetry} variant="outline" className="flex-1">
                        Try Again
                    </Button>
                    <Button onClick={checkScannerConnection} variant="ghost" size="icon">
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            )}

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
                <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-blue-700 leading-relaxed font-medium">
                    The <strong>SLK20R</strong> captures a high-resolution 500 DPI template compatible with MB460 terminals. Make sure the finger is clean and dry for the best result.
                </p>
            </div>
        </div>
    )
}
