import { forwardRef } from "react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/format"

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success"
type Size = "sm" | "md" | "icon"

const VARIANTS: Record<Variant, string> = {
    primary:
        "bg-accent text-[#0a0a0b] hover:bg-accent-soft shadow-[0_1px_0_rgba(255,255,255,0.16)_inset,0_8px_24px_-12px_rgba(249,115,22,0.7)]",
    secondary:
        "bg-surface-2 text-ink border border-line-strong hover:bg-surface-3 hover:border-line-strong",
    ghost: "text-muted hover:text-ink hover:bg-surface-2",
    danger:
        "bg-transparent text-danger border border-[color-mix(in_oklab,var(--color-danger)_45%,transparent)] hover:bg-[color-mix(in_oklab,var(--color-danger)_14%,transparent)]",
    success:
        "bg-ok text-[#052e1b] hover:bg-[#4ade80] shadow-[0_8px_24px_-12px_rgba(52,211,153,0.7)]"
}

const SIZES: Record<Size, string> = {
    sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
    md: "h-10 px-4 text-sm gap-2 rounded-[10px]",
    icon: "h-9 w-9 rounded-lg justify-center"
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant
    size?: Size
    loading?: boolean
    icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { className, variant = "secondary", size = "md", loading, icon, children, disabled, ...props },
    ref
) {
    return (
        <button
            ref={ref}
            disabled={disabled || loading}
            className={cn(
                "inline-flex select-none items-center justify-center font-medium transition-colors duration-150",
                "disabled:pointer-events-none disabled:opacity-45",
                VARIANTS[variant],
                SIZES[size],
                className
            )}
            {...props}
        >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
            {children}
        </button>
    )
})
