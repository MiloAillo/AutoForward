import type { ReactNode } from "react"
import { cn } from "../../lib/format"

type Tone = "neutral" | "ok" | "warn" | "danger" | "accent" | "info"

const TONES: Record<Tone, string> = {
    neutral: "border-line bg-surface-2 text-muted",
    ok: "border-[color-mix(in_oklab,var(--color-ok)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-ok)_12%,transparent)] text-ok",
    warn: "border-[color-mix(in_oklab,var(--color-warn)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] text-warn",
    danger:
        "border-[color-mix(in_oklab,var(--color-danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)] text-danger",
    accent:
        "border-[color-mix(in_oklab,var(--color-accent)_38%,transparent)] bg-[color-mix(in_oklab,var(--color-accent)_13%,transparent)] text-accent-soft",
    info: "border-[color-mix(in_oklab,var(--color-info)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-info)_12%,transparent)] text-info"
}

export function Badge({
    tone = "neutral",
    className,
    children
}: {
    tone?: Tone
    className?: string
    children: ReactNode
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5",
                TONES[tone],
                className
            )}
        >
            {children}
        </span>
    )
}

export function Dot({ tone = "neutral", pulse }: { tone?: Tone; pulse?: boolean }) {
    const colors: Record<Tone, string> = {
        neutral: "bg-faint",
        ok: "bg-ok",
        warn: "bg-warn",
        danger: "bg-danger",
        accent: "bg-accent",
        info: "bg-info"
    }

    return (
        <span className="relative inline-flex size-2">
            {pulse && (
                <span
                    className={cn("absolute inset-0 animate-ping rounded-full opacity-60", colors[tone])}
                />
            )}
            <span className={cn("relative inline-flex size-2 rounded-full", colors[tone])} />
        </span>
    )
}
