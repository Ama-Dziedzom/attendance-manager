"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, Clock, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { employeeStorage, attendanceStorage } from "@/lib/storage"
import { Html5Qrcode } from "html5-qrcode"

interface ScanResult {
  employeeId: string
  name: string
  photo?: string
  timestamp: string
  type: "in" | "out"
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

export function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null)
  const [scanState, setScanState] = useState<"ready" | "scanning" | "success" | "error" | "registered">("ready")
  const [currentTime, setCurrentTime] = useState<string>("")
  const [clockInMode, setClockInMode] = useState(true)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [employees, setEmployees] = useState<Map<string, Employee>>(new Map())
  const [isScanning, setIsScanning] = useState(false)
  const [scannerId, setScannerId] = useState("qr-reader")
  const [isMounted, setIsMounted] = useState(false)

  // Set mounted state to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true)
    // Set initial time on client
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

  // Generate device fingerprint
  const getDeviceFingerprint = (): DeviceFingerprint => {
    return {
      id: generateHash(`${navigator.userAgent}${screen.width}${screen.height}${new Date().getTimezoneOffset()}`),
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    }
  }

  // Simple hash function for device ID
  const generateHash = (str: string): string => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  // Resume scanning after success/error
  const resumeScanning = useCallback(() => {
    setScanState("ready")
    setScanResult(null)
    setErrorMessage("")
    // Scanner will auto-resume via useEffect
  }, [])

  // Process scanned QR code data
  const processQRCode = useCallback((qrData: string) => {
    try {
      // Debug: Log the raw QR data
      console.log("Scanned QR Data (raw):", qrData)
      console.log("QR Data length:", qrData.length)
      console.log("QR Data type:", typeof qrData)
      
      // Clean the QR data (remove any whitespace)
      const cleanedData = qrData.trim()
      
      // Parse QR code JSON data
      let qrDataObj
      try {
        qrDataObj = JSON.parse(cleanedData)
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError)
        console.error("Failed to parse:", cleanedData)
        
        // Try to find JSON-like structure
        const jsonMatch = cleanedData.match(/\{.*\}/)
        if (jsonMatch) {
          try {
            qrDataObj = JSON.parse(jsonMatch[0])
            console.log("Successfully parsed after extraction:", qrDataObj)
          } catch (e) {
            setScanState("error")
            setErrorMessage(`Invalid QR Code format. Please ensure the QR code was generated from this system.`)
            setScanResult(null)
            return
          }
        } else {
          setScanState("error")
          setErrorMessage(`Invalid QR Code format. Raw data: ${cleanedData.substring(0, 100)}...`)
          setScanResult(null)
          return
        }
      }

      console.log("Parsed QR Data:", qrDataObj)
      const { empId, name, hash, generated } = qrDataObj

      if (!empId || !name) {
        console.error("Missing required fields:", { empId, name, hash, generated })
        setScanState("error")
        setErrorMessage(`Invalid QR Code format. Missing empId or name. Found: ${JSON.stringify(qrDataObj)}`)
        setScanResult(null)
        return
      }

      // Debug: Check all employees in storage
      const allEmployees = employeeStorage.getAll()
      console.log("All employees in storage:", allEmployees)
      console.log("Total employees:", allEmployees.length)
      console.log("Looking for empId:", empId)
      console.log("Available empIds:", allEmployees.map(e => e.empId))

      // Find employee in storage
      const employee = employeeStorage.getByEmpId(empId)
      console.log("Found employee:", employee)
      
      if (!employee) {
        setScanState("error")
        setErrorMessage(`Employee not found. EmpId: "${empId}". Please generate QR code first. Available employees: ${allEmployees.length}`)
        setScanResult(null)
        return
      }

      // Verify hash (optional security check)
      if (hash && employee.hash !== hash) {
        setScanState("error")
        setErrorMessage("Invalid QR Code - Security verification failed")
        setScanResult(null)
        return
      }

      // Process attendance
      let attendanceRecord
      if (clockInMode) {
        attendanceRecord = attendanceStorage.clockIn(empId, employee.name, employee.department)
      } else {
        attendanceRecord = attendanceStorage.clockOut(empId)
        if (!attendanceRecord) {
          setScanState("error")
          setErrorMessage("No clock-in record found for today")
          setScanResult(null)
          return
        }
      }

      // Success
      setScanState("success")
      setScanResult({
        employeeId: empId,
        name: employee.name,
        timestamp: new Date().toLocaleTimeString(),
        type: clockInMode ? "in" : "out",
      })
      setErrorMessage("")
      
      // Auto-resume scanning after 3 seconds
      setTimeout(() => {
        resumeScanning()
      }, 3000)
    } catch (error) {
      setScanState("error")
      setErrorMessage("Failed to process QR code. Please try again.")
      setScanResult(null)
    }
  }, [clockInMode, resumeScanning])

  // Request camera permission
  const requestCameraPermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true })
      setScanState("ready")
      setErrorMessage("")
    } catch (error) {
      setErrorMessage("Camera permission denied. Please enable camera access in your browser settings.")
      setScanState("error")
    }
  }

  // Auto-start scanner when component mounts
  useEffect(() => {
    let scanningActive = false
    let scannerInstance: Html5Qrcode | null = null

    const startAutoScan = async () => {
      if (scanningActive || scanState === "success" || scanState === "error") return
      
      try {
        // Check if camera is available
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop())

        if (!scannerInstance) {
          scannerInstance = new Html5Qrcode(scannerId)
          qrCodeScannerRef.current = scannerInstance
        }

        scanningActive = true
        setScanState("scanning")
        setIsScanning(true)
        setErrorMessage("")

        // Start continuous scanning
        await scannerInstance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            // QR code detected - process it
            if (scanningActive) {
              scanningActive = false
              try {
                await scannerInstance?.stop()
                processQRCode(decodedText)
              } catch (err) {
                console.error("Error processing QR:", err)
                scanningActive = true
                startAutoScan()
              }
            }
          },
          (errorMessage) => {
            // Ignore scanning errors (just means no QR code detected yet)
          }
        )
      } catch (error: any) {
        console.error("Scanner start error:", error)
        const errorName = error?.name || ""
        
        if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
          setErrorMessage("Camera permission denied. Please allow camera access and try again.")
        } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
          setErrorMessage("No camera found. Please connect a camera device.")
        } else {
          setErrorMessage("Camera access required. Please allow camera permissions in your browser settings.")
        }
        
        setScanState("error")
        scanningActive = false
        setIsScanning(false)
      }
    }

    // Start scanning when ready
    if (scanState === "ready") {
      startAutoScan()
    }

    return () => {
      scanningActive = false
      if (scannerInstance) {
        scannerInstance
          .stop()
          .then(() => {
            scannerInstance?.clear()
          })
          .catch((err) => {
            console.error("Error stopping scanner:", err)
          })
      }
    }
  }, [scanState, scannerId, processQRCode])

  // Alternative: Direct QR code data input for testing
  const handleManualInput = (qrData: string) => {
    processQRCode(qrData)
  }

  const resetScanner = () => {
    resumeScanning()
  }

  return (
    <div className="w-full h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-primary text-primary-foreground px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-sm opacity-90">{currentTime || "--:--:--"}</p>
        </div>
        <Clock className="w-6 h-6" />
      </div>

      {/* Main Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-muted overflow-hidden px-4">
        {scanState === "ready" || scanState === "scanning" ? (
          <>
            {/* QR Code Scanner */}
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black mb-6 border-4 border-primary">
              <div id={scannerId} className="w-full h-full" />

              {/* QR Scanner Guides */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-4 border-primary relative">
                  {/* Corner guides */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500" />
                </div>
              </div>

              {/* Scanning Animation */}
              {scanState === "scanning" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="w-32 h-1 bg-green-500 rounded animate-pulse" />
                </div>
              )}
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
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
          </>
        ) : null}

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
            <h2 className="text-2xl font-bold text-center text-destructive">Camera Access Required</h2>
            <p className="text-center text-sm text-muted-foreground px-4">
              {errorMessage || "Camera permission is required to scan QR codes."}
            </p>
            <div className="flex flex-col gap-2 w-full px-4">
              <Button onClick={requestCameraPermission} size="lg" className="w-full">
                <Camera className="w-5 h-5 mr-2" />
                Allow Camera Access
              </Button>
              <Button 
                onClick={() => {
                  const qrData = prompt("Enter QR Code data manually:")
                  if (qrData) {
                    processQRCode(qrData)
                  }
                }} 
                variant="outline" 
                size="lg" 
                className="w-full"
              >
                Enter QR Code Manually
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Or check your browser settings to allow camera access for this site.
            </p>
          </div>
        )}

        {/* Registered State */}
        {scanState === "registered" && scanResult && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-center">Device Registered</h2>
            <Card className="w-full p-4">
              <p className="text-center font-semibold text-lg">{scanResult.name}</p>
              <p className="text-center text-sm text-muted-foreground">{scanResult.employeeId}</p>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Your device has been successfully registered
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Footer - Action Buttons */}
      <div className="flex-shrink-0 bg-card border-t border-border px-4 py-4 gap-3 flex">
        {scanState === "scanning" ? (
          <div className="w-full text-center py-2">
            <p className="text-sm text-muted-foreground">Scanning... Show QR code to camera</p>
          </div>
        ) : scanState === "success" ? (
          <Button onClick={resetScanner} size="lg" variant="outline" className="w-full bg-transparent">
            Continue Scanning
          </Button>
        ) : scanState === "error" ? (
          <div className="w-full text-center py-2">
            <p className="text-sm text-muted-foreground">Camera access needed</p>
          </div>
        ) : (
          <div className="w-full text-center py-2">
            <p className="text-sm text-muted-foreground">Initializing camera...</p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} hidden />
    </div>
  )
}
