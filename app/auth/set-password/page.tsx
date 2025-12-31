"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Fingerprint, Loader2 } from "lucide-react"
import { SetPasswordForm } from "@/components/set-password-form"
import { AuthImageSection } from "@/components/auth-image-section"
import { supabase } from "@/lib/supabase/client"

export default function SetPasswordPage() {
    const router = useRouter()
    const [isChecking, setIsChecking] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                // No session, redirect to login
                router.push("/login")
                return
            }

            setIsAuthenticated(true)
            setIsChecking(false)
        }

        checkSession()
    }, [router])

    if (isChecking) {
        return (
            <div className="flex min-h-svh items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    <p className="text-muted-foreground">Verifying session...</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return null
    }

    return (
        <div className="grid h-screen overflow-hidden lg:grid-cols-2 bg-slate-50">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900 transition-opacity hover:opacity-80">
                        <div className="bg-blue-600 text-white flex size-10 items-center justify-center rounded-xl shadow-lg shadow-blue-600/20">
                            <Fingerprint className="size-6" />
                        </div>
                        <span>Attendance Hub</span>
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center py-10">
                    <div className="w-full max-w-sm">
                        <SetPasswordForm />
                    </div>
                </div>
                <div className="text-center md:text-left">
                    <p className="text-xs text-slate-400">
                        &copy; {new Date().getFullYear()} Attendance Hub. Secure Administrative Access.
                    </p>
                </div>
            </div>
            <AuthImageSection />
        </div>
    )
}
