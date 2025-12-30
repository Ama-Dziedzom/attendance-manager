"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
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
import { Loader2, UserPlus, Mail, Shield, Trash2, Search, UserCheck, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { capitalize } from "@/lib/utils"

import { Database } from "@/lib/database.types"

type Profile = Database['public']['Tables']['profiles']['Row']

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
    const [role, setRole] = useState<'it_admin' | 'hr_manager'>('hr_manager')

    const fetchProfiles = async () => {
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
    }

    useEffect(() => {
        fetchProfiles()
    }, [])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !fullName) return

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
                    body: JSON.stringify({ email, fullName, role }),
                }
            )

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || "Failed to send invitation")
            }

            toast.success(`Invitation sent to ${email}`)
            setIsDialogOpen(false)
            fetchProfiles()

            // Reset form
            setEmail("")
            setFullName("")
            setRole("hr_manager")
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
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-background border-input h-10"
                    />
                </div>

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
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="role">Assign Role</Label>
                                <Select
                                    value={role}
                                    onValueChange={(v: any) => setRole(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="it_admin">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-blue-600" />
                                                <span>IT Admin</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="hr_manager">
                                            <div className="flex items-center gap-2">
                                                <UserCheck className="h-4 w-4 text-green-600" />
                                                <span>HR Manager</span>
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

            <Card className="bg-card border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-border">
                            <tr className="bg-muted/50">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredProfiles.map((profile) => (
                                <tr key={profile.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium border border-slate-200">
                                                {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-foreground">{profile.full_name}</span>
                                                <span className="text-xs text-muted-foreground">{profile.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {profile.role === 'it_admin' ? (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <Shield className="h-3.5 w-3.5" />
                                                <span className="text-xs font-medium uppercase tracking-wider">IT Admin</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-emerald-600">
                                                <UserCheck className="h-3.5 w-3.5" />
                                                <span className="text-xs font-medium uppercase tracking-wider">HR Manager</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px] uppercase tracking-widest font-bold">
                                            Active
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-500">
                                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        }) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                                            disabled={profile.id === currentUser?.id}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {filteredProfiles.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                    <p className="text-slate-400">No users found.</p>
                </div>
            )}
        </div>
    )
}
