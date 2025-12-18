"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Scan, LayoutDashboard, Fingerprint } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Attendance Manager</h1>
          <p className="text-muted-foreground text-lg">
            ZKTeco SLK20R Fingerprint Reader & K40 Terminal
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fingerprint Registration - SLK20R */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Fingerprint className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>SLK20R - Register Fingerprints</CardTitle>
              <CardDescription>
                Enroll employee biometrics using ZKTeco Eco SLK20R Reader
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/fingerprint">
                <Button className="w-full">Open Enrollment</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Attendance Terminal - K40 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Scan className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>K40 - Clock In/Out</CardTitle>
              <CardDescription>
                Record attendance using ZKTeco K40 Terminal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/scan">
                <Button className="w-full">Open Terminal</Button>
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
