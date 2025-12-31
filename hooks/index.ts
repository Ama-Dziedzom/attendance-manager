/**
 * Consolidated Hooks
 * All custom hooks in a single file
 */

import { useState, useEffect, useCallback, useRef } from 'react'

// ============================================================================
// useDataFetch - Generic data fetching with loading states
// ============================================================================

interface UseDataFetchOptions<T> {
    initialData?: T
    fetchOnMount?: boolean
    refreshInterval?: number
    dependencies?: any[]
    onError?: (error: Error) => void
}

interface UseDataFetchResult<T> {
    data: T
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<void>
    setData: React.Dispatch<React.SetStateAction<T>>
}

export function useDataFetch<T>(
    fetchFn: () => Promise<T>,
    options: UseDataFetchOptions<T> = {}
): UseDataFetchResult<T> {
    const {
        initialData = null as T,
        fetchOnMount = true,
        refreshInterval = 0,
        dependencies = [],
        onError,
    } = options

    const [data, setData] = useState<T>(initialData)
    const [isLoading, setIsLoading] = useState(fetchOnMount)
    const [error, setError] = useState<Error | null>(null)
    const isMountedRef = useRef(true)

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            const result = await fetchFn()
            if (isMountedRef.current) setData(result)
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err))
            if (isMountedRef.current) {
                setError(error)
                onError?.(error)
                console.error('Data fetch error:', error)
            }
        } finally {
            if (isMountedRef.current) setIsLoading(false)
        }
    }, [fetchFn, onError])

    useEffect(() => {
        if (fetchOnMount) fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...dependencies, fetchOnMount])

    useEffect(() => {
        if (refreshInterval <= 0) return
        const intervalId = setInterval(fetchData, refreshInterval)
        return () => clearInterval(intervalId)
    }, [fetchData, refreshInterval])

    useEffect(() => {
        return () => { isMountedRef.current = false }
    }, [])

    return { data, isLoading, error, refetch: fetchData, setData }
}

// ============================================================================
// useKeyboardShortcut - Keyboard event handling
// ============================================================================

type ModifierKey = 'ctrl' | 'meta' | 'alt' | 'shift'

interface ShortcutConfig {
    key: string
    modifiers?: ModifierKey[]
    action: () => void
    preventDefault?: boolean
}

export function useKeyboardShortcut(config: ShortcutConfig | ShortcutConfig[]): void {
    const shortcuts = Array.isArray(config) ? config : [config]

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        for (const shortcut of shortcuts) {
            if (!shortcut) continue
            const { key, modifiers = [], action, preventDefault = true } = shortcut

            if (!event.key || typeof event.key !== 'string' || !key || typeof key !== 'string') continue
            if (event.key.toLowerCase() !== key.toLowerCase()) continue

            const safeModifiers = Array.isArray(modifiers) ? modifiers : []
            const hasCtrlOrMeta = safeModifiers.includes('ctrl') || safeModifiers.includes('meta')
            if (hasCtrlOrMeta && !(event.ctrlKey || event.metaKey)) continue

            const otherModifiers = safeModifiers.filter(m => m !== 'ctrl' && m !== 'meta')
            const modifierMap: Record<ModifierKey, boolean> = {
                ctrl: event.ctrlKey, meta: event.metaKey, alt: event.altKey, shift: event.shiftKey,
            }
            if (!otherModifiers.every(mod => modifierMap[mod])) continue

            if (preventDefault) event.preventDefault()
            if (typeof action === 'function') action()
            break
        }
    }, [shortcuts])

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])
}

export function useFocusShortcut(elementId: string, key = 'f'): void {
    useKeyboardShortcut({
        key,
        modifiers: ['ctrl', 'meta'],
        action: () => document.getElementById(elementId)?.focus(),
    })
}

// ============================================================================
// useTableSort - Table sorting state management
// ============================================================================

export type SortOrder = 'asc' | 'desc'

export function useTableSort<T extends string>(initialKey?: T, initialOrder: SortOrder = 'desc') {
    const [sortKey, setSortKey] = useState<T | undefined>(initialKey)
    const [sortOrder, setSortOrder] = useState<SortOrder>(initialOrder)

    const toggleSort = useCallback((key: T) => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortOrder('desc')
        }
    }, [sortKey])

    return { sortKey, sortOrder, toggleSort }
}

// ============================================================================
// Re-export useSessionTimeout - Session timeout with auto-logout
// ============================================================================

export { useSessionTimeout } from './use-session-timeout'

