"use client"

import { CheckCircle2, ChevronDown, MoreHorizontal, Search, Settings2 } from "lucide-react"

export function AuthImageSection() {
    return (
        <div className="relative hidden lg:flex flex-col items-center justify-center bg-[#4659FF] overflow-hidden p-12 h-screen w-full font-sans">
            {/* Abstract Background Shapes - Large subtle circles from reference */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] size-[600px] rounded-full bg-white/[0.07] blur-3xl" />
                <div className="absolute top-[20%] -right-[5%] size-[400px] rounded-full bg-white/[0.05] blur-3xl" />
                <div className="absolute -bottom-[15%] left-[20%] size-[500px] rounded-full bg-white/[0.04] blur-3xl opacity-50" />
            </div>

            {/* Hero Text */}
            <div className="relative z-20 text-center mb-16 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <h2 className="text-[52px] font-bold text-white mb-6 tracking-tight leading-[1.05]">
                    Effortlessly manage your team and operations.
                </h2>
                <p className="text-white/70 text-lg font-medium">
                    Log in to access your attendance dashboard and manage your team.
                </p>
            </div>

            {/* Mock Dashboard UI Container */}
            <div className="relative z-10 w-full max-w-[900px] transform scale-[0.88] origin-top">
                <div className="bg-[#FCFCFD] rounded-[32px] p-8 shadow-[0_60px_100px_-20px_rgba(0,0,0,0.3)] border border-white/50 relative overflow-hidden">

                    <div className="grid grid-cols-12 gap-6 relative">

                        {/* Top Row Cards */}
                        <div className="col-span-3">
                            <div className="bg-[#5D5FEF] p-5 rounded-[24px] text-white shadow-lg shadow-[#5D5FEF]/20 relative overflow-hidden h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Total Staff</span>
                                    <MoreHorizontal className="size-3.5 opacity-60" />
                                </div>
                                <div className="text-3xl font-black mb-3 tracking-tight">1894</div>
                                <div className="bg-white/20 px-2 py-1 rounded text-[9px] w-fit font-bold backdrop-blur-md">
                                    1.3k <span className="opacity-70 font-normal ml-1">last month</span>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-3">
                            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm h-full flex flex-col">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Performance</span>
                                    <MoreHorizontal className="size-3.5 text-slate-200" />
                                </div>
                                <div className="text-2xl font-black text-slate-800 mb-4 tracking-tighter">00:01:30</div>
                                <div className="flex-1 flex items-end gap-1.5 h-16">
                                    {[30, 45, 35, 60, 40, 75, 50].map((h, i) => (
                                        <div key={i} className="flex-1 bg-indigo-50/50 rounded-t-full relative h-full">
                                            <div className="absolute bottom-0 left-0 right-0 bg-[#5D5FEF] rounded-t-full" style={{ height: `${h}%` }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-6">
                            <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm h-full flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block mb-0.5">Scans Overview</span>
                                        <span className="text-[9px] text-slate-400 font-medium">Monitor daily scan trends.</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 border border-slate-100 px-2 py-1 rounded-lg">
                                        Weekly <ChevronDown className="size-2.5" />
                                    </div>
                                </div>
                                <div className="flex-1 flex items-end justify-between px-2 gap-4 h-24">
                                    <div className="flex-1 bg-slate-50 rounded-t-xl h-[45%]" />
                                    <div className="flex-1 bg-slate-100 rounded-t-xl h-[65%]" />
                                    <div className="flex-1 bg-[#5D5FEF] rounded-t-xl h-[95%]" />
                                    <div className="flex-1 bg-slate-50 rounded-t-xl h-[55%]" />
                                    <div className="flex-1 bg-slate-100 rounded-t-xl h-[75%]" />
                                </div>
                            </div>
                        </div>

                        {/* Bottom Section - Table Mockup */}
                        <div className="col-span-12 mt-2">
                            <div className="bg-white border-t border-slate-100 pt-6">
                                <div className="flex justify-between items-center mb-6 px-1">
                                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em]">Recent Activity</span>
                                    <Settings2 className="size-3.5 text-slate-200" />
                                </div>
                                <div className="space-y-4">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded-xl px-2 -mx-2">
                                            <div className="flex items-center gap-4">
                                                <div className="size-8 rounded-full bg-slate-50 border border-slate-100" />
                                                <div>
                                                    <div className="h-2 w-32 bg-slate-200 rounded-full mb-2" />
                                                    <div className="h-1.5 w-24 bg-slate-100 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-20 bg-slate-50 rounded-full" />
                                            <div className="flex items-center gap-8">
                                                <div className="h-4 w-16 bg-green-50 rounded-full border border-green-100 border-opacity-50" />
                                                <MoreHorizontal className="size-3.5 text-slate-100" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* THE SCAN METRICS CARD - STICKING OUT LIKE REFERENCE */}
                        <div className="absolute right-[5%] top-[15%] z-50 animate-in fade-in zoom-in duration-700 delay-300">
                            <div className="bg-white rounded-[32px] p-7 shadow-[0_45px_100px_-15px_rgba(0,0,0,0.18)] border border-slate-50 w-[260px] transform hover:translate-y-[-5px] transition-transform duration-500">
                                <div className="flex justify-between items-center mb-8">
                                    <span className="text-[11px] font-bold text-slate-800 tracking-tight">Attendance Metrics</span>
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
                                        Monthly <ChevronDown className="size-2 ml-0.5" />
                                    </div>
                                </div>

                                {/* Semi-Circle Gauge */}
                                <div className="relative flex flex-col items-center justify-center mb-8 pt-4">
                                    <div className="relative size-40">
                                        <svg className="size-full transform -rotate-180" viewBox="0 0 100 50">
                                            {/* Background arc */}
                                            <path
                                                d="M 10 50 A 40 40 0 0 1 90 50"
                                                fill="none"
                                                stroke="#F8FAFC"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                            />
                                            {/* Progress segments like in reference */}
                                            <path
                                                d="M 10 50 A 40 40 0 0 1 45 13"
                                                fill="none"
                                                stroke="#4F46E5"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                            />
                                            <path
                                                d="M 55 13 A 40 40 0 0 1 90 50"
                                                fill="none"
                                                stroke="#A5B4FC"
                                                strokeWidth="10"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 translate-y-[15px]">
                                            <span className="text-[11px] font-medium text-slate-300 uppercase tracking-widest mb-0.5">Attendance</span>
                                            <span className="text-xl font-black text-slate-900 leading-none">94.2% Rate</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Legend with numbers */}
                                <div className="space-y-3.5 px-1">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-2 rounded-full bg-[#4F46E5]" />
                                            <span className="font-semibold text-slate-500">Biometric</span>
                                        </div>
                                        <span className="font-bold text-slate-800">8,248</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-2 rounded-full bg-[#818CF8]" />
                                            <span className="font-semibold text-slate-500">RFID Card</span>
                                        </div>
                                        <span className="font-bold text-slate-800">1,450</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-2 rounded-full bg-[#C7D2FE]" />
                                            <span className="font-semibold text-slate-500">Manual</span>
                                        </div>
                                        <span className="font-bold text-slate-800">640</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Brand Watermark */}
            {/* <div className="absolute bottom-8 text-white/40 text-[10px] flex items-center gap-2 font-bold uppercase tracking-[0.2em] z-20">
                <CheckCircle2 className="size-3.5" />
                Verified Attendance Management Platform
            </div> */}
        </div>
    )
}
