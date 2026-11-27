import { useEffect, useMemo, useRef, useState } from "react"
import { Copy, Pause, Play, RefreshCw, Terminal } from "lucide-react"
import { Dot } from "../ui/Badge"
import { useToast } from "../ui/Toast"
import { cn, formatClock, parseLogLine } from "../../lib/format"
import type { LogPayload, ParsedLog } from "../../types"

type LevelFilter = "ALL" | "INFO" | "WARN" | "ERROR"

const LEVEL_STYLES: Record<ParsedLog["level"], string> = {
    INFO: "text-ok",
    WARN: "text-warn",
    ERROR: "text-danger",
    DEBUG: "text-info",
    LOG: "text-muted"
}

const FILTERS: LevelFilter[] = ["ALL", "INFO", "WARN", "ERROR"]

export function LogsPanel({
    logs,
    error,
    loading,
    isFetching,
    onRefresh
}: {
    logs: LogPayload | null
    error: Error | null
    loading: boolean
    isFetching: boolean
    onRefresh: () => void
}) {
    const { toast } = useToast()
    const [follow, setFollow] = useState(true)
    const [filter, setFilter] = useState<LevelFilter>("ALL")
    const [spinning, setSpinning] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    const handleRefresh = () => {
        setSpinning(true)
        onRefresh()
        setTimeout(() => setSpinning(false), 650)
    }

    const parsed = useMemo(
        () => (logs?.lines ?? []).map((line) => parseLogLine(line)).filter((line) => line.message.length > 0),
        [logs]
    )

    const visible = useMemo(
        () => (filter === "ALL" ? parsed : parsed.filter((line) => line.level === filter)),
        [parsed, filter]
    )

    useEffect(() => {
        if (!follow) return
        const element = scrollRef.current
        if (element) element.scrollTop = element.scrollHeight
    }, [visible.length, follow, filter])

    const copy = async () => {
        const text = visible
            .map((line) => [line.time, `[${line.level}]`, line.message].filter(Boolean).join(" "))
            .join("\n")
        try {
            await navigator.clipboard.writeText(text)
            toast({ title: "Logs copied", description: `${visible.length} lines copied to clipboard.`, tone: "success" })
        } catch {
            toast({ title: "Copy failed", description: "Clipboard access was blocked by the browser.", tone: "error" })
        }
    }

    return (
        <section className="panel flex flex-col overflow-hidden">
            <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
                <Terminal className="size-4 text-accent" />
                <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">Live logs</h2>
                <span className="ml-1 flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5">
                    <Dot tone={error ? "danger" : "ok"} pulse={!error} />
                    <span className="text-[10px] font-medium uppercase tracking-[0.07em] text-faint">
                        watchdog
                    </span>
                </span>
                <span className="font-mono text-[10px] text-faint">{visible.length} lines</span>

                <div className="ml-auto flex items-center gap-1">
                    <div className="mr-1 hidden items-center rounded-lg border border-line bg-surface p-0.5 sm:flex">
                        {FILTERS.map((level) => (
                            <button
                                key={level}
                                type="button"
                                onClick={() => setFilter(level)}
                                aria-pressed={filter === level}
                                className={cn(
                                    "rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-[0.05em] transition-colors",
                                    filter === level
                                        ? "bg-surface-3 text-ink"
                                        : "text-faint hover:text-muted"
                                )}
                            >
                                {level}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setFollow((value) => !value)}
                        aria-pressed={follow}
                        className={cn(
                            "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2 text-[10.5px] font-medium transition-colors",
                            follow
                                ? "border-[color-mix(in_oklab,var(--color-ok)_32%,transparent)] bg-[color-mix(in_oklab,var(--color-ok)_10%,transparent)] text-ok"
                                : "border-line bg-surface text-faint hover:text-muted"
                        )}
                        title={follow ? "Following new lines" : "Follow paused"}
                    >
                        {follow ? <Pause className="size-3" /> : <Play className="size-3" />}
                        {follow ? "Follow" : "Paused"}
                    </button>

                    <button
                        type="button"
                        onClick={copy}
                        disabled={visible.length === 0}
                        aria-label="Copy visible logs"
                        className="grid size-7 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
                    >
                        <Copy className="size-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        aria-label="Refresh logs"
                        className="grid size-7 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                        <RefreshCw className={cn("size-3.5 transition-transform", (isFetching || spinning) && "animate-spin")} />
                    </button>
                </div>
            </header>

            <div
                ref={scrollRef}
                className="h-[290px] overflow-y-auto bg-[#0a0c0e] py-2 font-mono text-[11.5px] leading-[1.65]"
                role="log"
                aria-live={follow ? "polite" : "off"}
                aria-label="Bot container logs"
            >
                {error ? (
                    <div className="px-4 py-6">
                        <p className="text-danger">Watchdog unreachable</p>
                        <p className="mt-1 max-w-md text-muted">
                            {error.message} Make sure the watchdog container is running and reachable at{" "}
                            <span className="text-ink">{"VITE_WATCHDOG_URL"}</span>.
                        </p>
                    </div>
                ) : loading && visible.length === 0 ? (
                    <div className="space-y-2 px-4 py-2">
                        {[0, 1, 2, 3, 4].map((index) => (
                            <div key={index} className="h-3.5 w-full max-w-lg animate-pulse rounded bg-surface-2" />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <p className="px-4 py-6 text-faint">No log lines match this filter.</p>
                ) : (
                    visible.map((line, index) => (
                        <div
                            key={`${index}-${line.message.slice(0, 24)}`}
                            className="grid grid-cols-[64px_44px_1fr] items-start gap-2 px-4 hover:bg-white/[0.025]"
                        >
                            <span className="text-[10.5px] text-faint/80">{formatClock(line.time) || "—"}</span>
                            <span className={cn("text-[10px] font-semibold uppercase", LEVEL_STYLES[line.level])}>
                                {line.level}
                            </span>
                            <span className="whitespace-pre-wrap break-words text-[#c8cdd2]">{line.message}</span>
                        </div>
                    ))
                )}
            </div>
        </section>
    )
}
