import { redirect } from "next/navigation"

/**
 * Fingerprint Enrollment Page - Redirects to Employee Directory
 * Employee enrollment is now handled via the "Add Employee" button
 * on the Employee Directory page.
 */
export default function FingerprintPage() {
    redirect("/dashboard/employees")
}
