"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

export type SortOrder = "asc" | "desc"

export interface ColumnDef<T> {
    key: string
    header: string
    sortable?: boolean
    align?: 'left' | 'center' | 'right'
    className?: string
    headerClassName?: string
    render: (row: T, index: number) => React.ReactNode
}

export interface DataTableProps<T> {
    data: T[]
    columns: ColumnDef<T>[]
    sortKey?: string
    sortOrder?: SortOrder
    onSort?: (key: string) => void
    emptyMessage?: string
    isLoading?: boolean
    className?: string
    rowClassName?: string | ((row: T, index: number) => string)
    onRowClick?: (row: T) => void
}

// ============================================================================
// Sortable Header Button
// ============================================================================

interface SortableHeaderProps {
    children: React.ReactNode
    isActive: boolean
    order: SortOrder
    onClick: () => void
    align?: 'left' | 'center' | 'right'
}

function SortableHeader({ children, isActive, order, onClick, align = 'left' }: SortableHeaderProps) {
    const Icon = !isActive ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center hover:text-foreground transition-colors uppercase",
                align === 'right' && "ml-auto",
                align === 'center' && "mx-auto"
            )}
        >
            {children}
            <Icon className="ml-2 h-4 w-4" />
        </button>
    )
}

// ============================================================================
// Data Table Component
// ============================================================================

/**
 * Reusable data table component
 * Replaces 5+ duplicate table implementations across the codebase
 */
export function DataTable<T>({
    data,
    columns,
    sortKey,
    sortOrder = 'asc',
    onSort,
    emptyMessage = "No data available",
    isLoading = false,
    className,
    rowClassName,
    onRowClick,
}: DataTableProps<T>) {
    const getAlignClass = (align?: 'left' | 'center' | 'right') => {
        switch (align) {
            case 'center': return 'text-center'
            case 'right': return 'text-right'
            default: return 'text-left'
        }
    }

    return (
        <Card className={cn("bg-card border-border", className)}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-border">
                        <tr className="bg-muted/50">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={cn(
                                        "px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                                        getAlignClass(column.align),
                                        column.headerClassName
                                    )}
                                >
                                    {column.sortable && onSort ? (
                                        <SortableHeader
                                            isActive={sortKey === column.key}
                                            order={sortOrder}
                                            onClick={() => onSort(column.key)}
                                            align={column.align}
                                        >
                                            {column.header}
                                        </SortableHeader>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-6 py-12 text-center text-muted-foreground italic"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((row, index) => (
                                <tr
                                    key={index}
                                    className={cn(
                                        "hover:bg-muted/50 transition-colors",
                                        onRowClick && "cursor-pointer",
                                        typeof rowClassName === 'function' ? rowClassName(row, index) : rowClassName
                                    )}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className={cn(
                                                "px-6 py-4 text-sm",
                                                getAlignClass(column.align),
                                                column.className
                                            )}
                                        >
                                            {column.render(row, index)}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}

// ============================================================================
// Utility Hook for Sort State
// ============================================================================

/**
 * Hook for managing table sort state
 */
export function useTableSort<T extends string>(initialKey?: T, initialOrder: SortOrder = 'desc') {
    const [sortKey, setSortKey] = React.useState<T | undefined>(initialKey)
    const [sortOrder, setSortOrder] = React.useState<SortOrder>(initialOrder)

    const toggleSort = React.useCallback((key: T) => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortOrder('desc')
        }
    }, [sortKey])

    return { sortKey, sortOrder, toggleSort }
}
