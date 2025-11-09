"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/attendance", label: "Attendance", icon: "📋" },
  { href: "/dashboard/reports", label: "Reports", icon: "📈" },
  { href: "/dashboard/employees", label: "Employees", icon: "👥" },
  { href: "/dashboard/devices", label: "Devices", icon: "📱" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
]

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(sessionStorage.getItem("userRole"))
  }, [])

  const handleLogout = () => {
    sessionStorage.clear()
    router.push("/")
  }

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-2xl font-bold text-white">Attendance Hub</h1>
        <p className="text-xs text-slate-300 mt-2">{role === "it-admin" ? "IT Admin Panel" : "HR Manager Portal"}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "default" : "ghost"}
              className={`w-full justify-start text-left ${
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-200 hover:bg-slate-700 hover:text-white"
              }`}
              asChild
            >
              <span>
                {item.icon} {item.label}
              </span>
            </Button>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full text-slate-200 border-slate-600 hover:bg-slate-700 hover:text-white bg-transparent"
        >
          Logout
        </Button>
      </div>
    </aside>
  )
}
