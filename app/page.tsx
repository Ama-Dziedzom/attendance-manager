import { redirect } from "next/navigation"

/**
 * Root landing page - Redirects to login
 * Users must authenticate before accessing the application
 * Active pages:
 * - /login - Authentication
 * - /dashboard - Admin portal (requires auth)
 * - /scan - K40 Terminal for clock in/out (public access)
 */
export default function Home() {
  redirect("/login")
}
