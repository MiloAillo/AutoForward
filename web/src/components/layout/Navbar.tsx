import { useState } from "react"
import { ArrowLeftRight, Play, RefreshCw, RotateCcw, Square } from "lucide-react"
import { Button } from "../ui/Button"
import { Dot } from "../ui/Badge"
import { cn } from "../../lib/format"
import { socketLabel } from "../../lib/status"
import type { Health } from "../../types"

type Tone = "ok" | "warn" | "danger" | "neutral"

function StatusPill({
    label,
    value,
    tone,
    pulse
}: {
    label: string
    value: string
    tone: Tone
    pulse?: boolean
}) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5">
            <Dot tone={tone} pulse={pulse} />
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-faint">
                {label}
            </span>
            <span className="text-[12px] font-medium text-ink">{value}</span>
        </div>
    )
}

export function Navbar({
    health,
    healthError,
    isFetching,
    onRefresh,
    onStart,
    onStop,
    onRestart,
    pendingAction
}: {
    health: Health | null
    healthError: Error | null
    isFetching: boolean
    onRefresh: () => void
    onStart: () => void
    onStop: () => void
    onRestart: () => void
    pendingAction: string | null
}) {
    const [spinning, setSpinning] = useState(false)
    const offline = Boolean(healthError) || !health
    const socket = health?.socketStatus

    const handleRefresh = () => {
        setSpinning(true)
        onRefresh()
        setTimeout(() => setSpinning(false), 650)
    }

    const socketTone: Tone =
        socket === "open" ? "ok" : socket === "qr" || socket === "connecting" ? "warn" : "danger"
    const dbTone: Tone = health?.dbStatus?.ok ? "ok" : "danger"

    return (
        <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-[1560px] items-center gap-3 px-4 sm:gap-4 sm:px-6">
                <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-[10px] bg-gradient-to-br from-accent to-[#c2410c] shadow-[0_6px_18px_-8px_rgba(249,115,22,0.9)]">
                        <ArrowLeftRight className="size-4 text-[#0a0a0b]" strokeWidth={2.6} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[15px] font-semibold tracking-[-0.02em]">AutoForward</span>
                        <span className="hidden rounded border border-line bg-surface px-1.5 py-px font-mono text-[10px] text-faint sm:inline">
                            v2.1
                        </span>
                    </div>
                </div>

                <div className="ml-auto hidden items-center gap-2 lg:flex">
                    <StatusPill
                        label="Process"
                        value={offline ? "Down" : "Running"}
                        tone={offline ? "danger" : "ok"}
                        pulse={!offline}
                    />
                    <StatusPill
                        label="Socket"
                        value={socketLabel(socket)}
                        tone={socketTone}
                        pulse={socket === "open"}
                    />
                    <StatusPill
                        label="DB"
                        value={health?.dbStatus?.ok ? "Alive" : "Down"}
                        tone={dbTone}
                    />
                </div>

                <div className="ml-auto flex items-center gap-2 lg:ml-0">
                    <span
                        className={cn(
                            "flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 lg:hidden",
                            offline ? "text-danger" : "text-ink"
                        )}
                    >
                        <Dot tone={offline ? "danger" : socketTone} pulse={!offline} />
                        <span className="text-[12px] font-medium">
                            {offline ? "Offline" : socketLabel(socket)}
                        </span>
                    </span>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleRefresh}
                        aria-label="Refresh all data"
                        title="Refresh"
                    >
                        <RefreshCw className={cn("size-4 transition-transform", (isFetching || spinning) && "animate-spin")} />
                    </Button>

                    <div className="mx-0.5 hidden h-6 w-px bg-line sm:block" />

                    {offline ? (
                        <Button
                            variant="success"
                            size="sm"
                            icon={<Play className="size-3.5" />}
                            onClick={onStart}
                            loading={pendingAction === "start"}
                        >
                            Start
                        </Button>
                    ) : (
                        <Button
                            variant="danger"
                            size="sm"
                            icon={<Square className="size-3.5" />}
                            onClick={onStop}
                            loading={pendingAction === "stop"}
                        >
                            Stop
                        </Button>
                    )}

                    <Button
                        variant="primary"
                        size="sm"
                        icon={<RotateCcw className="size-3.5" />}
                        onClick={onRestart}
                        loading={pendingAction === "restart"}
                        disabled={offline}
                        title={offline ? "Start the bot first" : "Restart the bot container"}
                    >
                        Restart
                    </Button>
                </div>
            </div>
        </header>
    )
}
