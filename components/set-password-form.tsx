"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

interface PasswordRequirement {
    label: string
    met: boolean
}

function getPasswordRequirements(password: string): PasswordRequirement[] {
    return [
        { label: "At least 8 characters", met: password.length >= 8 },
        { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
        { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
        { label: "Contains a number", met: /[0-9]/.test(password) },
    ]
}

export function SetPasswordForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const requirements = getPasswordRequirements(password)
    const allRequirementsMet = requirements.every((r) => r.met)
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!allRequirementsMet) {
            toast.error("Please meet all password requirements")
            return
        }

        if (!passwordsMatch) {
            toast.error("Passwords do not match")
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            })

            if (error) {
                throw error
            }

            toast.success("Password set successfully! Redirecting to dashboard...")

            // Small delay for user to see success message
            setTimeout(() => {
                router.push("/dashboard")
                router.refresh()
            }, 1500)
        } catch (error: any) {
            toast.error(error.message || "Failed to set password")
            setIsLoading(false)
        }
    }

    return (
        <form
            onSubmit={handleSetPassword}
            className={cn("flex flex-col gap-6", className)}
            {...props}
        >
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Set Your Password</h1>
                    <p className="text-muted-foreground text-sm text-balance">
                        Create a secure password to complete your account setup
                    </p>
                </div>

                <Field>
                    <FieldLabel htmlFor="password">New Password</FieldLabel>
                    <Input
                        id="password"
                        type="password"
                        placeholder="Enter your new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </Field>

                {/* Password Requirements */}
                {password.length > 0 && (
                    <div className="space-y-2 rounded-lg bg-slate-50 p-3 border border-slate-200">
                        <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                            Password Requirements
                        </p>
                        <ul className="space-y-1">
                            {requirements.map((req, index) => (
                                <li
                                    key={index}
                                    className={cn(
                                        "flex items-center gap-2 text-sm transition-colors",
                                        req.met ? "text-green-600" : "text-slate-400"
                                    )}
                                >
                                    {req.met ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                        <XCircle className="h-4 w-4" />
                                    )}
                                    {req.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <Field>
                    <FieldLabel htmlFor="confirmPassword">Confirm Password</FieldLabel>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    {confirmPassword.length > 0 && !passwordsMatch && (
                        <p className="text-sm text-destructive mt-1">
                            Passwords do not match
                        </p>
                    )}
                    {passwordsMatch && (
                        <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Passwords match
                        </p>
                    )}
                </Field>

                <Field className="pt-2">
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading || !allRequirementsMet || !passwordsMatch}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Setting password...
                            </>
                        ) : (
                            "Set Password & Continue"
                        )}
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    )
}
