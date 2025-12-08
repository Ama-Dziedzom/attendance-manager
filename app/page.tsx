"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Scan, LayoutDashboard, Fingerprint } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Attendance Manager</h1>
          <p className="text-muted-foreground text-lg">
            Manage employee attendance with QR code scanning
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* QR Scanner */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Scan className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Scan QR Code</CardTitle>
              <CardDescription>
                Scan employee QR codes to record attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/scan">
                <Button className="w-full">Open Scanner</Button>
              </Link>
            </CardContent>
          </Card>

          {/* QR Generator */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Generate QR Codes</CardTitle>
              <CardDescription>
                Create QR codes for employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/generator">
                <Button className="w-full">Open Generator</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Fingerprint Registration */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Fingerprint className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Register Fingerprints</CardTitle>
              <CardDescription>
                Register employee fingerprints for attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/fingerprint">
                <Button className="w-full">Open Registration</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Admin Portal */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <LayoutDashboard className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Admin Portal</CardTitle>
              <CardDescription>
                Manage employees, view reports, and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button className="w-full" variant="outline">Open Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
