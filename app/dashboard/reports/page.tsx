"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, LineChart } from "@/components/charts"

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState("weekly")

  // Weekly attendance data
  const weeklyData = [
    { day: "Mon", onTime: 48, late: 12, absent: 10 },
    { day: "Tue", onTime: 50, late: 10, absent: 10 },
    { day: "Wed", onTime: 52, late: 8, absent: 10 },
    { day: "Thu", onTime: 49, late: 11, absent: 10 },
    { day: "Fri", onTime: 55, late: 5, absent: 10 },
  ]

  // Department breakdown
  const departmentData = [
    { name: "Engineering", value: 22 },
    { name: "Sales", value: 18 },
    { name: "HR", value: 8 },
    { name: "Marketing", value: 15 },
    { name: "Finance", value: 12 },
  ]

  // Late arrivals trend
  const lateArrivalsData = [
    { week: "Week 1", count: 8 },
    { week: "Week 2", count: 12 },
    { week: "Week 3", count: 10 },
    { week: "Week 4", count: 7 },
  ]

  // Status distribution
  const statusDistribution = [
    { name: "On Time", value: 75, color: "bg-green-500" },
    { name: "Late", value: 15, color: "bg-yellow-500" },
    { name: "Early Dep.", value: 8, color: "bg-blue-500" },
    { name: "Absent", value: 2, color: "bg-red-500" },
  ]

  // Department-wise attendance percentage
  const departmentAttendance = [
    { dept: "Engineering", percentage: 95 },
    { dept: "Sales", percentage: 92 },
    { dept: "HR", percentage: 98 },
    { dept: "Marketing", percentage: 88 },
    { dept: "Finance", percentage: 96 },
  ]

  const totalEmployees = 70
  const averageAttendance = (((totalEmployees - 2) / totalEmployees) * 100).toFixed(1)

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Reports & Analytics</h1>
        <p className="text-slate-400 mt-1">Attendance trends and insights</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Avg Attendance Rate</p>
            <p className="text-3xl font-bold text-green-400 mt-2">{averageAttendance}%</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Total Employees</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">{totalEmployees}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">This Week Late</p>
            <p className="text-3xl font-bold text-yellow-400 mt-2">7</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">This Week Absent</p>
            <p className="text-3xl font-bold text-red-400 mt-2">2</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Trend */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Weekly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={weeklyData}
              lines={[
                { key: "onTime", color: "#22c55e", name: "On Time" },
                { key: "late", color: "#eab308", name: "Late" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Attendance by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={departmentData} />
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Late Arrivals Trend */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Late Arrivals Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={lateArrivalsData} lines={[{ key: "count", color: "#f59e0b", name: "Late Arrivals" }]} />
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-white font-semibold">{item.value}%</span>
                  <div className="w-32 bg-slate-700 rounded-full h-2 ml-4">
                    <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Attendance Percentage */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Department Attendance Percentage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {departmentAttendance.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between mb-2">
                  <span className="text-slate-300">{item.dept}</span>
                  <span className="text-white font-semibold">{item.percentage}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-3">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
