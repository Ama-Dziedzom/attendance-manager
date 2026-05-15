"use client"

import { useSessionTimeout } from "@/hooks/use-session-timeout"

interface SessionTimeoutProviderProps {
    children: React.ReactNode
    /** Timeout duration in minutes (default: 15) */
    timeoutMinutes?: number
    /** Warning duration before timeout in minutes (default: 2) */
    warningMinutes?: number
}

export function SessionTimeoutProvider({
    children,
    timeoutMinutes = 15,
    warningMinutes = 2,
}: SessionTimeoutProviderProps) {
    // Initialize the session timeout hook
    useSessionTimeout({
        timeoutMs: timeoutMinutes * 60 * 1000,
        warningMs: warningMinutes * 60 * 1000,
    })

    return <>{children}</>
}
