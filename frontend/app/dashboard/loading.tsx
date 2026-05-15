import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
    return (
        <div className="p-8 space-y-10 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Filter Bar Skeleton */}
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 flex-1 max-w-sm" />
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-40" />
                </div>
            </div>

            {/* Content Area Skeleton (Table/Cards) */}
            <div className="space-y-4">
                <Skeleton className="h-[400px] w-full rounded-xl" />
            </div>
        </div>
    )
}
