import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Check } from "lucide-react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { useToast } from "../ui/Toast"
import { botApi } from "../../lib/api"
import { cn } from "../../lib/format"
import type { Forward, Rule } from "../../types"

export function LinkRuleModal({
    open,
    onClose,
    forward,
    rules,
    onLinked
}: {
    open: boolean
    onClose: () => void
    forward: Forward | null
    rules: Rule[]
    onLinked: () => void
}) {
    const { toast } = useToast()
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const available = useMemo(() => {
        if (!forward) return []
        const linked = new Set(forward.rules.map((rule) => rule.id))
        return rules.filter((rule) => !linked.has(rule.id))
    }, [forward, rules])

    useEffect(() => {
        if (!open) return
        setSelectedId(null)
        setError(null)
        setSubmitting(false)
    }, [open])

    const submit = async () => {
        if (!forward || selectedId === null) return
        setSubmitting(true)
        setError(null)
        try {
            await botApi.linkRule(forward.id, selectedId)
            toast({ title: "Rule linked", description: "It now filters this route.", tone: "success" })
            onLinked()
            onClose()
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Failed to link rule")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Link rule"
            description={
                forward
                    ? `Attach an existing rule to forward #${forward.id}.`
                    : "Attach an existing rule to this forward."
            }
            footer={
                <>
                    <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={submit}
                        loading={submitting}
                        disabled={selectedId === null}
                    >
                        Link rule
                    </Button>
                </>
            }
        >
            <div className="space-y-3">
                {available.length === 0 ? (
                    <p className="rounded-[10px] border border-dashed border-line-strong px-3 py-4 text-center text-[12px] text-faint">
                        Every existing rule is already linked to this forward.
                    </p>
                ) : (
                    <ul className="max-h-64 space-y-1 overflow-y-auto rounded-[10px] border border-line bg-surface p-1">
                        {available.map((rule) => {
                            const selected = selectedId === rule.id
                            return (
                                <li key={rule.id}>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => setSelectedId(rule.id)}
                                        className={cn(
                                            "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                                            selected ? "bg-accent/[0.08]" : "hover:bg-surface-2"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors",
                                                selected
                                                    ? "border-accent bg-accent text-[#0a0a0b]"
                                                    : "border-line-strong bg-surface-2"
                                            )}
                                        >
                                            {selected && <Check className="size-2.5" strokeWidth={3.5} />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-[12.5px] text-ink">
                                                {rule.title}
                                            </span>
                                            {rule.description && (
                                                <span className="mt-0.5 block line-clamp-1 text-[11px] text-faint">
                                                    {rule.description}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}

                {error && (
                    <div
                        className="flex items-start gap-2 rounded-[10px] border border-[color-mix(in_oklab,var(--color-danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-danger)_10%,transparent)] px-3 py-2"
                        role="alert"
                    >
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                        <p className="text-[12px] leading-relaxed text-danger">{error}</p>
                    </div>
                )}
            </div>
        </Modal>
    )
}
