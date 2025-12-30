"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { useFocusShortcut } from "@/hooks"
import { cn } from "@/lib/utils"

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Unique ID for the input (used for keyboard shortcut focus) */
    inputId: string
    /** Keyboard shortcut key (default: 'f' for Cmd/Ctrl+F) */
    shortcutKey?: string
    /** Additional class names for the container */
    containerClassName?: string
    /** Show keyboard shortcut hint */
    showShortcutHint?: boolean
}

/**
 * Reusable search input with built-in keyboard shortcut support
 * Replaces duplicate search input patterns across 4+ pages
 */
export function SearchInput({
    inputId,
    shortcutKey = 'f',
    containerClassName,
    showShortcutHint = false,
    className,
    placeholder = "Search",
    ...props
}: SearchInputProps) {
    // Register keyboard shortcut
    useFocusShortcut(inputId, shortcutKey)

    return (
        <div className={cn("relative flex-1 max-w-sm", containerClassName)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                id={inputId}
                placeholder={placeholder}
                className={cn(
                    "pl-9 bg-background border-input focus:ring-1 focus:ring-primary h-10",
                    showShortcutHint && "pr-12",
                    className
                )}
                {...props}
            />
            {showShortcutHint && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-50 select-none pointer-events-none">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">⌘</kbd>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">{shortcutKey.toUpperCase()}</kbd>
                </div>
            )}
        </div>
    )
}
