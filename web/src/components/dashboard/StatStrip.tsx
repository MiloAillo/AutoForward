import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { Clock3, GitBranch, ShieldCheck, Timer } from "lucide-react"
import { Skeleton } from "../ui/Skeleton"
import { cn, formatCountdown, formatUptime } from "../../lib/format"
import type { ContainerStatus, Health, Overview } from "../../types"

function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), intervalMs)
        return () => window.clearInterval(id)
    }, [intervalMs])
    return now
}

function StatCard({
    label,
    value,
    sub,
    icon,
    progress,
    loading
}: {
    label: string
    value: string
    sub: string
    icon: ReactNode
    progress?: number
    loading?: boolean
}) {
    return (
        <div className="panel group relative overflow-hidden p-4">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-medium uppercase tracking-[0.09em] text-faint">
                    {label}
                </span>
                <span className="text-faint transition-colors group-hover:text-muted">{icon}</span>
            </div>

            {loading ? (
                <Skeleton className="mt-2.5 h-8 w-24" />
            ) : (
                <p className="mt-2 font-mono text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
                    {value}
                </p>
            )}

            <p className="mt-1.5 truncate text-[11.5px] text-faint">{sub}</p>

            {progress !== undefined && (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div
                        className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear"
                        style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                    />
                </div>
            )}
        </div>
    )
}

export function StatStrip({
    health,
    overview,
    loading
}: {
    health: Health | null
    overview: Overview | null
    loading: boolean
}) {
    const now = useNow(1000)
    const intervalMinutes = health?.batchIntervalMinutes ?? 30

    const nextAt = health?.nextBatchAt ? new Date(health.nextBatchAt).getTime() : null
    const remaining = nextAt ? nextAt - now : null
    const progress =
        remaining === null ? 0 : 1 - remaining / Math.max(1, intervalMinutes * 60_000)

    const forwards = overview?.forwards.length ?? 0
    const rules = overview?.rules.length ?? 0
    const linkedRules = new Set(
        (overview?.forwards ?? []).flatMap((forward) => forward.rules.map((rule) => rule.id))
    ).size

    const startedAt = health?.startedAt ? new Date(health.startedAt) : null
    const liveUptimeSeconds = startedAt
        ? Math.max(0, Math.floor((now - startedAt.getTime()) / 1000))
        : (health?.uptimeSeconds ?? null)
    const startedLabel = startedAt
        ? `since ${startedAt.toLocaleDateString(undefined, { day: "numeric", month: "short" })} ${startedAt.toLocaleTimeString(
              undefined,
              { hour: "2-digit", minute: "2-digit" }
          )}`
        : "process lifetime"

    return (
        <section
            aria-label="System statistics"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
            <StatCard
                label="Next batch"
                value={health ? (remaining !== null ? formatCountdown(remaining) : "--:--") : "—"}
                sub={health ? `every ${intervalMinutes} min` : "—"}
                icon={<Timer className="size-3.5" />}
                progress={health ? progress : undefined}
                loading={loading}
            />
            <StatCard
                label="Uptime"
                value={liveUptimeSeconds !== null ? formatUptime(liveUptimeSeconds) : "—"}
                sub={health ? startedLabel : "—"}
                icon={<Clock3 className="size-3.5" />}
                loading={loading}
            />
            <StatCard
                label="Forwards"
                value={overview ? String(forwards) : "—"}
                sub={overview ? `${linkedRules} rule${linkedRules === 1 ? "" : "s"} linked` : "—"}
                icon={<GitBranch className="size-3.5" />}
                loading={loading}
            />
            <StatCard
                label="Rules"
                value={overview ? String(rules) : "—"}
                sub={overview ? `${linkedRules} in use` : "—"}
                icon={<ShieldCheck className="size-3.5" />}
                loading={loading}
            />
        </section>
    )
}

export function OfflineBanner({
    onStart,
    pending,
    container,
    watchdogError,
    className
}: {
    onStart: () => void
    pending: boolean
    container?: ContainerStatus | null
    watchdogError?: Error | null
    className?: string
}) {
    const status = container?.status
    const missing = status === "missing"
    const booting = Boolean(container?.running) && (status === "restarting" || status === "created")

    const title = missing
        ? "Bot container not found"
        : booting
          ? "Bot is starting"
          : container && !container.running
            ? "Bot is stopped"
            : container?.running
              ? "Bot is running but not answering"
              : "Bot is offline"

    const description = missing
        ? "The watchdog cannot find the container. Check BOT_CONTAINER_NAME and the Docker socket."
        : booting
          ? "The container is starting. Status will refresh on its own once the internal API is up."
          : container && !container.running
            ? "The container is stopped. Start it from the watchdog to resume forwarding."
            : watchdogError
              ? "Neither the bot nor the watchdog is reachable. Check that both containers are running."
              : "The internal API is unreachable. Start the container from the watchdog to bring it back."

    return (
        <div
            className={cn(
                "flex flex-col gap-3 rounded-panel border border-[color-mix(in_oklab,var(--color-danger)_32%,transparent)] bg-[color-mix(in_oklab,var(--color-danger)_8%,var(--color-surface))] px-4 py-3 sm:flex-row sm:items-center",
                className
            )}
            role="alert"
        >
            <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">{title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{description}</p>
            </div>
            <button
                type="button"
                onClick={onStart}
                disabled={pending || missing || booting}
                className="ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-danger px-3 text-[13px] font-semibold text-[#1a0505] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                {pending ? "Starting…" : booting ? "Starting…" : "Start bot"}
            </button>
        </div>
    )
}
