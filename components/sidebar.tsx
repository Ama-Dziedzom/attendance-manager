"use client"

import { useRouter, usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileChartLine, FileText, Icon, LayoutDashboardIcon, Settings, Smartphone, UsersRound } from "lucide-react"

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboardIcon className="w-4 h-4 inline mr-2" /> },
  { href: "/dashboard/attendance", label: "Attendance", icon: <FileText className="w-4 h-4 inline mr-2"/> },
  { href: "/dashboard/reports", label: "Reports", icon: <FileChartLine className="w-4 h-4 inline mr-2"/> },
  { href: "/dashboard/employees", label: "Employees", icon: <UsersRound className="w-4 h-4 inline mr-2"/> },
  { href: "/dashboard/devices", label: "Devices", icon: <Smartphone className="w-4 h-4 inline mr-2"/> },
  { href: "/dashboard/settings", label: "Settings", icon: <Settings className="w-4 h-4 inline mr-2"/> },
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
    <aside className="w-64 bg-blue-50 border-r border-blue-100 flex flex-col">
      <div className="p-6 border-b border-blue-100">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Hub</h1>
        <p className="text-xs text-gray-600 mt-2">{role === "it-admin" ? "IT Admin Panel" : "HR Manager Portal"}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "default" : "ghost"}
              className={`w-full justify-start text-left ${
                pathname === item.href
                  ? "bg-blue-500 text-primary-foreground"
                  : "text-gray-600 hover:bg-blue-50 hover:text-white"
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

      <div className="p-4 border-t border-blue-100">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full text-gray-600 border-blue-600 hover:bg-blue-100 hover:text-blue-500 bg-transparent"
        >
          Logout
        </Button>
      </div>
    </aside>
  )
}
