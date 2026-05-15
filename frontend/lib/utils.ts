import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

// ============================================================================
// TAILWIND UTILITIES
// ============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

export function capitalize(str: string | null | undefined): string {
  if (!str || str.toLowerCase() === 'n/a') return 'N/A'
  return str
    .replace(/_/g, ' ')
    .split(/ +/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`)
}

// ============================================================================
// DATE/TIME FORMATTING
// ============================================================================

export const DATE_FORMATS = {
  DISPLAY: 'MMM d, yyyy',
  DISPLAY_FULL: 'MMMM dd, yyyy',
  API: 'yyyy-MM-dd',
  TIME: 'h:mm a',
  TIME_24: 'HH:mm',
  DATETIME: 'MMM d, yyyy h:mm a',
} as const

export function formatDate(date: string | Date | null | undefined, pattern = DATE_FORMATS.DISPLAY): string {
  if (!date) return 'N/A'
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(dateObj)) return 'Invalid Date'
  return format(dateObj, pattern)
}

export function formatTime(datetime: string | Date | null | undefined, use24Hour = false): string {
  if (!datetime) return '--:--'
  const dateObj = typeof datetime === 'string' ? parseISO(datetime) : datetime
  if (!isValid(dateObj)) return '--:--'
  return format(dateObj, use24Hour ? DATE_FORMATS.TIME_24 : DATE_FORMATS.TIME)
}

export function formatTimeLocale(datetime: string | null | undefined): string {
  if (!datetime) return '--:--'
  try {
    return new Date(datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return '--:--'
  }
}

export function formatHours(hours: number | null | undefined, decimals = 1): string {
  if (hours === null || hours === undefined) return '0.0h'
  return `${hours.toFixed(decimals)}h`
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDateRange(start: Date, end: Date): string {
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()
  if (startYear === endYear) {
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
  }
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ATTENDANCE_STATUS = {
  on_time: { label: 'On Time', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  late: { label: 'Late', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  early_departure: { label: 'Early Departure', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  half_day: { label: 'Half Day', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
  absent: { label: 'Absent', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
} as const

export type AttendanceStatusKey = keyof typeof ATTENDANCE_STATUS

export const USER_ROLES = {
  super_admin: { label: 'Super Admin', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  it: { label: 'IT Admin', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
  hr: { label: 'HR Manager', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  front_desk: { label: 'Front Desk', badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
} as const

export const BIOMETRIC_STATUS = {
  registered: { label: 'Registered', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  not_registered: { label: 'Not Registered', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
} as const

export const CHART_COLORS = {
  onTime: 'hsl(142, 76%, 36%)',
  late: 'hsl(48, 96%, 53%)',
  absent: 'hsl(0, 84%, 60%)',
  earlyDep: 'hsl(221, 83%, 53%)',
  total: 'hsl(221, 83%, 53%)',
} as const

export const REFRESH_INTERVALS = {
  DASHBOARD: 30000,
  ATTENDANCE_FEED: 10000,
  EMPLOYEES: 30000,
} as const

export const STATUS_COLORS = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  error: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  info: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  neutral: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
} as const

// ============================================================================
// STATUS HELPERS
// ============================================================================

export function getStatusLabel(status: string): string {
  return ATTENDANCE_STATUS[status as AttendanceStatusKey]?.label || status
}

export function getStatusBadgeClass(status: string): string {
  return ATTENDANCE_STATUS[status as AttendanceStatusKey]?.badgeClass || STATUS_COLORS.neutral
}

// ============================================================================
// GENERAL UTILITIES
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function generateId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) groups[groupKey] = []
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
