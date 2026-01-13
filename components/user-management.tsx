"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { Loader2, UserPlus, Shield, Trash2, UserCheck, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

// Reusable components
import { SearchInput } from "@/components/ui/search-input"
import { DataTable, type ColumnDef } from "@/components/ui/data-table"

// Utilities
import { USER_ROLES, formatDate, getInitials, cn } from "@/lib/utils"
import { isValidEmail, sanitizeName, sanitizeString } from "@/lib/security"
import type { Database } from "@/lib/database.types"

type Profile = Database['public']['Tables']['profiles']['Row']
type UserRole = 'it' | 'hr' | 'front_desk'

export default function UserManagement() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviting, setIsInviting] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form state
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [role, setRole] = useState<UserRole>('hr')

    const fetchProfiles = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            toast.error("Failed to load users: " + error.message)
        } else {
            setProfiles(data || [])
        }
        setIsLoading(false)
    }, [])

    useEffect(() => {
        fetchProfiles()
    }, [fetchProfiles])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate inputs
        const sanitizedName = sanitizeName(fullName)
        const sanitizedEmail = sanitizeString(email).toLowerCase()

        if (!sanitizedName || sanitizedName.length < 2) {
            toast.error("Please enter a valid name")
            return
        }

        if (!isValidEmail(sanitizedEmail)) {
            toast.error("Please enter a valid email address")
            return
        }

        setIsInviting(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                        email: sanitizedEmail,
                        fullName: sanitizedName,
                        role,
                        redirectTo: `${window.location.origin}/auth/v1/callback`
                    }),
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Failed to send invitation")
            }

            toast.success(`Invitation sent to ${sanitizedEmail}`)
            setIsDialogOpen(false)
            fetchProfiles()

            // Reset form
            setEmail("")
            setFullName("")
            setRole("hr")
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsInviting(false)
        }
    }

    const filteredProfiles = useMemo(() => {
        return profiles.filter(p =>
            p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [profiles, searchTerm])

    // Role badge component
    const RoleBadge = ({ role }: { role: string }) => {
        const config = USER_ROLES[role as keyof typeof USER_ROLES]
        const Icon = role === 'it' ? Shield : (role === 'hr' ? UserCheck : ShieldCheck)

        return (
            <Badge
                variant="outline"
                className={cn(
                    "gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold shadow-xs transition-colors",
                    config?.badgeClass || 'bg-gray-50 text-gray-700 border-gray-200'
                )}
            >
                <Icon className="h-3 w-3" />
                {config?.label || role}
            </Badge>
        )
    }

    // Table columns
    const columns: ColumnDef<Profile>[] = [
        {
            key: "user",
            header: "User",
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium border border-slate-200">
                        {getInitials(row.full_name)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{row.full_name}</span>
                        <span className="text-xs text-muted-foreground">{row.email}</span>
                    </div>
                </div>
            ),
        },
        {
            key: "role",
            header: "Role",
            render: (row) => <RoleBadge role={row.role} />,
        },
        {
            key: "status",
            header: "Status",
            render: () => (
                <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] uppercase tracking-widest font-bold shadow-xs"
                >
                    Active
                </Badge>
            ),
        },
        {
            key: "joined",
            header: "Joined",
            className: "text-slate-500",
            render: (row) => formatDate(row.created_at, "MMM d, yyyy"),
        },
        {
            key: "actions",
            header: "Actions",
            align: "right",
            render: (row) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                    disabled={row.id === currentUser?.id}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            ),
        },
    ]

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <SearchInput
                    inputId="user-search"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <UserPlus className="h-4 w-4" />
                            Invite User
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                            <DialogDescription>
                                Send a secure invitation email to a new administrator.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleInvite} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    maxLength={100}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Work Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    maxLength={254}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Assign Role</Label>
                                <Select value={role} onValueChange={(v: UserRole) => setRole(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="it">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-blue-600" />
                                                <span>IT Admin</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="hr">
                                            <div className="flex items-center gap-2">
                                                <UserCheck className="h-4 w-4 text-emerald-600" />
                                                <span>HR Manager</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="front_desk">
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-orange-600" />
                                                <span>Front Desk</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    disabled={isInviting}
                                >
                                    {isInviting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        "Send Invitation"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <DataTable
                data={filteredProfiles}
                columns={columns}
                emptyMessage="No users found."
                className="shadow-sm"
            />
        </div>
    )
}
