import type { ReactNode } from "react"
import { cn } from "../../lib/format"

export function Skeleton({ className }: { className?: string }) {
    return <div className={cn("shimmer rounded-md bg-surface-2", className)} />
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    className
}: {
    icon?: ReactNode
    title: string
    description?: string
    action?: ReactNode
    className?: string
}) {
    return (
        <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
            {icon && (
                <div className="mb-4 grid size-11 place-items-center rounded-xl border border-line bg-surface-2 text-faint">
                    {icon}
                </div>
            )}
            <p className="text-sm font-medium text-ink">{title}</p>
            {description && (
                <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-faint">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}
