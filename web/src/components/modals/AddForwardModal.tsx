import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ShieldCheck } from "lucide-react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { GroupSelect } from "../ui/GroupSelect"
import { useToast } from "../ui/Toast"
import { botApi } from "../../lib/api"
import { cn } from "../../lib/format"
import type { GroupsMap, Rule } from "../../types"

export function AddForwardModal({
    open,
    onClose,
    groups,
    rules,
    onCreated
}: {
    open: boolean
    onClose: () => void
    groups: GroupsMap
    rules: Rule[]
    onCreated: () => void
}) {
    const { toast } = useToast()
    const [listenId, setListenId] = useState("")
    const [sendId, setSendId] = useState("")
    const [ruleIds, setRuleIds] = useState<number[]>([])
    const [localGroups, setLocalGroups] = useState<GroupsMap>(groups)
    const [loadingGroups, setLoadingGroups] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchGroups = useCallback(async () => {
        setLoadingGroups(true)
        try {
            const data = await botApi.groups()
            if (data && Object.keys(data).length > 0) {
                setLocalGroups(data)
            }
        } catch {
            // Keep existing groups if request fails
        } finally {
            setLoadingGroups(false)
        }
    }, [])

    useEffect(() => {
        setLocalGroups(groups)
    }, [groups])

    useEffect(() => {
        if (!open) return
        setListenId("")
        setSendId("")
        setRuleIds([])
        setError(null)
        setSubmitting(false)
        void fetchGroups()
    }, [open, fetchGroups])

    const toggleRule = (id: number) => {
        setRuleIds((current) =>
            current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
        )
    }

    const submit = async () => {
        if (!listenId || !sendId) {
            setError("Choose both a source and a destination chat.")
            return
        }
        if (listenId === sendId) {
            setError("Source and destination must be different chats.")
            return
        }

        setSubmitting(true)
        setError(null)
        try {
            await botApi.createForward({ listenId, sendId, ruleIds })
            toast({
                title: "Forward created",
                description: "Messages will be routed on the next batch run.",
                tone: "success"
            })
            onCreated()
            onClose()
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "Failed to create forward"
            setError(message)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Add forward route"
            description="Pick a chat to listen to, a chat to forward into, and optionally the rules that filter messages."
            size="lg"
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
                        disabled={!listenId || !sendId}
                    >
                        Create forward
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <GroupSelect
                        groups={localGroups}
                        value={listenId}
                        onChange={setListenId}
                        label="Listen to"
                        placeholder="Search source groups…"
                        disabledJid={sendId}
                        loading={loadingGroups}
                        onRefresh={fetchGroups}
                    />
                    <GroupSelect
                        groups={localGroups}
                        value={sendId}
                        onChange={setSendId}
                        label="Forward to"
                        placeholder="Search destination groups…"
                        disabledJid={listenId}
                        loading={loadingGroups}
                        onRefresh={fetchGroups}
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium">Rules</span>
                        <span className="text-[11px] text-faint">
                            {ruleIds.length === 0 ? "forwards everything" : `${ruleIds.length} selected`}
                        </span>
                    </div>

                    {rules.length === 0 ? (
                        <p className="rounded-[10px] border border-dashed border-line-strong px-3 py-3 text-[12px] text-faint">
                            No rules exist yet. Without rules, every message is forwarded.
                        </p>
                    ) : (
                        <ul className="max-h-44 space-y-1 overflow-y-auto rounded-[10px] border border-line bg-surface p-1">
                            {rules.map((rule) => {
                                const checked = ruleIds.includes(rule.id)
                                return (
                                    <li key={rule.id}>
                                        <button
                                            type="button"
                                            role="checkbox"
                                            aria-checked={checked}
                                            onClick={() => toggleRule(rule.id)}
                                            className={cn(
                                                "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                                                checked ? "bg-accent/[0.08]" : "hover:bg-surface-2"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors",
                                                    checked
                                                        ? "border-accent bg-accent text-[#0a0a0b]"
                                                        : "border-line-strong bg-surface-2"
                                                )}
                                            >
                                                {checked && <ShieldCheck className="size-2.5" strokeWidth={3} />}
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
                </div>

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
