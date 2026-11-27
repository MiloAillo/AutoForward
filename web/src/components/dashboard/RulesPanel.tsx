import { ChevronRight, Plus, ShieldCheck, ShieldOff, Trash2 } from "lucide-react"
import { Button } from "../ui/Button"
import { EmptyState, Skeleton } from "../ui/Skeleton"
import type { Forward, Rule } from "../../types"

export function RulesPanel({
    rules,
    forwards,
    loading,
    onCreate,
    onSelectRule,
    onDelete,
    disabled = false,
    disabledReason,
    busy
}: {
    rules: Rule[]
    forwards: Forward[]
    loading: boolean
    onCreate: () => void
    onSelectRule: (rule: Rule) => void
    onDelete: (rule: Rule) => void
    disabled?: boolean
    disabledReason?: string
    busy: boolean
}) {
    const usage = new Map<number, number>()
    for (const forward of forwards) {
        for (const rule of forward.rules) {
            usage.set(rule.id, (usage.get(rule.id) ?? 0) + 1)
        }
    }

    return (
        <section className="panel flex h-full flex-col overflow-hidden">
            <header className="flex items-center gap-2 border-b border-line px-4 py-3">
                <ShieldCheck className="size-4 text-accent" />
                <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">Rules</h2>
                <span className="rounded-full border border-line bg-surface-2 px-1.5 py-px font-mono text-[10px] text-muted">
                    {rules.length}
                </span>
                <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    icon={<Plus className="size-3.5" />}
                    onClick={onCreate}
                    disabled={disabled}
                    title={disabled ? disabledReason : undefined}
                >
                    Create
                </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
                {loading && rules.length === 0 ? (
                    <div className="space-y-2.5 p-1">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : rules.length === 0 ? (
                    <EmptyState
                        icon={<ShieldOff className="size-5" />}
                        title="No rules yet"
                        description="Rules let the AI decide whether a message is worth forwarding."
                        action={
                            <Button
                                size="sm"
                                variant="primary"
                                icon={<Plus className="size-3.5" />}
                                onClick={onCreate}
                                disabled={disabled}
                                title={disabled ? disabledReason : undefined}
                            >
                                Create a rule
                            </Button>
                        }
                    />
                ) : (
                    <ul className="space-y-2">
                        {rules.map((rule) => {
                            const used = usage.get(rule.id) ?? 0
                            return (
                                <li
                                    key={rule.id}
                                    onClick={() => onSelectRule(rule)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault()
                                            onSelectRule(rule)
                                        }
                                    }}
                                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-line bg-surface-2 p-3 pl-3.5 transition-all hover:border-line-strong hover:bg-surface-3/60 focus-visible:border-accent focus-visible:outline-none"
                                >
                                    <span className="absolute inset-y-2.5 left-0 w-[2px] rounded-full bg-accent/60" />
                                    <div className="flex items-start gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="truncate text-[12.5px] font-medium">{rule.title}</p>
                                                <span className="shrink-0 font-mono text-[9.5px] text-faint">
                                                    #{rule.id}
                                                </span>
                                            </div>
                                            {rule.description && (
                                                <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">
                                                    {rule.description}
                                                </p>
                                            )}
                                            <div className="mt-2 flex items-center gap-2">
                                                <span
                                                    className={
                                                        used > 0
                                                            ? "rounded-full border border-[color-mix(in_oklab,var(--color-accent)_32%,transparent)] bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)] px-1.5 py-px text-[10px] font-medium text-accent-soft"
                                                            : "rounded-full border border-line bg-surface-3 px-1.5 py-px text-[10px] text-faint"
                                                    }
                                                >
                                                    {used > 0
                                                        ? `used by ${used} forward${used === 1 ? "" : "s"}`
                                                        : "unused"}
                                                </span>
                                                <span className="ml-auto inline-flex items-center gap-0.5 text-[10.5px] font-medium text-faint opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                                    View prompt
                                                    <ChevronRight className="size-3" />
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={`Delete rule ${rule.title}`}
                                            title={
                                                used > 0
                                                    ? `Unlink from ${used} forward${used === 1 ? "" : "s"} before deleting`
                                                    : "Delete rule"
                                            }
                                            disabled={busy || used > 0}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onDelete(rule)
                                            }}
                                            className="grid size-7 shrink-0 place-items-center rounded-lg text-faint transition-colors hover:bg-[color-mix(in_oklab,var(--color-danger)_14%,transparent)] hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-faint"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            <footer className="border-t border-line bg-surface-2/40 px-4 py-2.5">
                <p className="text-[11px] text-faint">
                    Rules run through the AI before a message is forwarded.
                </p>
            </footer>
        </section>
    )
}
