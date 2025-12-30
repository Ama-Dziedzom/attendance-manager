import { Fingerprint } from "lucide-react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-slate-50">
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
            <LoginForm />
          </div>
        </div>
        <div className="text-center md:text-left">
          <p className="text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Attendance Hub. Secure Administrative Access.
          </p>
        </div>
      </div>
      <div className="bg-slate-900 relative hidden lg:block overflow-hidden">
        <img
          src="/login-bg.png"
          alt="Premium Office Security"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-50 opacity-90 transition-transform duration-1000 hover:scale-105"
        />
        {/* Gradients to blend image */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/20 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent"></div>

        {/* Overlay Text */}
        <div className="absolute bottom-12 left-12 right-12 z-10 space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md text-blue-100 text-xs font-semibold tracking-wider uppercase">
            Enterprise Grade
          </div>
          <h2 className="text-4xl font-bold text-white leading-tight">
            Advanced Attendance <br /> & Biometric Management
          </h2>
          <p className="text-slate-200 text-lg max-w-md">
            Streamlining workplace entry with secure fingerprint integration and real-time reporting.
          </p>
        </div>
      </div>
    </div>
  )
}
