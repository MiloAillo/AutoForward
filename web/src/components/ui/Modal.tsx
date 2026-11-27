import { useEffect, useId, useRef } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "../../lib/format"

const FOCUSABLE =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = "md"
}: {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children: ReactNode
    footer?: ReactNode
    size?: "sm" | "md" | "lg"
}) {
    const dialogRef = useRef<HTMLDivElement>(null)
    const restoreRef = useRef<HTMLElement | null>(null)
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    const titleId = useId()
    const descriptionId = useId()

    useEffect(() => {
        if (!open) return

        restoreRef.current = document.activeElement as HTMLElement | null
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = "hidden"

        const timer = window.setTimeout(() => {
            const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
            first?.focus()
        }, 0)

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault()
                onCloseRef.current()
                return
            }

            if (event.key !== "Tab" || !dialogRef.current) return

            const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
                (item) => item.offsetParent !== null
            )
            if (items.length === 0) return

            const first = items[0]
            const last = items[items.length - 1]
            const active = document.activeElement

            if (event.shiftKey && active === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && active === last) {
                event.preventDefault()
                first.focus()
            }
        }

        document.addEventListener("keydown", onKeyDown)

        return () => {
            window.clearTimeout(timer)
            document.removeEventListener("keydown", onKeyDown)
            document.body.style.overflow = previousOverflow
            restoreRef.current?.focus?.()
        }
    }, [open])

    if (!open) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
            <div
                className="fixed inset-0 bg-[#04050699] backdrop-blur-[2px] animate-in"
                onClick={onClose}
                aria-hidden
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                className={cn(
                    "relative my-auto w-full animate-pop rounded-2xl border border-line-strong bg-surface shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)]",
                    size === "sm" && "max-w-md",
                    size === "md" && "max-w-xl",
                    size === "lg" && "max-w-2xl"
                )}
            >
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                    <div className="space-y-1">
                        <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em]">
                            {title}
                        </h2>
                        {description && (
                            <p id={descriptionId} className="text-[13px] leading-relaxed text-muted">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="px-5 py-4">{children}</div>

                {footer && (
                    <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2/40 px-5 py-3.5">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
}
