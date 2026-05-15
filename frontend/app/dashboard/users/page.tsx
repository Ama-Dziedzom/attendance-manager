"use client"

import UserManagement from "@/components/user-management"
import { ShieldAlert } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Database } from "@/lib/database.types"

type Profile = Database['public']['Tables']['profiles']['Row']

export default function UsersPage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (data?.role !== 'it' && data?.role !== 'super_admin') {
                    router.push('/dashboard')
                    return
                }
                setProfile(data)
            } else {
                router.push('/login')
            }
            setIsLoading(false)
        }
        checkRole()
    }, [router])

    if (isLoading) {
        return (
            <div className="p-8 space-y-10">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-[400px] w-full rounded-xl" />
                </div>
            </div>
        )
    }

    return (
        <div className="p-8 space-y-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">User Management</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                        Manage platform access and administrative roles
                    </p>
                </div>
            </div>

            <UserManagement />
        </div>
    )
}
