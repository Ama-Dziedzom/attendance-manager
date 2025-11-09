"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Role = "it-admin" | "hr-manager"

export default function LoginPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (role && email && password) {
      // Store role in session storage for demo
      sessionStorage.setItem("userRole", role)
      sessionStorage.setItem("userEmail", email)
      router.push("/dashboard")
    }
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-2">Attendance Hub</h1>
            <p className="text-slate-400">Admin Dashboard</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card
              className="cursor-pointer hover:shadow-lg transition-all bg-slate-800 border-slate-700 hover:border-blue-500"
              onClick={() => setRole("it-admin")}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">🔧</div>
                  <h3 className="font-semibold text-white mb-2">IT Admin</h3>
                  <p className="text-sm text-slate-400">Manage devices & security</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-all bg-slate-800 border-slate-700 hover:border-blue-500"
              onClick={() => setRole("hr-manager")}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">👥</div>
                  <h3 className="font-semibold text-white mb-2">HR Manager</h3>
                  <p className="text-sm text-slate-400">View attendance reports</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Sign In as {role === "it-admin" ? "IT Admin" : "HR Manager"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-slate-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-slate-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              Sign In
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full text-slate-300 border-slate-600 hover:bg-slate-700 bg-transparent"
              onClick={() => setRole(null)}
            >
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
