"use client"

import * as React from "react"
import {
    LayoutDashboardIcon,
    FileText,
    FileChartLine,
    UsersRound,
    Settings,
    LogOut,
    UserCircle,
    Command,
    MoreVertical,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    useSidebar,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import { supabase } from "@/lib/supabase/client"
import { Database } from "@/lib/database.types"
import { cn } from "@/lib/utils"

type Profile = Database['public']['Tables']['profiles']['Row']

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const router = useRouter()
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"
    const [profile, setProfile] = React.useState<Profile | null>(null)
    const [employeeCount, setEmployeeCount] = React.useState<number | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)

    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                // Fetch profile
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                setProfile(profileData)

                // Fetch employee count
                const { count } = await supabase
                    .from('employees')
                    .select('*', { count: 'exact', head: true })

                setEmployeeCount(count || 0)
            }
            setIsLoading(false)
        }

        fetchData()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const navigationGroups = React.useMemo(() => {
        return [
            {
                label: "Dashboard",
                items: [
                    { href: "/dashboard", label: "Overview", icon: LayoutDashboardIcon },
                ]
            },
            {
                label: "Tracking",
                items: [
                    { href: "/dashboard/attendance", label: "Attendance", icon: FileText },
                    { href: "/dashboard/reports", label: "Reports", icon: FileChartLine },
                ]
            },
            {
                label: "Management",
                items: [
                    {
                        href: "/dashboard/employees",
                        label: "Employees",
                        icon: UsersRound,
                        badge: employeeCount?.toString()
                    },
                    ...(profile?.role === 'it_admin' ? [{ href: "/dashboard/users", label: "Users", icon: UserCircle }] : []),
                ]
            }
        ]
    }, [profile?.role, employeeCount])

    return (
        <Sidebar collapsible="icon" {...props} variant="sidebar" className="border-r bg-sidebar">
            <SidebarHeader className="p-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className={cn(
                            "flex items-center gap-3 px-5 py-6",
                            isCollapsed && "px-0 justify-center"
                        )}>
                            <div className={cn(
                                "flex items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0",
                                isCollapsed ? "size-7" : "size-8"
                            )}>
                                <Command className={cn(isCollapsed ? "size-4" : "size-5")} />
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-semibold tracking-tight text-foreground leading-tight">
                                        Attendance Hub
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
                                        {profile?.role === "it_admin" ? "IT Administrator" : "HR Manager"}
                                    </span>
                                </div>
                            )}
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-2 gap-0 overflow-x-hidden">
                {navigationGroups.map((group) => (
                    <SidebarGroup key={group.label} className={cn("py-2", isCollapsed && "px-0")}>
                        {!isCollapsed && (
                            <SidebarGroupLabel className="px-3 text-[11px] font-medium text-muted-foreground/60 mb-1">
                                {group.label}
                            </SidebarGroupLabel>
                        )}
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <SidebarMenuItem key={item.href}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={isActive}
                                                tooltip={item.label}
                                                className={cn(
                                                    "h-9",
                                                    isCollapsed ? "px-0 justify-center" : "px-3",
                                                    !isActive && "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                )}
                                            >
                                                <Link href={item.href} className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                                                    <item.icon className="size-4 shrink-0" />
                                                    {!isCollapsed && (
                                                        <>
                                                            <span className="text-sm">{item.label}</span>
                                                            {item.badge && (
                                                                <span className="ml-auto inline-flex h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-medium bg-white/20 border border-white/20">
                                                                    {item.badge}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="p-2 mt-auto border-t">
                <SidebarMenu>
                    <SidebarMenuItem className="mb-1">
                        <SidebarMenuButton
                            asChild
                            isActive={pathname === "/dashboard/settings"}
                            tooltip="Settings"
                            className={cn(
                                "h-9",
                                isCollapsed ? "px-0 justify-center" : "px-3",
                                pathname !== "/dashboard/settings" && "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                            )}
                        >
                            <Link href="/dashboard/settings" className={cn("flex items-center", isCollapsed ? "justify-center" : "gap-3")}>
                                <Settings className="size-4 shrink-0" />
                                {!isCollapsed && <span className="text-sm">Settings</span>}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className={cn(
                                        "h-12 w-full transition-colors rounded-md",
                                        isCollapsed ? "px-0 justify-center" : "px-2 hover:bg-muted/50"
                                    )}
                                >
                                    <div className={cn("flex items-center w-full", isCollapsed ? "justify-center" : "gap-2.5")}>
                                        <div className={cn(
                                            "flex items-center justify-center rounded-full border border-border bg-muted shrink-0",
                                            isCollapsed ? "size-7" : "size-8"
                                        )}>
                                            <UserCircle className={cn("text-muted-foreground", isCollapsed ? "size-4" : "size-5")} />
                                        </div>
                                        {!isCollapsed && (
                                            <div className="flex flex-col text-left overflow-hidden">
                                                <span className="text-sm font-semibold text-foreground truncate leading-tight">
                                                    {profile?.full_name || "User Account"}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate -mt-0.5">
                                                    {profile?.email || "user@company.com"}
                                                </span>
                                            </div>
                                        )}
                                        {!isCollapsed && (
                                            <MoreVertical className="ml-auto size-3.5 text-muted-foreground/50 shrink-0" />
                                        )}
                                    </div>
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-[200px] shadow-lg"
                                side={isCollapsed ? "right" : "bottom"}
                                align={isCollapsed ? "start" : "end"}
                                sideOffset={8}
                            >
                                <DropdownMenuLabel className="font-normal text-xs text-muted-foreground px-2 py-1.5">
                                    Account
                                </DropdownMenuLabel>
                                <DropdownMenuItem className="cursor-pointer space-x-2">
                                    <UserCircle className="size-4 text-muted-foreground" />
                                    <span>Profile</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 space-x-2"
                                >
                                    <LogOut className="size-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

