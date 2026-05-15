"use client"

import { ChevronDown, MoreHorizontal, UserCheck, Users, Clock, AlertCircle } from "lucide-react"

export function AuthImageSection() {
    return (
        <div className="relative hidden lg:flex flex-col items-center justify-center bg-[#3B52FF] overflow-hidden p-12 h-screen w-full font-sans">
            {/* Background Pattern - Large subtle overlapping shapes like in reference */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/[0.04] blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] rounded-full bg-white/[0.06] blur-[150px]" />
                <div className="absolute top-[20%] right-[-5%] w-[40%] h-[40%] rounded-full border-[1px] border-white/[0.08]" />
                <div className="absolute bottom-[10%] left-[5%] w-[30%] h-[30%] rounded-full border-[1px] border-white/[0.05]" />

                {/* Specific distinctive curves from image */}
                <svg className="absolute inset-0 w-full h-full opacity-[0.03]" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <circle cx="20" cy="20" r="40" fill="none" stroke="white" strokeWidth="0.5" />
                    <circle cx="80" cy="80" r="50" fill="none" stroke="white" strokeWidth="0.5" />
                </svg>
            </div>

            {/* Content Container */}
            <div className="relative z-20 text-center mb-10 max-w-2xl">
                <h2 className="text-[48px] font-semibold text-white mb-4 tracking-tight leading-[1.2]">
                    Effortlessly manage your team and operations.
                </h2>
                <p className="text-white/80 text-lg font-normal">
                    Log in to access your attendance dashboard and manage your team.
                </p>
            </div>

            {/* Mock Dashboard UI Container */}
            <div className="relative z-10 w-full max-w-[860px] transform scale-[0.9] origin-top">
                <div className="bg-[#FFFFFF] rounded-[24px] p-6 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] border border-white/20 relative overflow-hidden">

                    <div className="grid grid-cols-12 gap-5">
                        {/* Left Column - Metrics */}
                        <div className="col-span-3 flex flex-col gap-5">
                            <div className="bg-[#4D55FF] p-5 rounded-[20px] text-white shadow-lg shadow-blue-500/10 h-[140px] flex flex-col justify-between">
                                <div className="flex justify-between items-center opacity-80">
                                    <span className="text-[11px] font-medium tracking-wide">Present Today</span>
                                    <MoreHorizontal className="size-4" />
                                </div>
                                <div className="text-3xl font-bold tracking-tight">4248</div>
                                <div className="flex items-center gap-1">
                                    <div className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] font-medium">↑ 3.2%</div>
                                    <span className="text-[10px] opacity-60">from yesterday</span>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm h-[140px] flex flex-col justify-between">
                                <div className="flex justify-between items-center text-slate-400">
                                    <span className="text-[11px] font-medium tracking-wide">Total Absent</span>
                                    <MoreHorizontal className="size-4" />
                                </div>
                                <div className="text-3xl font-bold text-slate-900 tracking-tight">128</div>
                                <div className="flex items-center gap-1 text-slate-400">
                                    <div className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-medium">↓ 1.5%</div>
                                    <span className="text-[10px]">from yesterday</span>
                                </div>
                            </div>
                        </div>

                        {/* Middle Column - Chart */}
                        <div className="col-span-3">
                            <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm h-full flex flex-col">
                                <div className="flex justify-between items-center text-slate-400 mb-2">
                                    <span className="text-[11px] font-medium tracking-wide">Punctuality</span>
                                    <MoreHorizontal className="size-4" />
                                </div>
                                <div className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">00:01:30</div>
                                <div className="flex-1 flex items-end relative overflow-hidden h-24">
                                    <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                        <path
                                            d="M0 40 Q 15 35, 25 25 T 50 20 T 75 10 T 100 15 V 40 H 0 Z"
                                            fill="url(#gradient-blue)"
                                            className="opacity-20"
                                        />
                                        <path
                                            d="M0 40 Q 15 35, 25 25 T 50 20 T 75 10 T 100 15"
                                            fill="none"
                                            stroke="#4D55FF"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                        <defs>
                                            <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="#4D55FF" />
                                                <stop offset="100%" stopColor="#4D55FF" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                                <div className="mt-4 flex items-center gap-1 text-slate-400">
                                    <div className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-medium">↑ 8%</div>
                                    <span className="text-[10px]">than last month</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Bar Chart */}
                        <div className="col-span-6 overflow-visible relative">
                            <div className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm h-full flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <span className="text-sm font-bold text-slate-900">Weekly Activity</span>
                                        <p className="text-[10px] text-slate-400">Monitor attendance trends.</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 border border-slate-100 px-2 py-1 rounded-lg">
                                        Weekly <ChevronDown className="size-3" />
                                    </div>
                                </div>
                                <div className="flex-1 flex items-end gap-3 justify-between">
                                    {[
                                        { h1: "40%", h2: "60%" },
                                        { h1: "30%", h2: "50%" },
                                        { h1: "80%", h2: "95%" },
                                        { h1: "50%", h2: "70%" },
                                        { h1: "60%", h2: "85%" },
                                    ].map((item, i) => (
                                        <div key={i} className="flex-1 flex flex-col gap-1 h-32 relative group">
                                            <div className="w-full bg-[#EBF0FF] rounded-md flex-1 relative overflow-hidden">
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 bg-[#4D55FF] rounded-md transition-all duration-700"
                                                    style={{ height: item.h2 }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Floating Gauge Card - Overlapping */}
                            <div className="absolute -right-4 top-1/2 -translate-y-1/4 z-30 w-[240px] transform translate-x-2 animate-in fade-in slide-in-from-right-10 duration-1000">
                                <div className="bg-white rounded-[24px] p-5 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.15)] border border-slate-50">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-[11px] font-bold text-slate-900">Staff Status</span>
                                        <div className="text-[10px] font-medium text-slate-400 border border-slate-100 px-2 py-0.5 rounded">Monthly <ChevronDown className="size-2.5 inline ml-1" /></div>
                                    </div>

                                    <div className="relative flex flex-col items-center h-32 mb-2">
                                        {/* Gauge shifted up more to provide room for text */}
                                        <div className="transform -translate-y-6 w-full flex justify-center">
                                            <svg className="w-full h-full max-w-[170px]" viewBox="0 0 100 55">
                                                {/* Background arc */}
                                                <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#F8FAFC" strokeWidth="11" strokeLinecap="round" />

                                                {/* Calculated Rainbow segments with clear gaps to prevent overlap */}
                                                <path d="M 12 45 A 40 40 0 0 1 30 18" fill="none" stroke="#4D55FF" strokeWidth="11" strokeLinecap="round" />
                                                <path d="M 38 14 A 40 40 0 0 1 62 14" fill="none" stroke="#8E94FF" strokeWidth="11" strokeLinecap="round" />
                                                <path d="M 70 18 A 40 40 0 0 1 88 45" fill="none" stroke="#CFD2FF" strokeWidth="11" strokeLinecap="round" />
                                            </svg>
                                        </div>

                                        {/* Text anchored to the bottom for stability */}
                                        <div className="absolute inset-x-0 bottom-2 flex flex-col items-center">
                                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mb-0.5">Total Active</p>
                                            <p className="text-2xl font-black text-slate-900 leading-none">1894 Units</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mt-4">
                                        {[
                                            { label: "On Duty", value: "1248", color: "#4D55FF" },
                                            { label: "On Leave", value: "350", color: "#8E94FF" },
                                            { label: "Remote", value: "296", color: "#CFD2FF" }
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                    <span className="text-[10px] text-slate-500 font-medium">{item.label}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-800">{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Table section */}
                        <div className="col-span-12 mt-2">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-bold text-slate-900">Live Attendance Feed</span>
                                <div className="p-1 px-2 border border-slate-100 rounded-lg">
                                    <MoreHorizontal className="size-4 text-slate-300" />
                                </div>
                            </div>

                            <table className="w-full text-left">
                                <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="pb-3 pr-4">Employee</th>
                                        <th className="pb-3 px-4">Log Type</th>
                                        <th className="pb-3 px-4">Time</th>
                                        <th className="pb-3 px-4">Status</th>
                                        <th className="pb-3 pl-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px]">
                                    {[
                                        { name: "Sarah Williams", type: "Fingerprint", time: "08:45 AM, Today", status: "Present", color: "bg-green-50 text-green-600" },
                                        { name: "John Doe", type: "RFID Card", time: "09:12 AM, Today", status: "Late", color: "bg-amber-50 text-amber-600" },
                                        { name: "Michael Chen", type: "Face ID", time: "08:30 AM, Today", status: "Present", color: "bg-green-50 text-green-600" },
                                        { name: "Emma Wilson", type: "Manual Entry", time: "09:05 AM, Today", status: "Pending", color: "bg-slate-50 text-slate-400" },
                                    ].map((row, i) => (
                                        <tr key={i} className="group hover:bg-slate-50 transition-colors border-t border-slate-50">
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {row.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <span className="font-semibold text-slate-900">{row.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-500 font-medium">{row.type}</td>
                                            <td className="py-3 px-4 text-slate-400">{row.time}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${row.color}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className="py-3 pl-4 text-right">
                                                <MoreHorizontal className="size-4 text-slate-300 ml-auto" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
