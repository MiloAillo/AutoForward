import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react"
import { cn } from "../../lib/format"

type Tone = "success" | "error" | "info"

interface ToastItem {
    id: number
    title: string
    description?: string
    tone: Tone
}

interface ToastContextValue {
    toast: (input: { title: string; description?: string; tone?: Tone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS: Record<Tone, ReactNode> = {
    success: <CheckCircle2 className="size-4 text-ok" />,
    error: <AlertTriangle className="size-4 text-danger" />,
    info: <Info className="size-4 text-info" />
}

const BORDERS: Record<Tone, string> = {
    success: "border-[color-mix(in_oklab,var(--color-ok)_30%,var(--color-line))]",
    error: "border-[color-mix(in_oklab,var(--color-danger)_30%,var(--color-line))]",
    info: "border-[color-mix(in_oklab,var(--color-info)_30%,var(--color-line))]"
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([])

    const dismiss = useCallback((id: number) => {
        setItems((current) => current.filter((item) => item.id !== id))
    }, [])

    const toast = useCallback<ToastContextValue["toast"]>(
        ({ title, description, tone = "info" }) => {
            const id = nextId++
            setItems((current) => [...current.slice(-3), { id, title, description, tone }])
            window.setTimeout(() => dismiss(id), 4600)
        },
        [dismiss]
    )

    const value = useMemo(() => ({ toast }), [toast])

    return (
        <ToastContext.Provider value={value}>
            {children}
            {createPortal(
                <div
                    className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
                    aria-live="polite"
                    aria-atomic="false"
                >
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface-2/95 px-3.5 py-3 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9)] backdrop-blur animate-in",
                                BORDERS[item.tone]
                            )}
                        >
                            <span className="mt-0.5">{ICONS[item.tone]}</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-medium leading-5">{item.title}</p>
                                {item.description && (
                                    <p className="mt-0.5 break-words text-xs leading-5 text-muted">
                                        {item.description}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => dismiss(item.id)}
                                aria-label="Dismiss notification"
                                className="grid size-6 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface-3 hover:text-ink"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext)
    if (!context) throw new Error("useToast must be used inside ToastProvider")
    return context
}
