import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "danger",
    onConfirm,
    onClose
}: {
    open: boolean
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: "danger" | "primary"
    onConfirm: () => Promise<void> | void
    onClose: () => void
}) {
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        setPending(false)
        setError(null)
    }, [open])

    const handleConfirm = async () => {
        setPending(true)
        setError(null)
        try {
            await onConfirm()
            onClose()
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Action failed")
        } finally {
            setPending(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={() => {
                if (pending) return
                onClose()
            }}
            title={title}
            description={description}
            size="sm"
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={tone === "danger" ? "danger" : "primary"}
                        size="sm"
                        onClick={handleConfirm}
                        loading={pending}
                    >
                        {confirmLabel}
                    </Button>
                </>
            }
        >
            <div className="flex items-start gap-2.5 rounded-[10px] border border-[color-mix(in_oklab,var(--color-warn)_28%,transparent)] bg-[color-mix(in_oklab,var(--color-warn)_8%,transparent)] px-3 py-2.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
                <p className="text-[12px] leading-relaxed text-muted">
                    This action takes effect immediately and cannot be undone from the dashboard.
                </p>
            </div>

            {error && (
                <p className="mt-3 text-[12px] leading-relaxed text-danger" role="alert">
                    {error}
                </p>
            )}
        </Modal>
    )
}
