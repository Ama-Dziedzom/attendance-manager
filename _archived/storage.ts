// Data storage utility using localStorage
// This can be replaced with a backend API later

export interface BiometricCredential {
  credentialId: string
  publicKey: string
  counter: number
  registeredAt: string
  deviceType: string
}

export interface Employee {
  id: string
  empId: string
  name: string
  department: string
  email: string
  agency: string
  timestamp: string
  hash: string
  fingerprintId?: string
  fingerprintRegistered?: boolean
  fingerprintTimestamp?: string
  biometricCredential?: BiometricCredential
}

export interface AttendanceRecord {
  employeeName: any
  id: string
  employeeId: string
  name: string
  department: string
  agency?: string
  date: string
  clockInTime: string
  clockOutTime?: string
  totalHours: number
  status: "On Time" | "Late" | "Early Departure" | "Absent"
  devices?: string[]
}

const STORAGE_KEYS = {
  EMPLOYEES: "attendance_employees",
  ATTENDANCE: "attendance_records",
}

// Employee storage
export const employeeStorage = {
  getAll(): Employee[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES)
    return data ? JSON.parse(data) : []
  },

  save(employee: Employee): void {
    if (typeof window === "undefined") return
    const employees = this.getAll()
    const existingIndex = employees.findIndex((e) => e.id === employee.id)
    if (existingIndex >= 0) {
      employees[existingIndex] = employee
    } else {
      employees.push(employee)
    }
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees))
  },

  saveAll(employees: Employee[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees))
  },

  getByEmpId(empId: string): Employee | undefined {
    return this.getAll().find((e) => e.empId === empId)
  },

  getByCredentialId(credentialId: string): Employee | undefined {
    return this.getAll().find((e) => e.biometricCredential?.credentialId === credentialId)
  },

  delete(id: string): void {
    if (typeof window === "undefined") return
    const employees = this.getAll().filter((e) => e.id !== id)
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees))
  },
}

// Attendance storage
export const attendanceStorage = {
  getAll(): AttendanceRecord[] {
    if (typeof window === "undefined") return []
    const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE)
    return data ? JSON.parse(data) : []
  },

  save(record: AttendanceRecord): void {
    if (typeof window === "undefined") return
    const records = this.getAll()
    const existingIndex = records.findIndex((r) => r.id === record.id)
    if (existingIndex >= 0) {
      records[existingIndex] = record
    } else {
      records.push(record)
    }
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records))
  },

  getByDate(date: string): AttendanceRecord[] {
    return this.getAll().filter((r) => r.date === date)
  },

  getByEmployeeId(employeeId: string, date?: string): AttendanceRecord[] {
    let records = this.getAll().filter((r) => r.employeeId === employeeId)
    if (date) {
      records = records.filter((r) => r.date === date)
    }
    return records
  },

  getTodayRecord(employeeId: string): AttendanceRecord | undefined {
    const today = new Date().toISOString().split("T")[0]
    return this.getByEmployeeId(employeeId, today)[0]
  },

  clockIn(employeeId: string, employeeName: string, department: string, agency?: string): AttendanceRecord {
    const today = new Date().toISOString().split("T")[0]
    const now = new Date().toISOString()

    // Check if already clocked in today
    const existing = this.getTodayRecord(employeeId)
    if (existing && !existing.clockOutTime) {
      return existing // Already clocked in
    }

    // Determine status based on clock-in time
    const clockInHour = new Date(now).getHours()
    const clockInMinute = new Date(now).getMinutes()
    const isLate = clockInHour > 9 || (clockInHour === 9 && clockInMinute > 0)
    const status: "On Time" | "Late" = isLate ? "Late" : "On Time"

    const record: AttendanceRecord = {
      id: `att_${employeeId}_${Date.now()}`,
      employeeId,
      name: employeeName,
      department,
      agency: agency,
      date: today,
      clockInTime: now,
      totalHours: 0,
      status,
    }

    this.save(record)
    return record
  },

  clockOut(employeeId: string): AttendanceRecord | null {
    const record = this.getTodayRecord(employeeId)
    if (!record || record.clockOutTime) {
      return null // Not clocked in or already clocked out
    }

    const now = new Date().toISOString()
    const clockInTime = new Date(record.clockInTime)
    const clockOutTime = new Date(now)
    const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

    // Determine if early departure (before 5 PM)
    const isEarlyDeparture = clockOutTime.getHours() < 17
    let status = record.status
    if (isEarlyDeparture && status === "On Time") {
      status = "Early Departure"
    }

    record.clockOutTime = now
    record.totalHours = Math.max(0, totalHours)
    record.status = status

    this.save(record)
    return record
  },
}