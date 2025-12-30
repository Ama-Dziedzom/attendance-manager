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
  on_time: { label: 'On Time', color: 'bg-green-500', badgeClass: 'bg-green-50 text-green-700 border-green-200' },
  late: { label: 'Late', color: 'bg-yellow-500', badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  early_departure: { label: 'Early Departure', color: 'bg-blue-500', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  half_day: { label: 'Half Day', color: 'bg-purple-500', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  absent: { label: 'Absent', color: 'bg-red-500', badgeClass: 'bg-red-50 text-red-700 border-red-200' },
} as const

export type AttendanceStatusKey = keyof typeof ATTENDANCE_STATUS

export const USER_ROLES = {
  it_admin: { label: 'IT Admin', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  hr_manager: { label: 'HR Manager', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
} as const

export const BIOMETRIC_STATUS = {
  registered: { label: 'Registered', badgeClass: 'bg-green-100 text-green-700 hover:bg-green-200' },
  not_registered: { label: 'Not Registered', badgeClass: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
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

// ============================================================================
// STATUS HELPERS
// ============================================================================

export function getStatusLabel(status: string): string {
  return ATTENDANCE_STATUS[status as AttendanceStatusKey]?.label || status
}

export function getStatusBadgeClass(status: string): string {
  return ATTENDANCE_STATUS[status as AttendanceStatusKey]?.badgeClass || 'bg-gray-50 text-gray-700 border-gray-200'
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
