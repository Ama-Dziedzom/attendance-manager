// Common employee type used throughout the attendance manager app
export interface Employee {
    id: string
    empId: string
    name: string
    department: string
    email: string
    agency: string
    timestamp: string
    hash: string
    qrCode?: string
}
