"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"

interface UseSessionTimeoutOptions {
    /** Timeout duration in milliseconds (default: 15 minutes) */
    timeoutMs?: number
    /** Warning duration before timeout in milliseconds (default: 2 minutes) */
    warningMs?: number
    /** Events to track for activity */
    events?: string[]
    /** Callback when session times out */
    onTimeout?: () => void
    /** Callback when warning is shown */
    onWarning?: () => void
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const DEFAULT_WARNING_MS = 2 * 60 * 1000 // 2 minutes warning before timeout
const DEFAULT_EVENTS = [
    "mousedown",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart",
    "click",
    "wheel"
]

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
    const {
        timeoutMs = DEFAULT_TIMEOUT_MS,
        warningMs = DEFAULT_WARNING_MS,
        events = DEFAULT_EVENTS,
        onTimeout,
        onWarning
    } = options

    const router = useRouter()
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const warningRef = useRef<NodeJS.Timeout | null>(null)
    const warningShownRef = useRef(false)
    const [isWarningShown, setIsWarningShown] = useState(false)
    const [remainingTime, setRemainingTime] = useState(timeoutMs)
    const countdownRef = useRef<NodeJS.Timeout | null>(null)

    const handleLogout = useCallback(async () => {
        // Clear all timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (warningRef.current) clearTimeout(warningRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)

        // Sign out
        await supabase.auth.signOut()

        // Show toast notification
        toast.error("Session Expired", {
            description: "You have been logged out due to inactivity.",
            duration: 5000,
        })

        // Redirect to login
        router.push("/login")
        router.refresh()

        // Call custom callback if provided
        onTimeout?.()
    }, [router, onTimeout])

    const showWarning = useCallback(() => {
        if (warningShownRef.current) return

        warningShownRef.current = true
        setIsWarningShown(true)
        setRemainingTime(warningMs)

        // Start countdown
        countdownRef.current = setInterval(() => {
            setRemainingTime((prev) => {
                const newTime = prev - 1000
                if (newTime <= 0) {
                    if (countdownRef.current) clearInterval(countdownRef.current)
                    return 0
                }
                return newTime
            })
        }, 1000)

        // Show warning toast
        toast.warning("Session Expiring Soon", {
            description: `Your session will expire in ${Math.floor(warningMs / 60000)} minutes due to inactivity. Move your mouse or press any key to stay logged in.`,
            duration: warningMs,
            id: "session-warning",
        })

        onWarning?.()
    }, [warningMs, onWarning])

    const resetTimer = useCallback(() => {
        // Clear existing timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        if (warningRef.current) clearTimeout(warningRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)

        // Reset warning state
        if (warningShownRef.current) {
            warningShownRef.current = false
            setIsWarningShown(false)
            toast.dismiss("session-warning")
            toast.success("Session Extended", {
                description: "Your session has been extended.",
                duration: 2000,
            })
        }

        setRemainingTime(timeoutMs)

        // Set warning timer (fires before timeout)
        warningRef.current = setTimeout(() => {
            showWarning()
        }, timeoutMs - warningMs)

        // Set timeout timer
        timeoutRef.current = setTimeout(() => {
            handleLogout()
        }, timeoutMs)
    }, [timeoutMs, warningMs, showWarning, handleLogout])

    // Throttle reset calls to avoid excessive resets on rapid events
    const lastResetRef = useRef<number>(0)
    const throttledReset = useCallback(() => {
        const now = Date.now()
        if (now - lastResetRef.current > 1000) { // Only reset once per second
            lastResetRef.current = now
            resetTimer()
        }
    }, [resetTimer])

    useEffect(() => {
        // Initial timer setup
        resetTimer()

        // Add event listeners
        events.forEach((event) => {
            window.addEventListener(event, throttledReset, { passive: true })
        })

        // Also listen for visibility changes
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                // When tab becomes visible, check if we should still be logged in
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (!session) {
                        handleLogout()
                    } else {
                        throttledReset()
                    }
                })
            }
        }
        document.addEventListener("visibilitychange", handleVisibilityChange)

        // Cleanup
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            if (warningRef.current) clearTimeout(warningRef.current)
            if (countdownRef.current) clearInterval(countdownRef.current)

            events.forEach((event) => {
                window.removeEventListener(event, throttledReset)
            })
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [events, resetTimer, throttledReset, handleLogout])

    return {
        isWarningShown,
        remainingTime,
        resetTimer,
        formatRemainingTime: () => {
            const minutes = Math.floor(remainingTime / 60000)
            const seconds = Math.floor((remainingTime % 60000) / 1000)
            return `${minutes}:${seconds.toString().padStart(2, "0")}`
        }
    }
}
