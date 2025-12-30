"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { Loader2, UserPlus, Mail, Shield, Trash2, ShieldCheck, UserCheck } from "lucide-react"
import { toast } from "sonner"

import { Database } from "@/lib/database.types"

type Profile = Database['public']['Tables']['profiles']['Row']

export default function UserManagement() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isInviting, setIsInviting] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)

    // Form state
    const [email, setEmail] = useState("")
    const [fullName, setFullName] = useState("")
    const [role, setRole] = useState<'it_admin' | 'hr_manager'>('hr_manager')

    useEffect(() => {
        const fetchProfiles = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setCurrentUser(user)

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                toast.error("Failed to load users")
            } else {
                setProfiles(data || [])
            }
            setIsLoading(false)
        }

        fetchProfiles()
    }, [])

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !fullName) return

        setIsInviting(true)
        try {
            // Get the session for authorization
            const { data: { session } } = await supabase.auth.getSession()

            // Call the Edge Function
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

            // Refresh list
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
            setProfiles(data || [])

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

    if (isLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Invite Form */}
                <Card className="lg:col-span-1 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-blue-600" />
                            Invite Team Member
                        </CardTitle>
                        <CardDescription>
                            Send an invitation email to pre-assign a role.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleInvite} className="space-y-4">
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
                                <Label htmlFor="role">System Role</Label>
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
                        </form>
                    </CardContent>
                </Card>

                {/* Users List */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                            Team Members
                        </CardTitle>
                        <CardDescription>
                            Active administrators and their assigned roles.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {profiles.map((profile) => (
                                        <TableRow key={profile.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{profile.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{profile.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {profile.role === 'it_admin' ? (
                                                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                                        IT Admin
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                        HR Manager
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">
                                                {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-slate-400 hover:text-red-500"
                                                    disabled={profile.id === currentUser?.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {profiles.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
