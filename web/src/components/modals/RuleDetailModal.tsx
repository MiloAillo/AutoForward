import { useEffect, useState } from "react"
import { AlertTriangle, ArrowRight, Bot, Copy, GitBranch, ShieldCheck, Trash2 } from "lucide-react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Skeleton } from "../ui/Skeleton"
import { useToast } from "../ui/Toast"
import { botApi } from "../../lib/api"
import { groupLabel } from "../../lib/format"
import type { GroupsMap, RuleDetail } from "../../types"

export function RuleDetailModal({
    open,
    onClose,
    ruleId,
    groups,
    onDelete,
    busy
}: {
    open: boolean
    onClose: () => void
    ruleId: number | null
    groups: GroupsMap
    onDelete: (rule: RuleDetail) => void
    busy: boolean
}) {
    const { toast } = useToast()
    const [detail, setDetail] = useState<RuleDetail | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!open || ruleId === null) {
            setDetail(null)
            setError(null)
            setLoading(false)
            return
        }

        let cancelled = false
        setLoading(true)
        setError(null)

        botApi
            .rule(ruleId)
            .then((data) => {
                if (cancelled) return
                setDetail(data)
            })
            .catch((cause) => {
                if (cancelled) return
                setError(cause instanceof Error ? cause.message : "Failed to load rule")
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })

        return () => {
            cancelled = true
        }
    }, [open, ruleId])

    const copyPrompt = async () => {
        if (!detail?.rule) return
        try {
            await navigator.clipboard.writeText(detail.rule)
            toast({
                title: "Prompt copied",
                description: "Rule instruction copied to clipboard.",
                tone: "success"
            })
        } catch {
            toast({
                title: "Copy failed",
                description: "Clipboard access was blocked by the browser.",
                tone: "error"
            })
        }
    }

    const forwards = detail?.forwardItems ?? []
    const isUsed = forwards.length > 0

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={detail ? detail.title : "Rule details"}
            description={detail?.description || "Detailed AI instructions and attached forward routes."}
            size="lg"
            footer={
                <div className="flex w-full items-center justify-between">
                    {detail && (
                        <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 className="size-3.5" />}
                            disabled={busy || isUsed}
                            title={
                                isUsed
                                    ? `Unlink from ${forwards.length} forward${forwards.length === 1 ? "" : "s"} before deleting`
                                    : "Delete rule"
                            }
                            onClick={() => {
                                onClose()
                                onDelete(detail)
                            }}
                        >
                            Delete rule
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
                        Close
                    </Button>
                </div>
            }
        >
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-6 w-44" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : error ? (
                <div
                    className="flex items-start gap-2.5 rounded-[10px] border border-[color-mix(in_oklab,var(--color-danger)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-danger)_10%,transparent)] p-3 text-danger"
                    role="alert"
                >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div className="text-[12px] leading-relaxed">
                        <p className="font-semibold">Could not load rule</p>
                        <p className="mt-0.5 opacity-90">{error}</p>
                    </div>
                </div>
            ) : detail ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-accent" />
                        <span className="font-mono text-[11px] text-faint">Rule ID #{detail.id}</span>
                        <span
                            className={
                                isUsed
                                    ? "ml-auto rounded-full border border-[color-mix(in_oklab,var(--color-accent)_32%,transparent)] bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)] px-2 py-0.5 text-[10.5px] font-medium text-accent-soft"
                                    : "ml-auto rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[10.5px] text-faint"
                            }
                        >
                            {isUsed
                                ? `Used by ${forwards.length} forward${forwards.length === 1 ? "" : "s"}`
                                : "Unused"}
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                                <Bot className="size-3.5 text-accent" />
                                Model instruction prompt
                            </label>
                            <button
                                type="button"
                                onClick={copyPrompt}
                                className="inline-flex items-center gap-1 text-[11px] text-faint transition-colors hover:text-ink"
                            >
                                <Copy className="size-3" />
                                Copy prompt
                            </button>
                        </div>
                        <div className="rounded-xl border border-line-strong bg-[#090b0d] p-3.5 font-mono text-[12px] leading-relaxed text-[#d4d9de]">
                            {detail.rule}
                        </div>
                        <p className="text-[11px] text-faint">
                            Sent to the OpenAI-compatible model to evaluate unsent messages in the batch.
                        </p>
                    </div>

                    <div className="space-y-2 border-t border-line pt-3">
                        <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                            <GitBranch className="size-3.5 text-faint" />
                            Connected forward routes ({forwards.length})
                        </div>

                        {forwards.length === 0 ? (
                            <p className="rounded-[10px] border border-dashed border-line px-3 py-3 text-[12px] text-faint">
                                Not currently assigned to any forward route. Attach it via "Link rule" on any forward.
                            </p>
                        ) : (
                            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-[10px] border border-line bg-surface p-1">
                                {forwards.map((item) => (
                                    <li
                                        key={item.id}
                                        className="flex items-center gap-2 rounded-lg border border-line/60 bg-surface-2 px-2.5 py-2 text-[12px]"
                                    >
                                        <span className="font-mono text-[10px] text-faint">#{item.id}</span>
                                        <span className="truncate font-medium text-muted">
                                            {groupLabel(item.listenId, groups)}
                                        </span>
                                        <ArrowRight className="size-3 shrink-0 text-faint" />
                                        <span className="truncate font-medium text-ink">
                                            {groupLabel(item.sendId, groups)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            ) : null}
        </Modal>
    )
}
