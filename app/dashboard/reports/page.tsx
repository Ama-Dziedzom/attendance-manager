"use client"

import { useState, useMemo, useEffect } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Label, PolarRadiusAxis, RadialBar, RadialBarChart, PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { format, addDays, subDays, addMonths, subMonths, addYears, subYears, startOfWeek, endOfWeek, isSameDay } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Users, UserCheck, Clock, TrendingUp, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { db } from "@/lib/supabase/db"

type Timeframe = "week" | "month" | "year"

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [reportData, setReportData] = useState<any[]>([])
  const [metrics, setMetrics] = useState({
    avgAttendance: 0,
    totalEmployees: 0,
    lateArrivals: 0,
    absentCount: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadReportData = async () => {
    try {
      setIsLoading(true)
      let start: Date, end: Date

      if (timeframe === "week") {
        start = startOfWeek(currentDate)
        end = endOfWeek(currentDate)
      } else if (timeframe === "month") {
        start = addDays(currentDate, -15) // Range for chart consistency
        end = addDays(currentDate, 15)
        // Adjust to month boundaries
        start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      } else {
        start = new Date(currentDate.getFullYear(), 0, 1)
        end = new Date(currentDate.getFullYear(), 11, 31)
      }

      const startDateStr = format(start, "yyyy-MM-dd")
      const endDateStr = format(end, "yyyy-MM-dd")

      const [summaryData, employees] = await Promise.all([
        db.dashboard.getSummaryRange(startDateStr, endDateStr),
        db.employees.getAll()
      ])

      const totalEmpCount = employees.length

      // Create a map for quick lookup
      const summaryMap = new Map(summaryData.map(s => [s.date, s]))

      // Generate all dates in the range to ensure a continuous chart
      const chartData: any[] = []
      let curr = start
      while (curr <= end) {
        const dateKey = format(curr, "yyyy-MM-dd")
        const summary = summaryMap.get(dateKey)

        chartData.push({
          label: format(curr, timeframe === "year" ? "MMM" : timeframe === "month" ? "d" : "EEE"),
          onTime: summary?.on_time_count || 0,
          late: summary?.late_count || 0,
          absent: summary?.absent_count ?? totalEmpCount,
          date: dateKey
        })

        if (timeframe === "year") {
          curr = addMonths(curr, 1)
        } else {
          curr = addDays(curr, 1)
        }
      }

      setReportData(chartData)

      // Calculate aggregated metrics
      const totalOnTime = summaryData.reduce((acc: number, curr: any) => acc + (curr.on_time_count || 0), 0)
      const totalLate = summaryData.reduce((acc: number, curr: any) => acc + (curr.late_count || 0), 0)
      const totalAbsent = summaryData.reduce((acc: number, curr: any) => acc + (curr.absent_count || 0), 0)

      const avgRate = summaryData.length > 0
        ? summaryData.reduce((acc: number, curr: any) => acc + (curr.attendance_rate || 0), 0) / summaryData.length
        : 0

      setMetrics({
        avgAttendance: Number(avgRate.toFixed(1)),
        totalEmployees: totalEmpCount,
        lateArrivals: totalLate,
        absentCount: totalAbsent
      })

    } catch (error) {
      console.error("Error loading report data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadReportData()
  }, [timeframe, currentDate])

  const navigate = (direction: "prev" | "next") => {
    if (timeframe === "week") {
      setCurrentDate(prev => direction === "prev" ? subDays(prev, 7) : addDays(prev, 7))
    } else if (timeframe === "month") {
      setCurrentDate(prev => direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1))
    } else {
      setCurrentDate(prev => direction === "prev" ? subYears(prev, 1) : addYears(prev, 1))
    }
  }

  const goToToday = () => setCurrentDate(new Date())

  const periodLabel = useMemo(() => {
    if (timeframe === "week") {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`
    } else if (timeframe === "month") {
      return format(currentDate, "MMMM yyyy")
    } else {
      return format(currentDate, "yyyy")
    }
  }, [currentDate, timeframe])

  // Status distribution
  const statusDistribution = useMemo(() => {
    const total = metrics.totalEmployees * reportData.length || 1
    const onTimeVal = reportData.reduce((acc, curr) => acc + curr.onTime, 0)
    const lateVal = reportData.reduce((acc, curr) => acc + curr.late, 0)
    const absentVal = reportData.reduce((acc, curr) => acc + curr.absent, 0)

    return [
      { name: "On Time", value: Math.round((onTimeVal / total) * 100), color: "bg-green-500" },
      { name: "Late", value: Math.round((lateVal / total) * 100), color: "bg-yellow-500" },
      { name: "Early Dep.", value: 0, color: "bg-blue-500" },
      { name: "Absent", value: Math.round((absentVal / total) * 100), color: "bg-red-500" },
    ]
  }, [reportData, metrics])

  // Department-wise attendance percentage (Mock for now as we don't have dept summary yet, but could be added)
  const departmentAttendance = [
    { dept: "Engineering", percentage: 95 },
    { dept: "Sales", percentage: 92 },
    { dept: "HR", percentage: 98 },
    { dept: "Marketing", percentage: 88 },
    { dept: "Finance", percentage: 96 },
  ]

  const totalEmployees = metrics.totalEmployees
  const averageAttendance = metrics.avgAttendance

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              {timeframe === "week" && "Weekly trends for "}
              {timeframe === "month" && "Monthly trends for "}
              {timeframe === "year" && "Yearly trends for "}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="link"
                    className="h-auto p-0 font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {periodLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => {
                      if (date) {
                        setCurrentDate(date)
                        setIsCalendarOpen(false)
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-md p-1 bg-muted/40">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("prev")}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className={cn(
                "h-8 px-2 text-xs font-semibold",
                isSameDay(currentDate, new Date()) && "bg-background shadow-xs hover:bg-background"
              )}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("next")}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
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
      <AttendanceLineChart dataframe={timeframe} timeframeData={reportData} periodLabel={periodLabel} />

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
              className="mx-auto aspect-square h-[250px] w-full"
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
                cx="50%"
                cy="70%"
                innerRadius={110}
                outerRadius={160}
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
              className="mx-auto aspect-square h-[250px]"
            >
              <RadarChart
                data={departmentAttendance.map((item) => ({
                  department: item.dept,
                  attendance: item.percentage,
                }))}
                margin={{ top: 10, bottom: 10, left: 30, right: 30 }}
                outerRadius={80}
              >
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <PolarAngleAxis dataKey="department" tick={{ fontSize: 11 }} />
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
  dataframe: Timeframe
  timeframeData: Array<{ label: string; onTime: number; late: number; absent: number }>
  periodLabel: string
}

function AttendanceLineChart({ dataframe: timeframe, timeframeData, periodLabel }: AttendanceLineChartProps) {
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
    <Card className="flex flex-col gap-0 p-0 overflow-hidden">
      <CardHeader className="flex flex-col items-stretch border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>
            {timeframe === "week" && "Weekly Attendance Breakdown"}
            {timeframe === "month" && "Monthly Attendance Breakdown"}
            {timeframe === "year" && "Yearly Attendance Breakdown"}
          </CardTitle>
          <CardDescription>
            Trend analysis for <span className="font-medium text-foreground">{periodLabel}</span>
          </CardDescription>
        </div>
        <div className="flex">
          {(["onTime", "late", "total"] as const).map((key) => {
            return (
              <button
                key={key}
                data-active={activeChart === key}
                className="relative flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(key)}
              >
                <span className="text-xs text-muted-foreground whitespace-nowrap">
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
            <YAxis hide padding={{ top: 30 }} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="onTime"
              type="monotone"
              stroke={chartConfig.onTime.color}
              strokeWidth={2}
              dot={true}
              strokeOpacity={activeChart === "onTime" ? 1 : 0.5}
            />
            <Line
              dataKey="late"
              type="monotone"
              stroke={chartConfig.late.color}
              strokeWidth={2}
              dot={true}
              strokeOpacity={activeChart === "late" ? 1 : 0.5}
            />
            <Line
              dataKey="total"
              type="monotone"
              stroke={chartConfig.total.color}
              strokeWidth={2}
              dot={true}
              strokeOpacity={activeChart === "total" ? 1 : 0.5}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
