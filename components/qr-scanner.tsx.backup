"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, Clock, AlertCircle, CheckCircle, Building } from "lucide-react"
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

export function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrCodeScannerRef = useRef<Html5Qrcode | null>(null)
  const isScannerRunningRef = useRef(false)
  
  const [scanState, setScanState] = useState<"agency-select" | "ready" | "scanning" | "success" | "error" | "registered">("agency-select")
  const [selectedAgency, setSelectedAgency] = useState<string>("")
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

  // Process scanned QR code data
  const processQRCode = useCallback((qrData: string) => {
    console.log("🔍 PROCESS QR CODE CALLED")
    console.log("📄 Raw QR Data:", qrData)
    console.log("🏢 Selected Agency:", selectedAgency)
    
    try {
      const cleanedData = qrData.trim()
      console.log("🧹 Cleaned Data:", cleanedData)
      
      let qrDataObj
      try {
        qrDataObj = JSON.parse(cleanedData)
        console.log("✅ Parsed successfully:", qrDataObj)
      } catch (parseError) {
        console.error("❌ JSON Parse Error:", parseError)
        console.error("Failed to parse:", cleanedData)
        
        const jsonMatch = cleanedData.match(/\{.*\}/)
        if (jsonMatch) {
          try {
            qrDataObj = JSON.parse(jsonMatch[0])
            console.log("✅ Successfully parsed after extraction:", qrDataObj)
          } catch (e) {
            setScanState("error")
            setErrorMessage(`Invalid QR Code format. Please ensure the QR code was generated from this system.`)
            setScanResult(null)
            setTimeout(() => resumeScanning(), 3000)
            return
          }
        } else {
          setScanState("error")
          setErrorMessage(`Invalid QR Code format. Raw data: ${cleanedData.substring(0, 100)}...`)
          setScanResult(null)
          setTimeout(() => resumeScanning(), 3000)
          return
        }
      }

      const { empId, name, hash, generated } = qrDataObj
      console.log("🔑 Extracted fields:", { empId, name, hash, generated })

      if (!empId || !name) {
        console.error("❌ Missing required fields:", { empId, name, hash, generated })
        setScanState("error")
        setErrorMessage(`Invalid QR Code format. Missing empId or name. Found: ${JSON.stringify(qrDataObj)}`)
        setScanResult(null)
        setTimeout(() => resumeScanning(), 3000)
        return
      }

      const allEmployees = employeeStorage.getAll()
      console.log("👥 All employees in storage:", allEmployees)
      console.log("🔢 Total employees:", allEmployees.length)
      console.log("🔍 Looking for empId:", empId)
      console.log("📋 Available empIds:", allEmployees.map(e => e.empId))

      const employee = employeeStorage.getByEmpId(empId)
      console.log("👤 Found employee:", employee)
      
      if (!employee) {
        setScanState("error")
        setErrorMessage(`Employee not found. EmpId: "${empId}". Please generate QR code first. Available employees: ${allEmployees.length}`)
        setScanResult(null)
        setTimeout(() => resumeScanning(), 3000)
        return
      }

      if (hash && employee.hash !== hash) {
        console.warn("⚠️ Hash mismatch - QR:", hash, "Employee:", employee.hash)
        setScanState("error")
        setErrorMessage("Invalid QR Code - Security verification failed")
        setScanResult(null)
        setTimeout(() => resumeScanning(), 3000)
        return
      }

      console.log("✅ Employee validated, processing attendance...")

      // FIXED: Process attendance with agency info
      let attendanceRecord
      const agencyName = AGENCIES.find(a => a.id === selectedAgency)?.name || selectedAgency
      
      if (clockInMode) {
        console.log("⏰ Clocking IN at agency:", agencyName)
        // Pass agency name as 4th parameter
        attendanceRecord = attendanceStorage.clockIn(
          empId, 
          employee.name, 
          employee.department,
          agencyName
        )
        console.log("📝 Clock In Result:", attendanceRecord)
      } else {
        console.log("⏰ Clocking OUT from agency:", agencyName)
        // Call with just the employee ID
        attendanceRecord = attendanceStorage.clockOut(empId)
        console.log("📝 Clock Out Result:", attendanceRecord)
        
        if (!attendanceRecord) {
          setScanState("error")
          setErrorMessage("No clock-in record found for today")
          setScanResult(null)
          setTimeout(() => resumeScanning(), 3000)
          return
        }
      }

      console.log("✅ Attendance record:", attendanceRecord)

      // Success
      setScanState("success")
      setScanResult({
        employeeId: empId,
        name: employee.name,
        timestamp: new Date().toLocaleTimeString(),
        type: clockInMode ? "in" : "out",
        agency: agencyName
      })
      setErrorMessage("")
      
      console.log("🎉 SUCCESS! Clock", clockInMode ? "IN" : "OUT", "for", employee.name, "at", agencyName)
      
      setTimeout(() => {
        console.log("🔄 Auto-resuming scanner...")
        resumeScanning()
      }, 3000)

      console.log("✅ Attendance record:", attendanceRecord)

      // Success
      setScanState("success")
      setScanResult({
        employeeId: empId,
        name: employee.name,
        timestamp: new Date().toLocaleTimeString(),
        type: clockInMode ? "in" : "out",
        agency: agencyName
      })
      setErrorMessage("")
      
      console.log("🎉 SUCCESS! Clock", clockInMode ? "IN" : "OUT", "for", employee.name, "at", agencyName)
      
      setTimeout(() => {
        console.log("🔄 Auto-resuming scanner...")
        resumeScanning()
      }, 3000)
    } catch (error) {
      console.error("❌ PROCESS QR ERROR:", error)
      setScanState("error")
      setErrorMessage("Failed to process QR code. Please try again.")
      setScanResult(null)
      setTimeout(() => resumeScanning(), 3000)
    }
  }, [clockInMode, resumeScanning, selectedAgency])

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
    const scanningActiveRef = { current: false }
    let scannerInstance: Html5Qrcode | null = null

    const startAutoScan = async () => {
      if (scanningActiveRef.current || scanState === "success" || scanState === "error" || scanState === "agency-select") return
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        stream.getTracks().forEach(track => track.stop())

        if (!scannerInstance) {
          scannerInstance = new Html5Qrcode(scannerId)
          qrCodeScannerRef.current = scannerInstance
        }

        scanningActiveRef.current = true
        setScanState("scanning")
        setIsScanning(true)
        setErrorMessage("")
        
        console.log("🚀 Scanner starting, scanningActive:", scanningActiveRef.current)

        await scannerInstance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            console.log("🎯 QR CODE DETECTED:", decodedText)
            console.log("📊 scanningActive status:", scanningActiveRef.current)
            
            // ALWAYS process if we detect a QR code
            console.log("✅ Processing QR code...")
            scanningActiveRef.current = false
            
            try {
              if (isScannerRunningRef.current) {
                await scannerInstance?.stop()
                isScannerRunningRef.current = false
                console.log("🛑 Scanner stopped")
              }
              
              processQRCode(decodedText)
            } catch (err) {
              console.error("❌ Error processing QR:", err)
              isScannerRunningRef.current = false
              scanningActiveRef.current = true
              startAutoScan()
            }
          },
          (errorMessage) => {
            const ignoredErrors = [
              "NotFoundException",
              "No MultiFormat Readers",
              "QR code parse error"
            ]
            
            const shouldIgnore = ignoredErrors.some(err => errorMessage.includes(err))
            if (!shouldIgnore) {
              console.log("Scan error:", errorMessage)
            }
          }
        )
        
        isScannerRunningRef.current = true
        console.log("✅ Scanner started successfully, scanningActive:", scanningActiveRef.current)
        
      } catch (error: any) {
        console.error("Scanner start error:", error)
        const errorName = error?.name || ""
        
        isScannerRunningRef.current = false
        
        if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
          setErrorMessage("Camera permission denied. Please allow camera access and try again.")
        } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
          setErrorMessage("No camera found. Please connect a camera device.")
        } else {
          setErrorMessage("Camera access required. Please allow camera permissions in your browser settings.")
        }
        
        setScanState("error")
        scanningActiveRef.current = false
        setIsScanning(false)
      }
    }

    if (scanState === "ready") {
      startAutoScan()
    }

    return () => {
      scanningActiveRef.current = false
      if (scannerInstance && isScannerRunningRef.current) {
        scannerInstance.stop()
          .then(() => {
            isScannerRunningRef.current = false
            scannerInstance?.clear()
          })
          .catch((err) => {
            if (!err?.message?.includes("not running")) {
              console.error("Error stopping scanner:", err)
            }
            isScannerRunningRef.current = false
          })
      } else if (scannerInstance) {
        try {
          scannerInstance.clear()
        } catch (err) {
          console.error("Error clearing scanner:", err)
        }
      }
    }
  }, [scanState, scannerId, processQRCode])

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
                disabled={!selectedAgency}
              >
                Continue to Scanner
              </Button>
            </Card>
          </div>
        )}

        {/* Scanner Screen */}
        {(scanState === "ready" || scanState === "scanning") && (
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
                Change
              </button>
            </div>

            {/* QR Code Scanner */}
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black mb-6 border-4 border-primary">
              <div id={scannerId} className="w-full h-full" />

              {/* QR Scanner Guides */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-4 border-primary relative">
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
        {scanState === "agency-select" ? (
          <div className="w-full text-center py-2">
            <p className="text-sm text-muted-foreground">Select your agency to continue</p>
          </div>
        ) : scanState === "scanning" ? (
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