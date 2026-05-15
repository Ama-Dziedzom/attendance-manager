/**
 * Comprehensive Export Utilities for Attendance Reports
 * Generates detailed analytical reports in Excel and PDF formats
 * Matches professional report format with charts, analysis, and insights
 */

import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format, parseISO } from 'date-fns'
import type { AttendanceRecord } from './types'

// =====================================================================================
// TYPES & INTERFACES
// =====================================================================================

export interface ExportOptions {
    format: 'excel' | 'pdf'
    filename?: string
    dateRange?: { start: Date; end: Date }
}

export interface TimeCategory {
    name: string
    label: string
    count: number
    percentage: number
}

export interface EmployeeAttendanceDetail {
    name: string
    early: number
    l1: number       // 8:31AM-9AM
    l2: number       // 9:01AM-10AM
    l3: number       // After 10AM
    lateTotal: number
    present: number
    absent: number
}

export interface AbsenceDetail {
    name: string
    days: number
    reason: string
}

// =====================================================================================
// TIME CATEGORIZATION
// =====================================================================================

/**
 * Categorize clock-in time into time buckets
 * EARLY = Before 8:30 AM
 * L1 = 8:31AM - 9:00AM
 * L2 = 9:01AM - 10:00AM
 * L3 = After 10:00AM
 */
function categorizeClockInTime(clockInTime: string | null): string {
    if (!clockInTime) return 'absent'

    try {
        const time = new Date(clockInTime)
        const hours = time.getHours()
        const minutes = time.getMinutes()
        const totalMinutes = hours * 60 + minutes

        const time830 = 8 * 60 + 30   // 510 minutes
        const time900 = 9 * 60          // 540 minutes
        const time1000 = 10 * 60        // 600 minutes

        if (totalMinutes <= time830) return 'early'
        if (totalMinutes <= time900) return 'l1'
        if (totalMinutes <= time1000) return 'l2'
        return 'l3'
    } catch (error) {
        return 'absent'
    }
}

/**
 * Calculate time category statistics
 */
function calculateTimeCategories(records: AttendanceRecord[]): TimeCategory[] {
    const presentRecords = records.filter(r => r.status !== 'absent' && r.clockInTime)
    const total = presentRecords.length

    const categories = {
        early: 0,
        l1: 0,
        l2: 0,
        l3: 0
    }

    presentRecords.forEach(record => {
        const category = categorizeClockInTime(record.clockInTime)
        if (category !== 'absent') {
            categories[category as keyof typeof categories]++
        }
    })

    return [
        {
            name: 'early',
            label: 'EARLY',
            count: categories.early,
            percentage: total > 0 ? Math.round((categories.early / total) * 100) : 0
        },
        {
            name: 'l1',
            label: 'L1(8:31AM-9AM)',
            count: categories.l1,
            percentage: total > 0 ? Math.round((categories.l1 / total) * 100) : 0
        },
        {
            name: 'l2',
            label: 'L2(9:01AM-10AM)',
            count: categories.l2,
            percentage: total > 0 ? Math.round((categories.l2 / total) * 100) : 0
        },
        {
            name: 'l3',
            label: 'L3(AFTER 10AM)',
            count: categories.l3,
            percentage: total > 0 ? Math.round((categories.l3 / total) * 100) : 0
        }
    ]
}

/**
 * Calculate detailed employee attendance analysis
 */
function calculateEmployeeDetails(records: AttendanceRecord[]): EmployeeAttendanceDetail[] {
    const employeeMap = new Map<string, AttendanceRecord[]>()

    // Group records by employee
    records.forEach(record => {
        const key = record.employeeId || record.empId
        if (!employeeMap.has(key)) {
            employeeMap.set(key, [])
        }
        employeeMap.get(key)!.push(record)
    })

    const details: EmployeeAttendanceDetail[] = []

    employeeMap.forEach((empRecords, employeeId) => {
        const name = empRecords[0]?.employeeName || employeeId

        let early = 0, l1 = 0, l2 = 0, l3 = 0
        let present = 0, absent = 0

        empRecords.forEach(record => {
            if (record.status === 'absent') {
                absent++
            } else {
                present++
                const category = categorizeClockInTime(record.clockInTime)
                if (category === 'early') early++
                else if (category === 'l1') l1++
                else if (category === 'l2') l2++
                else if (category === 'l3') l3++
            }
        })

        const lateTotal = l1 + l2 + l3

        details.push({
            name,
            early,
            l1,
            l2,
            l3,
            lateTotal,
            present,
            absent
        })
    })

    return details.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Calculate absence details (simplified - would need absence_reason field in DB)
 */
function calculateAbsenceDetails(records: AttendanceRecord[]): AbsenceDetail[] {
    const employeeMap = new Map<string, number>()

    records.filter(r => r.status === 'absent').forEach(record => {
        const key = record.employeeId || record.empId
        employeeMap.set(key, (employeeMap.get(key) || 0) + 1)
    })

    const absences: AbsenceDetail[] = []

    employeeMap.forEach((days, employeeId) => {
        const record = records.find(r => (r.employeeId || r.empId) === employeeId)
        if (record && days > 0) {
            absences.push({
                name: record.employeeName || employeeId,
                days,
                reason: 'To be tracked' // Placeholder - would come from DB
            })
        }
    })

    return absences.sort((a, b) => b.days - a.days)
}

// =====================================================================================
// EXCEL EXPORT - COMPREHENSIVE FORMAT
// =====================================================================================

export function exportToExcel(
    records: AttendanceRecord[],
    options: Partial<ExportOptions> = {}
): void {
    const filename = options.filename || `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    const workbook = XLSX.utils.book_new()

    // Calculate all statistics
    const timeCategories = calculateTimeCategories(records)
    const employeeDetails = calculateEmployeeDetails(records)
    const absenceDetails = calculateAbsenceDetails(records)

    // ============ SHEET 1: ARRIVAL TIME ANALYSIS ============
    const arrivalData = [
        ['TIME CATEGORY', 'COUNT', 'PERCENTAGE'],
        ...timeCategories.map(cat => [cat.label, cat.count, `${cat.percentage}%`])
    ]

    const arrivalSheet = XLSX.utils.aoa_to_sheet(arrivalData)
    arrivalSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, arrivalSheet, 'Arrival Time Analysis')

    // ============ SHEET 2: DETAILED ATTENDANCE TABLE ============
    const detailedData = [
        ['TEAM MEMBERS', 'EARLY', 'L1(8:31AM-9AM)', 'L2(9:01AM-10AM)', 'L3(AFTER 10AM)', 'LATE TOTAL', 'PRESENT', 'ABSENT'],
        ...employeeDetails.map(emp => [
            emp.name,
            emp.early,
            emp.l1,
            emp.l2,
            emp.l3,
            emp.lateTotal,
            emp.present,
            emp.absent
        ])
    ]

    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData)
    detailedSheet['!cols'] = [
        { wch: 30 }, // Name
        { wch: 10 }, // Early
        { wch: 18 }, // L1
        { wch: 18 }, // L2
        { wch: 18 }, // L3
        { wch: 12 }, // Late Total
        { wch: 10 }, // Present
        { wch: 10 }  // Absent
    ]
    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Analysis')

    // ============ SHEET 3: ABSENCE TRACKING ============
    const absenceData = [
        ['TEAM MEMBERS', 'NUMBER OF DAYS', 'REASON FOR ABSENTEEISM'],
        ...absenceDetails.map(abs => [abs.name, abs.days, abs.reason])
    ]

    const absenceSheet = XLSX.utils.aoa_to_sheet(absenceData)
    absenceSheet['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 50 }]
    XLSX.utils.book_append_sheet(workbook, absenceSheet, 'Absence Tracking')

    // ============ SHEET 4: KEY INSIGHTS ============
    const totalPresent = employeeDetails.reduce((sum, emp) => sum + emp.present, 0)
    const totalRecords = totalPresent + absenceDetails.reduce((sum, abs) => sum + abs.days, 0)
    const lateCount = employeeDetails.reduce((sum, emp) => sum + emp.lateTotal, 0)
    const latePercentage = totalPresent > 0 ? ((lateCount / totalPresent) * 100).toFixed(1) : '0'

    const insightsData = [
        ['KEY METRIC', 'VALUE'],
        ['Total Attendance Records', totalRecords],
        ['Total Present', totalPresent],
        ['Total Absent', absenceDetails.reduce((sum, abs) => sum + abs.days, 0)],
        ['Employees Arriving Early', timeCategories.find(c => c.name === 'early')?.count || 0],
        ['Employees Arriving Late', lateCount],
        ['Late Arrival Percentage', `${latePercentage}%`],
        ['Punctuality Rate', `${(100 - parseFloat(latePercentage)).toFixed(1)}%`],
        [''],
        ['TOP INSIGHTS', ''],
        [`${latePercentage}% of team members reported after 8:30am`, ''],
        [`${timeCategories.find(c => c.name === 'early')?.percentage || 0}% arrived early (before 8:30am)`, ''],
        [`${absenceDetails.length} employees had absences during this period`, '']
    ]

    const insightsSheet = XLSX.utils.aoa_to_sheet(insightsData)
    insightsSheet['!cols'] = [{ wch: 50 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, insightsSheet, 'Key Insights')

    // Write file
    XLSX.writeFile(workbook, filename)
}

// =====================================================================================
// PDF EXPORT - COMPREHENSIVE FORMAT WITH CHARTS
// =====================================================================================

export function exportToPDF(
    records: AttendanceRecord[],
    options: Partial<ExportOptions> = {}
): void {
    const filename = options.filename || `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`
    const pdf = new jsPDF('portrait', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Calculate statistics
    const timeCategories = calculateTimeCategories(records)
    const employeeDetails = calculateEmployeeDetails(records)
    const absenceDetails = calculateAbsenceDetails(records)

    let yPos = 20

    // ============ TITLE ============
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('ATTENDANCE WEEKLY REPORT', pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    if (options.dateRange) {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        const dateStr = `${format(options.dateRange.start, 'do')} - ${format(options.dateRange.end, 'do MMMM yyyy')}`
        pdf.text(dateStr.toUpperCase(), pageWidth / 2, yPos, { align: 'center' })
        yPos += 15
    } else {
        yPos += 10
    }

    // ============ SECTION 1: GRAPHICAL PRESENTATION ============
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('1. A GRAPHICAL PRESENTATION INDICATING TEAM MEMBERS\' TIME OF ARRIVAL', 14, yPos)
    yPos += 8

    // Simple text representation of chart data (we can't easily draw pie charts in jsPDF without canvas)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`CHART 1: ARRIVAL TIMES OF EMPLOYEES FOR ${options.dateRange ? format(options.dateRange.start, 'do').toUpperCase() + ' TO ' + format(options.dateRange.end, 'do MMMM').toUpperCase() : 'REPORTING PERIOD'}`, 14, yPos)
    yPos += 8

    // Chart data as table
    const chartData = timeCategories.map(cat => [cat.label, cat.count.toString(), `${cat.percentage}%`])

    autoTable(pdf, {
        startY: yPos,
        head: [['TIME CATEGORY', 'COUNT', 'PERCENTAGE']],
        body: chartData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 14, right: 14 }
    })

    yPos = (pdf as any).lastAutoTable.finalY + 10

    // Key insight
    const latePercentage = timeCategories.slice(1).reduce((sum, cat) => sum + cat.percentage, 0)
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${latePercentage} percent of team members reported after 8:30am.`, 14, yPos)
    yPos += 12

    // ============ SECTION 2: DETAILED ANALYSIS TABLE ============
    if (yPos + 60 > pageHeight - 20) {
        pdf.addPage()
        yPos = 20
    }

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    const tableTitle = 'TABLE 1: A TABLE GIVING ANALYSIS ON DAYS PRESENT, INDICATING DAYS LATE\nAND DAYS EARLY'
    const titleLines = pdf.splitTextToSize(tableTitle, pageWidth - 28)
    pdf.text(titleLines, 14, yPos)
    yPos += 12

    // Detailed employee table
    const employeeTableData = employeeDetails.map(emp => [
        emp.name,
        emp.early.toString(),
        emp.l1.toString(),
        emp.l2.toString(),
        emp.l3.toString(),
        emp.lateTotal.toString(),
        emp.present.toString(),
        emp.absent.toString()
    ])

    autoTable(pdf, {
        startY: yPos,
        head: [['TEAM MEMBERS', 'EARLY', 'L1(8:31AM-\n9AM)', 'L2(9:01AM-\n10AM)', 'L3(AFTER\n10AM)', 'LATE\nTOTAL', 'PRESENT', 'ABSENT']],
        body: employeeTableData,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineWidth: 0.5,
            lineColor: [0, 0, 0],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: { fontSize: 7, cellPadding: 2, lineWidth: 0.1, lineColor: [0, 0, 0] },
        columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 15, halign: 'center' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 15, halign: 'center' },
            6: { cellWidth: 18, halign: 'center' },
            7: { cellWidth: 18, halign: 'center' },
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
            // Add page numbers
            const pageCount = (pdf as any).internal.getNumberOfPages()
            const currentPage = (pdf as any).internal.getCurrentPageInfo().pageNumber
            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'normal')
            pdf.text(`Page ${currentPage} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
        }
    })

    yPos = (pdf as any).lastAutoTable.finalY + 12

    // ============ SECTION 3: ABSENCE TRACKING ============
    if (absenceDetails.length > 0) {
        if (yPos + 40 > pageHeight - 20) {
            pdf.addPage()
            yPos = 20
        }

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text('4. TABLE 2: TEAM MEMBERS ABSENT IN THE WEEK', 14, yPos)
        yPos += 8

        const absenceTableData = absenceDetails.map(abs => [
            abs.name,
            abs.days.toString(),
            abs.reason
        ])

        autoTable(pdf, {
            startY: yPos,
            head: [['TEAM MEMBERS', 'NUMBER OF DAYS', 'REASON FOR ABSENTEEISM']],
            body: absenceTableData,
            theme: 'grid',
            headStyles: {
                fillColor: [255, 255, 255],
                textColor: [0, 0, 0],
                lineWidth: 0.5,
                lineColor: [0, 0, 0],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'center'
            },
            styles: { fontSize: 8, cellPadding: 3, lineWidth: 0.1, lineColor: [0, 0, 0] },
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold' },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 80 },
            },
            margin: { left: 14, right: 14 }
        })
    }

    // Add footers to all pages
    const totalPages = (pdf as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'italic')
        pdf.text(`Generated: ${format(new Date(), 'PPP')}`, 14, pageHeight - 10)
        pdf.setFont('helvetica', 'normal')
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    }

    // Save PDF
    pdf.save(filename)
}

// =====================================================================================
// MAIN EXPORT FUNCTION
// =====================================================================================

export function exportAttendanceReport(
    records: AttendanceRecord[],
    options: ExportOptions
): void {
    if (!records || records.length === 0) {
        throw new Error('No records to export')
    }

    switch (options.format) {
        case 'excel':
            exportToExcel(records, options)
            break
        case 'pdf':
            exportToPDF(records, options)
            break
        default:
            throw new Error(`Unsupported export format: ${options.format}`)
    }
}
