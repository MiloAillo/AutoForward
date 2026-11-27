import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react"
import { cn } from "../../lib/format"

const control =
    "w-full rounded-[10px] border border-line-strong bg-surface-2 px-3 text-sm text-ink placeholder:text-faint " +
    "transition-colors duration-150 hover:border-[#3a4148] " +
    "focus:border-accent focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-accent)_25%,transparent)] " +
    "disabled:cursor-not-allowed disabled:opacity-50"

export function Field({
    label,
    hint,
    error,
    counter,
    children,
    htmlFor
}: {
    label: string
    hint?: string
    error?: string
    counter?: ReactNode
    children: ReactNode
    htmlFor?: string
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
                    {label}
                </label>
                {counter}
            </div>
            {children}
            {error ? (
                <p className="text-xs text-danger">{error}</p>
            ) : hint ? (
                <p className="text-xs text-faint">{hint}</p>
            ) : null}
        </div>
    )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn(control, "h-10", className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn(control, "min-h-24 resize-y py-2.5 leading-relaxed", className)} {...props} />
}
