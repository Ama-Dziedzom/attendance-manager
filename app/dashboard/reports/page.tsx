"use client"

import { useState, useMemo } from "react"
import { CartesianGrid, Line, LineChart, XAxis, Label, PolarRadiusAxis, RadialBar, RadialBarChart, PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Users, UserCheck, Clock, TrendingUp } from "lucide-react"

type Timeframe = "week" | "month" | "year"

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("week")

  // Data varies by timeframe
  const getTimeframeData = () => {
    if (timeframe === "week") {
      return [
        { label: "Mon", onTime: 48, late: 12, absent: 10 },
        { label: "Tue", onTime: 50, late: 10, absent: 10 },
        { label: "Wed", onTime: 52, late: 8, absent: 10 },
        { label: "Thu", onTime: 49, late: 11, absent: 10 },
        { label: "Fri", onTime: 55, late: 5, absent: 10 },
        { label: "Sat", onTime: 30, late: 2, absent: 38 },
        { label: "Sun", onTime: 25, late: 1, absent: 44 },
      ]
    } else if (timeframe === "month") {
      return [
        { label: "Week 1", onTime: 240, late: 45, absent: 15 },
        { label: "Week 2", onTime: 245, late: 38, absent: 17 },
        { label: "Week 3", onTime: 250, late: 35, absent: 15 },
        { label: "Week 4", onTime: 255, late: 30, absent: 15 },
        { label: "Week 5", onTime: 100, late: 15, absent: 5 },
      ]
    } else {
      return [
        { label: "Jan", onTime: 980, late: 140, absent: 60 },
        { label: "Feb", onTime: 1020, late: 120, absent: 55 },
        { label: "Mar", onTime: 1050, late: 110, absent: 50 },
        { label: "Apr", onTime: 1080, late: 100, absent: 45 },
        { label: "May", onTime: 1100, late: 90, absent: 40 },
        { label: "Jun", onTime: 1120, late: 85, absent: 35 },
        { label: "Jul", onTime: 1140, late: 80, absent: 30 },
        { label: "Aug", onTime: 1160, late: 75, absent: 28 },
        { label: "Sep", onTime: 1180, late: 70, absent: 25 },
        { label: "Oct", onTime: 1200, late: 65, absent: 22 },
        { label: "Nov", onTime: 1150, late: 72, absent: 26 },
        { label: "Dec", onTime: 1100, late: 85, absent: 30 },
      ]
    }
  }

  const timeframeData = getTimeframeData()

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
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            {timeframe === "week" && "Weekly attendance trends and insights"}
            {timeframe === "month" && "Monthly attendance trends and insights"}
            {timeframe === "year" && "Yearly attendance trends and insights"}
          </p>
        </div>
        <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageAttendance}%</div>
            <p className="text-xs text-muted-foreground">
              {timeframe === "week" && "Weekly average"}
              {timeframe === "month" && "Monthly average"}
              {timeframe === "year" && "Yearly average"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              Across all departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This {timeframe === "week" ? "Week" : timeframe === "month" ? "Month" : "Year"} Late</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              Down from last {timeframe}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This {timeframe === "week" ? "Week" : timeframe === "month" ? "Month" : "Year"} Absent</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              {((2 / totalEmployees) * 100).toFixed(1)}% absence rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Breakdown - Line Chart */}
      <AttendanceLineChart timeframe={timeframe} timeframeData={timeframeData} />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Status Distribution - Radial */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Status Distribution</CardTitle>
            <CardDescription>Overall attendance status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center pb-0 pt-8">
            <ChartContainer
              config={{
                onTime: {
                  label: "On Time",
                  color: "hsl(142, 76%, 36%)",
                },
                late: {
                  label: "Late",
                  color: "hsl(48, 96%, 53%)",
                },
                earlyDep: {
                  label: "Early Dep.",
                  color: "hsl(221, 83%, 53%)",
                },
                absent: {
                  label: "Absent",
                  color: "hsl(0, 84%, 60%)",
                },
              }}
              className="mx-auto aspect-square h-[350px] w-full"
            >
              <RadialBarChart
                data={[
                  {
                    status: "attendance",
                    onTime: statusDistribution[0].value,
                    late: statusDistribution[1].value,
                    earlyDep: statusDistribution[2].value,
                    absent: statusDistribution[3].value,
                  },
                ]}
                endAngle={180}
                innerRadius={110}
                outerRadius={180}
              >
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 16}
                              className="fill-foreground text-2xl font-bold"
                            >
                              {averageAttendance}%
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 4}
                              className="fill-muted-foreground"
                            >
                              Attendance
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                </PolarRadiusAxis>
                <RadialBar
                  dataKey="onTime"
                  stackId="a"
                  cornerRadius={5}
                  fill="hsl(142, 76%, 36%)"
                  className="stroke-transparent stroke-2"
                />
                <RadialBar
                  dataKey="late"
                  stackId="a"
                  cornerRadius={5}
                  fill="hsl(48, 96%, 53%)"
                  className="stroke-transparent stroke-2"
                />
                <RadialBar
                  dataKey="earlyDep"
                  stackId="a"
                  cornerRadius={5}
                  fill="hsl(221, 83%, 53%)"
                  className="stroke-transparent stroke-2"
                />
                <RadialBar
                  dataKey="absent"
                  stackId="a"
                  cornerRadius={5}
                  fill="hsl(0, 84%, 60%)"
                  className="stroke-transparent stroke-2"
                />
              </RadialBarChart>
            </ChartContainer>
          </CardContent>
          <CardContent className="pt-4">
            <div className="flex justify-center gap-4 text-sm flex-wrap">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${item.color} shadow-sm`}
                  ></div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">({item.value}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Attendance - Radar */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-4">
            <CardTitle>Department Attendance</CardTitle>
            <CardDescription>Attendance rate by department</CardDescription>
          </CardHeader>
          <CardContent className="pb-0">
            <ChartContainer
              config={{
                attendance: {
                  label: "Attendance",
                  color: "hsl(221, 83%, 53%)",
                },
              }}
              className="mx-auto aspect-square h-[350px]"
            >
              <RadarChart
                data={departmentAttendance.map((item) => ({
                  department: item.dept,
                  attendance: item.percentage,
                }))}
              >
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <PolarAngleAxis dataKey="department" />
                <PolarGrid />
                <Radar
                  dataKey="attendance"
                  fill="hsl(221, 83%, 53%)"
                  fillOpacity={0.6}
                  stroke="hsl(221, 83%, 53%)"
                  strokeWidth={2}
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Chart configuration
const chartConfig = {
  onTime: {
    label: "On Time",
    color: "hsl(142, 76%, 36%)",
  },
  late: {
    label: "Late",
    color: "hsl(48, 96%, 53%)",
  },
  total: {
    label: "Total Attendance",
    color: "hsl(221, 83%, 53%)",
  },
} satisfies ChartConfig

type AttendanceLineChartProps = {
  timeframe: Timeframe
  timeframeData: Array<{ label: string; onTime: number; late: number; absent: number }>
}

function AttendanceLineChart({ timeframe, timeframeData }: AttendanceLineChartProps) {
  const [activeChart, setActiveChart] = useState<keyof typeof chartConfig>("total")

  // Calculate totals for each metric
  const totals = useMemo(
    () => ({
      onTime: timeframeData.reduce((acc, curr) => acc + curr.onTime, 0),
      late: timeframeData.reduce((acc, curr) => acc + curr.late, 0),
      total: timeframeData.reduce((acc, curr) => acc + curr.onTime + curr.late, 0),
    }),
    [timeframeData]
  )

  // Transform data for the chart
  const chartData = timeframeData.map((item) => ({
    label: item.label,
    onTime: item.onTime,
    late: item.late,
    total: item.onTime + item.late,
  }))

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>
            {timeframe === "week" && "Weekly Attendance Breakdown"}
            {timeframe === "month" && "Monthly Attendance Breakdown"}
            {timeframe === "year" && "Yearly Attendance Breakdown"}
          </CardTitle>
          <CardDescription>
            {timeframe === "week" && "Daily attendance summary for the current week"}
            {timeframe === "month" && "Weekly attendance summary for the current month"}
            {timeframe === "year" && "Monthly attendance summary for the current year"}
          </CardDescription>
        </div>
        <div className="flex">
          {(["onTime", "late", "total"] as const).map((key) => {
            return (
              <button
                key={key}
                data-active={activeChart === key}
                className="relative flex flex-1 flex-col justify-center gap-1 border-b border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-b-0 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(key)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[key].label}
                </span>
                <span className="text-lg font-bold leading-none sm:text-3xl">
                  {totals[key].toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="onTime"
              type="monotone"
              stroke={chartConfig.onTime.color}
              strokeWidth={2}
              dot={false}
              strokeOpacity={activeChart === "onTime" ? 1 : 0.5}
            />
            <Line
              dataKey="late"
              type="monotone"
              stroke={chartConfig.late.color}
              strokeWidth={2}
              dot={false}
              strokeOpacity={activeChart === "late" ? 1 : 0.5}
            />
            <Line
              dataKey="total"
              type="monotone"
              stroke={chartConfig.total.color}
              strokeWidth={2}
              dot={false}
              strokeOpacity={activeChart === "total" ? 1 : 0.5}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
