"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/supabase/db"
import { type AttendanceRecord, mapDbAttendanceToAttendance } from "@/lib/types"
import { StatusBadge } from "@/components/ui/status-badge"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { RealtimeChannel } from "@supabase/supabase-js"

interface AttendanceFeedProps {
  date?: string
}

export function AttendanceFeed({ date }: AttendanceFeedProps) {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let subscription: RealtimeChannel | null = null

    const loadData = async () => {
      try {
        setIsLoading(true)
        // Get today's attendance if no date provided
        const records = (date && date.trim() !== "")
          ? await db.attendance.getRecords(date, date)
          : await db.attendance.getToday()

        if (!Array.isArray(records)) {
          console.warn("Expected array from getRecords, got:", records)
          setAttendanceData([])
          return
        }

        // Map and Sort by clock in time (most recent first) and take top 5
        const sorted = records
          .map(mapDbAttendanceToAttendance)
          .filter(r => r.clockInTime) // Only show real clock-ins
          .sort((a, b) => {
            const timeA = a.clockInTime ? new Date(a.clockInTime).getTime() : 0
            const timeB = b.clockInTime ? new Date(b.clockInTime).getTime() : 0
            return timeB - timeA
          })
          .slice(0, 5)

        setAttendanceData(sorted)
      } catch (error: any) {
        console.error("Error loading attendance:", {
          message: error?.message || error,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          error
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Load initial data
    loadData()

    // Subscribe to real-time updates
    subscription = db.attendance.subscribeToUpdates((payload) => {
      console.log("📡 Real-time attendance update:", payload)
      // Re-fetch to get joined employee data, as real-time payload only has the raw record
      loadData()
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [date])

  if (isLoading) {
    return (
      <Card className="bg-white border-blue-100">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-blue-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-gray-600">Real-time Attendance Feed</CardTitle>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </CardHeader>
      <CardContent>
        {attendanceData.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <p>No attendance records for today yet.</p>
            <p className="text-xs mt-2">Waiting for clock-ins...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendanceData.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100 hover:border-blue-500 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-700">
                    {record.employeeName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {record.empId}
                  </p>
                  {record.department && (
                    <p className="text-xs text-muted-foreground">
                      {record.department}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Clocked in at {new Date(record.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {record.clockOutTime && (
                      <span className="ml-2">
                        • Out at {new Date(record.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={record.status} variant="pill" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
