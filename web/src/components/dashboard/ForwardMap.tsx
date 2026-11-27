import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react"
import {
    GitBranch,
    Inbox,
    Link2,
    Maximize2,
    Minus,
    Plus,
    RotateCcw,
    Send,
    ShieldCheck,
    Trash2,
    X
} from "lucide-react"
import { Button } from "../ui/Button"
import { EmptyState, Skeleton } from "../ui/Skeleton"
import { buildGraph } from "../../lib/graph"
import { cn, groupLabel, groupSubtitle, shortJid } from "../../lib/format"
import type { Forward, GroupsMap, Rule } from "../../types"

interface ForwardMapProps {
    forwards: Forward[]
    rules: Rule[]
    groups: GroupsMap
    loading: boolean
    onAdd: () => void
    onDelete: (forward: Forward) => void
    onUnlink: (forward: Forward, ruleId: number) => void
    onLink: (forward: Forward) => void
    onSelectRule?: (ruleId: number) => void
    disabled?: boolean
    disabledReason?: string
    busy: boolean
}

const MIN_SCALE = 0.45
const MAX_SCALE = 1.5

const OFFSETS_KEY = "af:node-offsets"

type OffsetMap = Map<string, { dx: number; dy: number }>

function loadOffsets(): OffsetMap {
    try {
        const raw = localStorage.getItem(OFFSETS_KEY)
        if (!raw) return new Map()
        const entries: [string, { dx: number; dy: number }][] = JSON.parse(raw)
        return new Map(entries)
    } catch {
        return new Map()
    }
}

function saveOffsets(offsets: OffsetMap) {
    if (offsets.size === 0) {
        localStorage.removeItem(OFFSETS_KEY)
    } else {
        localStorage.setItem(OFFSETS_KEY, JSON.stringify([...offsets]))
    }
}

export function ForwardMap({
    forwards,
    rules,
    groups,
    loading,
    onAdd,
    onDelete,
    onUnlink,
    onLink,
    onSelectRule,
    disabled = false,
    disabledReason,
    busy
}: ForwardMapProps) {
    const [nodeOffsets, setNodeOffsets] = useState<OffsetMap>(loadOffsets)
    const layout = useMemo(() => buildGraph(forwards, nodeOffsets), [forwards, nodeOffsets])
    const containerRef = useRef<HTMLDivElement>(null)

    const [view, setView] = useState({ x: 16, y: 12, scale: 1 })
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const [hoveredId, setHoveredId] = useState<number | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isDraggingNode, setIsDraggingNode] = useState(false)
    const drag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
        null
    )
    const nodeDrag = useRef<{
        pointerId: number
        nodeKey: string
        startX: number
        startY: number
        origDx: number
        origDy: number
    } | null>(null)

    const fit = useCallback(() => {
        const element = containerRef.current
        if (!element) return
        const available = element.clientWidth - 32
        const scale = Math.min(1, Math.max(MIN_SCALE, available / layout.width))
        const y = Math.max(12, (element.clientHeight - layout.height * scale) / 2)
        setView({ x: 16, y, scale })
    }, [layout.width, layout.height])

    useEffect(() => {
        fit()
        const element = containerRef.current
        if (!element) return
        const observer = new ResizeObserver(() => fit())
        observer.observe(element)
        return () => observer.disconnect()
    }, [fit])

    useEffect(() => {
        if (selectedId !== null && !forwards.some((forward) => forward.id === selectedId)) {
            setSelectedId(null)
        }
    }, [forwards, selectedId])

    const selected = forwards.find((forward) => forward.id === selectedId) ?? null

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedId(null)
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    const zoomBy = (factor: number) => {
        const element = containerRef.current
        if (!element) return
        const rect = element.getBoundingClientRect()
        const px = rect.width / 2
        const py = rect.height / 2
        setView((current) => {
            const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor))
            const ratio = scale / current.scale
            return {
                scale,
                x: px - (px - current.x) * ratio,
                y: py - (py - current.y) * ratio
            }
        })
    }

    const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
        if (!(event.ctrlKey || event.metaKey)) return
        event.preventDefault()
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return
        const px = event.clientX - rect.left
        const py = event.clientY - rect.top
        const factor = event.deltaY < 0 ? 1.08 : 0.92
        setView((current) => {
            const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor))
            const ratio = scale / current.scale
            return {
                scale,
                x: px - (px - current.x) * ratio,
                y: py - (py - current.y) * ratio
            }
        })
    }

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        if (forwards.length === 0) return
        const target = event.target as HTMLElement

        // Node drag — started on a [data-node] card
        const nodeEl = target.closest("[data-node]") as HTMLElement | null
        if (nodeEl) {
            // Don't drag if clicking interactive elements inside the node
            if (target.closest("button, a, input, [data-chip], [data-control]")) return
            const key = nodeEl.getAttribute("data-node") ?? ""
            if (!key) return
            const existing = nodeOffsets.get(key)
            nodeDrag.current = {
                pointerId: event.pointerId,
                nodeKey: key,
                startX: event.clientX,
                startY: event.clientY,
                origDx: existing?.dx ?? 0,
                origDy: existing?.dy ?? 0
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            setIsDraggingNode(true)
            return
        }

        if (target.closest("button, a, input, [data-chip], [data-control]")) return
        drag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: view.x,
            originY: view.y
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        setIsDragging(true)
    }

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        // Node dragging
        const nd = nodeDrag.current
        if (nd && nd.pointerId === event.pointerId) {
            const dx = nd.origDx + (event.clientX - nd.startX) / view.scale
            const dy = nd.origDy + (event.clientY - nd.startY) / view.scale
            setNodeOffsets((prev) => {
                const next = new Map(prev)
                next.set(nd.nodeKey, { dx, dy })
                return next
            })
            return
        }
        // Canvas panning
        const current = drag.current
        if (!current || current.pointerId !== event.pointerId) return
        setView((state) => ({
            ...state,
            x: current.originX + (event.clientX - current.startX),
            y: current.originY + (event.clientY - current.startY)
        }))
    }

    const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        // Node drag end
        const nd = nodeDrag.current
        if (nd && nd.pointerId === event.pointerId) {
            nodeDrag.current = null
            setIsDraggingNode(false)
            event.currentTarget.releasePointerCapture(event.pointerId)
            // Persist offsets
            setNodeOffsets((current) => {
                saveOffsets(current)
                return current
            })
            return
        }
        // Canvas drag end
        if (drag.current?.pointerId === event.pointerId) {
            const dist = Math.hypot(
                event.clientX - drag.current.startX,
                event.clientY - drag.current.startY
            )
            drag.current = null
            setIsDragging(false)
            event.currentTarget.releasePointerCapture(event.pointerId)

            if (dist < 4) {
                const target = event.target as HTMLElement
                if (!target.closest("[data-node], [data-chip], [data-control]")) {
                    setSelectedId(null)
                }
            }
        }
    }

    return (
        <section className="panel flex h-full flex-col overflow-hidden">
            <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                <div className="flex items-center gap-2">
                    <GitBranch className="size-4 text-accent" />
                    <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">Forward map</h2>
                    <span className="rounded-full border border-line bg-surface-2 px-1.5 py-px font-mono text-[10px] text-muted">
                        {forwards.length}
                    </span>
                </div>
                <Button
                    size="sm"
                    variant="secondary"
                    className="ml-auto"
                    icon={<Plus className="size-3.5" />}
                    onClick={onAdd}
                    disabled={disabled}
                    title={disabled ? disabledReason : undefined}
                >
                    Add forward
                </Button>
            </header>

            <div
                ref={containerRef}
                onWheel={onWheel}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={cn(
                    "grid-dots relative min-h-[420px] flex-1 touch-none select-none overflow-hidden bg-surface",
                    forwards.length > 0 ? (isDragging || isDraggingNode ? "cursor-grabbing" : "cursor-grab") : ""
                )}
            >
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-2.5">
                    <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-faint">
                        Listening
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-faint">
                        Forwarding to
                    </span>
                </div>

                {loading && forwards.length === 0 ? (
                    <div className="absolute inset-0 grid place-items-center">
                        <div className="w-full max-w-md space-y-3 px-8">
                            <Skeleton className="h-14 w-full" />
                            <Skeleton className="h-14 w-4/5" />
                            <Skeleton className="h-14 w-full" />
                        </div>
                    </div>
                ) : forwards.length === 0 ? (
                    <EmptyState
                        className="relative z-10 h-full min-h-[400px]"
                        icon={<GitBranch className="size-5" />}
                        title="No forward routes yet"
                        description="Connect a listening chat to a destination chat and optionally filter it with AI rules."
                        action={
                            <Button
                                variant="primary"
                                size="sm"
                                icon={<Plus className="size-3.5" />}
                                onClick={onAdd}
                                disabled={disabled}
                                title={disabled ? disabledReason : undefined}
                            >
                                Add your first forward
                            </Button>
                        }
                    />
                ) : (
                    <div
                        className="absolute inset-0 origin-top-left"
                        style={{
                            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                            width: layout.width,
                            height: layout.height
                        }}
                    >
                        <svg
                            width={layout.width}
                            height={layout.height}
                            className="absolute inset-0 overflow-visible"
                            aria-hidden
                        >
                            <defs>
                                <marker
                                    id="arrow"
                                    viewBox="0 0 10 10"
                                    refX="8"
                                    refY="5"
                                    markerWidth="5"
                                    markerHeight="5"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#59626b" />
                                </marker>
                                <marker
                                    id="arrow-active"
                                    viewBox="0 0 10 10"
                                    refX="8"
                                    refY="5"
                                    markerWidth="5"
                                    markerHeight="5"
                                    orient="auto-start-reverse"
                                >
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
                                </marker>
                            </defs>

                            {layout.edges.map((edge) => {
                                const active = edge.forward.id === selectedId
                                const hovered = edge.forward.id === hoveredId
                                const shifted =
                                    Math.abs(edge.labelX - edge.anchorX) > 6 ||
                                    Math.abs(edge.labelY - edge.anchorY) > 6
                                return (
                                    <g key={edge.forward.id}>
                                        <path
                                            d={edge.path}
                                            fill="none"
                                            stroke={active ? "#f97316" : hovered ? "#6b747d" : "#3d444c"}
                                            strokeWidth={active ? 2 : 1.6}
                                            markerEnd={active ? "url(#arrow-active)" : "url(#arrow)"}
                                            className="transition-[stroke] duration-150"
                                        />
                                        {shifted && (
                                            <g aria-hidden className="pointer-events-none">
                                                <line
                                                    x1={edge.anchorX}
                                                    y1={edge.anchorY}
                                                    x2={edge.labelX}
                                                    y2={edge.labelY}
                                                    stroke={active ? "#7c3d0f" : "#2f353c"}
                                                    strokeWidth={1}
                                                    strokeDasharray="2 3"
                                                />
                                                <circle
                                                    cx={edge.anchorX}
                                                    cy={edge.anchorY}
                                                    r={2.6}
                                                    fill={active ? "#f97316" : "#59626b"}
                                                />
                                            </g>
                                        )}
                                        <path
                                            d={edge.path}
                                            fill="none"
                                            stroke="transparent"
                                            strokeWidth={18}
                                            className="cursor-pointer"
                                            onMouseEnter={() => setHoveredId(edge.forward.id)}
                                            onMouseLeave={() => setHoveredId((id) => (id === edge.forward.id ? null : id))}
                                            onClick={() => setSelectedId(edge.forward.id)}
                                        />
                                    </g>
                                )
                            })}
                        </svg>

                        {layout.nodes.map((node) => {
                            const isEndpoint =
                                selected?.listenId === node.jid || selected?.sendId === node.jid
                            return (
                                <div
                                    key={`${node.side}:${node.jid}`}
                                    data-node={`${node.side}:${node.jid}`}
                                    style={{
                                        left: node.x,
                                        top: node.y,
                                        width: node.width,
                                        height: node.height
                                    }}
                                    onClick={() => {
                                        const matching = forwards.filter((f) =>
                                            node.side === "listen" ? f.listenId === node.jid : f.sendId === node.jid
                                        )
                                        if (matching.length === 0) return
                                        const currentIndex = matching.findIndex((f) => f.id === selectedId)
                                        const next = matching[(currentIndex + 1) % matching.length]
                                        if (next) setSelectedId(next.id)
                                    }}
                                    className={cn(
                                        "absolute flex cursor-pointer items-center gap-2.5 rounded-xl border bg-surface-2 px-3 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] transition-colors hover:border-line-strong",
                                        isEndpoint ? "border-accent/60" : "border-line"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "grid size-7 shrink-0 place-items-center rounded-lg border",
                                            node.side === "listen"
                                                ? "border-[color-mix(in_oklab,var(--color-info)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-info)_12%,transparent)] text-info"
                                                : "border-[color-mix(in_oklab,var(--color-accent)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)] text-accent-soft"
                                        )}
                                    >
                                        {node.side === "listen" ? (
                                            <Inbox className="size-3.5" />
                                        ) : (
                                            <Send className="size-3.5" />
                                        )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[12.5px] font-medium leading-tight">
                                            {groupLabel(node.jid, groups)}
                                        </p>
                                        <p className="truncate font-mono text-[9.5px] text-faint">
                                            {groupSubtitle(node.jid)} · {shortJid(node.jid)}
                                        </p>
                                    </div>
                                    <span className="shrink-0 rounded-md bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                                        {node.edgeCount}
                                    </span>
                                </div>
                            )
                        })}

                        {layout.edges.map((edge) => {
                            const active = edge.forward.id === selectedId
                            const edgeRules = edge.forward.rules
                            return (
                                <div
                                    key={`chips-${edge.forward.id}`}
                                    style={{ left: edge.labelX, top: edge.labelY }}
                                    className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
                                >
                                    {edgeRules.length === 0 ? (
                                        <button
                                            type="button"
                                            data-chip
                                            onClick={() => setSelectedId(edge.forward.id)}
                                            className={cn(
                                                "rounded-full border border-dashed bg-surface px-2.5 py-1 text-[10.5px] font-medium transition-colors shadow-sm",
                                                active
                                                    ? "border-accent text-ink ring-1 ring-accent/30"
                                                    : "border-line-strong text-muted hover:border-line-highlight hover:text-ink"
                                            )}
                                        >
                                            All messages
                                        </button>
                                    ) : (
                                        edgeRules.map((rule) => (
                                            <div
                                                key={rule.id}
                                                data-chip
                                                onClick={() => setSelectedId(edge.forward.id)}
                                                className={cn(
                                                    "group/chip flex cursor-pointer items-center gap-1.5 rounded-full border bg-surface px-2.5 py-1 text-[10.5px] font-medium transition-colors shadow-sm",
                                                    active
                                                        ? "border-accent text-ink ring-1 ring-accent/30"
                                                        : "border-line-strong text-muted hover:text-ink"
                                                )}
                                            >
                                                <span className="flex items-center gap-1.5">
                                                    <ShieldCheck className="size-3 text-accent/80" />
                                                    {rule.title}
                                                </span>
                                                <button
                                                    type="button"
                                                    aria-label={`Unlink rule ${rule.title}`}
                                                    disabled={busy}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onUnlink(edge.forward, rule.id)
                                                    }}
                                                    className="grid size-3.5 place-items-center rounded-full text-faint opacity-60 transition-opacity hover:bg-surface-3 hover:text-danger hover:opacity-100 focus-visible:opacity-100 disabled:opacity-30"
                                                >
                                                    <X className="size-2.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {forwards.length > 0 && (
                    <div
                        data-control
                        className="absolute bottom-3 left-3 z-10 flex items-center gap-0.5 rounded-lg border border-line bg-surface/95 p-1 backdrop-blur"
                    >
                        <button
                            type="button"
                            aria-label="Zoom out"
                            onClick={() => zoomBy(0.88)}
                            className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                            <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-9 text-center font-mono text-[10px] text-faint">
                            {Math.round(view.scale * 100)}%
                        </span>
                        <button
                            type="button"
                            aria-label="Zoom in"
                            onClick={() => zoomBy(1.14)}
                            className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                            <Plus className="size-3.5" />
                        </button>
                        <div className="mx-0.5 h-4 w-px bg-line" />
                        <button
                            type="button"
                            aria-label="Fit to view"
                            onClick={fit}
                            className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                            <Maximize2 className="size-3" />
                        </button>
                        {nodeOffsets.size > 0 && (
                            <>
                                <div className="mx-0.5 h-4 w-px bg-line" />
                                <button
                                    type="button"
                                    aria-label="Reset node positions"
                                    title="Reset node positions"
                                    onClick={() => {
                                        setNodeOffsets(new Map())
                                        saveOffsets(new Map())
                                    }}
                                    className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                                >
                                    <RotateCcw className="size-3" />
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <footer className="border-t border-line bg-surface-2/40 px-4 py-3">
                {selected ? (
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-medium">
                                <span className="text-muted">{groupLabel(selected.listenId, groups)}</span>
                                <span className="mx-1.5 text-faint">→</span>
                                <span>{groupLabel(selected.sendId, groups)}</span>
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-faint">
                                <span>forward #{selected.id}</span>
                                <span>·</span>
                                {selected.rules.length === 0 ? (
                                    <span>no rules</span>
                                ) : (
                                    selected.rules.map((r) => (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => onSelectRule?.(r.id)}
                                            className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted transition-colors hover:bg-surface hover:text-ink"
                                            title="View prompt instruction"
                                        >
                                            <ShieldCheck className="size-2.5 text-accent" />
                                            {r.title}
                                        </button>
                                    ))
                                )}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                size="sm"
                                variant="secondary"
                                icon={<Link2 className="size-3.5" />}
                                onClick={() => onLink(selected)}
                                disabled={busy || selected.rules.length >= rules.length}
                                title={
                                    selected.rules.length >= rules.length
                                        ? "Every rule is already linked"
                                        : "Link an existing rule"
                                }
                            >
                                Link rule
                            </Button>
                            <Button
                                size="sm"
                                variant="danger"
                                icon={<Trash2 className="size-3.5" />}
                                onClick={() => onDelete(selected)}
                                disabled={busy}
                            >
                                Delete
                            </Button>
                            <button
                                type="button"
                                aria-label="Clear selection"
                                title="Clear selection (Esc)"
                                onClick={() => setSelectedId(null)}
                                className="grid size-8 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-3 hover:text-ink"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-[11.5px] text-faint">
                        Click a connection or a rule chip to manage it. Drag nodes to rearrange, drag the canvas to pan, ⌘/Ctrl + scroll to
                        zoom.
                    </p>
                )}
            </footer>
        </section>
    )
}
