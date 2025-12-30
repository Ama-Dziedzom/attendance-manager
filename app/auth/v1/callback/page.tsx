"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function AuthCallbackPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const handleCallback = async () => {
            // Get the hash fragment from the URL
            const hashParams = new URLSearchParams(
                window.location.hash.substring(1) // Remove the leading #
            )

            const accessToken = hashParams.get("access_token")
            const refreshToken = hashParams.get("refresh_token")
            const type = hashParams.get("type")

            if (accessToken && refreshToken) {
                // Set the session using the tokens from the URL
                const { error } = await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                })

                if (error) {
                    console.error("Error setting session:", error)
                    setError(error.message)
                    return
                }

                // If this is an invite, redirect to set password page
                if (type === "invite" || type === "recovery") {
                    // User accepted invite - redirect to set password page first
                    router.push("/auth/set-password")
                } else {
                    router.push("/dashboard")
                }
            } else {
                // Try the code exchange flow as fallback
                const params = new URLSearchParams(window.location.search)
                const code = params.get("code")

                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code)
                    if (error) {
                        console.error("Error exchanging code:", error)
                        setError(error.message)
                        return
                    }
                    router.push("/dashboard")
                } else {
                    setError("No authentication tokens found")
                }
            }
        }

        handleCallback()
    }, [router])

    if (error) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <div className="text-destructive text-lg font-medium">
                    Authentication Error
                </div>
                <p className="text-muted-foreground">{error}</p>
                <button
                    onClick={() => router.push("/login")}
                    className="text-primary underline hover:no-underline"
                >
                    Return to login
                </button>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Completing authentication...</p>
        </div>
    )
}
