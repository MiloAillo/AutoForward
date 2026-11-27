import { useCallback, useEffect, useRef, useState } from "react"
import { Navbar } from "./components/layout/Navbar"
import { OfflineBanner, StatStrip } from "./components/dashboard/StatStrip"
import { ForwardMap } from "./components/dashboard/ForwardMap"
import { RulesPanel } from "./components/dashboard/RulesPanel"
import { LogsPanel } from "./components/dashboard/LogsPanel"
import { QrPanel } from "./components/dashboard/QrPanel"
import { AddForwardModal } from "./components/modals/AddForwardModal"
import { CreateRuleModal } from "./components/modals/CreateRuleModal"
import { LinkRuleModal } from "./components/modals/LinkRuleModal"
import { RuleDetailModal } from "./components/modals/RuleDetailModal"
import { ConfirmDialog } from "./components/modals/ConfirmDialog"
import { useToast } from "./components/ui/Toast"
import { useHealth } from "./hooks/useHealth"
import { useOverview } from "./hooks/useOverview"
import { useLogs } from "./hooks/useLogs"
import { useWatchdogStatus } from "./hooks/useWatchdogStatus"
import { botApi, watchdogApi } from "./lib/api"
import { isDemo } from "./lib/demo"
import { groupLabel } from "./lib/format"
import type { Forward, Rule } from "./types"

type ConfirmState =
    | { kind: "stop" }
    | { kind: "restart" }
    | { kind: "deleteForward"; forward: Forward }
    | { kind: "deleteRule"; rule: Rule }
    | { kind: "unlinkRule"; forward: Forward; ruleId: number; ruleTitle: string }

export default function App() {
    const { toast } = useToast()

    const demo = isDemo()

    const health = useHealth(5000)
    const overview = useOverview(15000)
    const logs = useLogs(4000)

    const [pendingAction, setPendingAction] = useState<string | null>(null)
    const [confirm, setConfirm] = useState<ConfirmState | null>(null)
    const [addForwardOpen, setAddForwardOpen] = useState(false)
    const [createRuleOpen, setCreateRuleOpen] = useState(false)
    const [linkTarget, setLinkTarget] = useState<Forward | null>(null)
    const [inspectRuleId, setInspectRuleId] = useState<number | null>(null)

    const forwards = overview.data?.forwards ?? []
    const rules = overview.data?.rules ?? []
    const groups = overview.data?.groups ?? {}

    const offline = Boolean(health.error) || !health.data
    const pairing = health.data?.socketStatus === "qr" && Boolean(health.data.qr)

    const prevSocketRef = useRef(health.data?.socketStatus)
    useEffect(() => {
        const current = health.data?.socketStatus
        const prev = prevSocketRef.current
        prevSocketRef.current = current

        if (current === "open" && prev && prev !== "open") {
            overview.refresh()
        }
    }, [health.data?.socketStatus, overview])

    const manageDisabled = offline || pairing
    const manageDisabledReason = offline
        ? "Bot is offline"
        : pairing
          ? "Scan QR to connect WhatsApp first"
          : undefined

    // Only poll Docker while the bot API is down - that is the state where
    // "stopped" vs "still booting" is the only useful information left.
    const watchdog = useWatchdogStatus(offline, 4000)

    const refreshAll = useCallback(() => {
        health.refresh()
        overview.refresh()
        logs.refresh()
        if (offline) watchdog.refresh()
    }, [health, overview, logs, watchdog, offline])

    const runBotAction = async (kind: "start" | "stop" | "restart") => {
        setPendingAction(kind)
        try {
            if (kind === "start") await watchdogApi.start()
            if (kind === "stop") await watchdogApi.stop()
            if (kind === "restart") await watchdogApi.restart()

            if (kind === "stop" || kind === "restart") {
                health.reset()
                overview.reset()
            }

            toast({
                title: `Bot ${kind === "start" ? "starting" : kind === "stop" ? "stopping" : "restarting"}`,
                description: "The watchdog accepted the command. Status will update automatically.",
                tone: "success"
            })

            window.setTimeout(() => {
                if (kind !== "stop") health.refresh()
                logs.refresh()
                watchdog.refresh()
            }, 2500)
        } catch (cause) {
            toast({
                title: "Watchdog error",
                description: cause instanceof Error ? cause.message : "Could not reach the watchdog.",
                tone: "error"
            })
        } finally {
            setPendingAction(null)
        }
    }

    const confirmContent = (() => {
        if (!confirm) return null
        switch (confirm.kind) {
            case "stop":
                return {
                    title: "Stop the bot?",
                    description:
                        "The container will shut down and message forwarding pauses until you start it again.",
                    confirmLabel: "Stop bot",
                    tone: "danger" as const,
                    onConfirm: () => runBotAction("stop")
                }
            case "restart":
                return {
                    title: "Restart the bot?",
                    description:
                        "The container restarts. Any in-flight batch is interrupted and will be retried on the next run.",
                    confirmLabel: "Restart bot",
                    tone: "danger" as const,
                    onConfirm: () => runBotAction("restart")
                }
            case "deleteForward":
                return {
                    title: `Delete forward #${confirm.forward.id}?`,
                    description: `The route ${groupLabel(confirm.forward.listenId, groups)} → ${groupLabel(
                        confirm.forward.sendId,
                        groups
                    )} will stop forwarding. Queued messages for this route are removed.`,
                    confirmLabel: "Delete forward",
                    tone: "danger" as const,
                    onConfirm: async () => {
                        await botApi.deleteForward(confirm.forward.id)
                        overview.refresh()
                        toast({ title: "Forward deleted", tone: "success" })
                    }
                }
            case "deleteRule":
                return {
                    title: `Delete rule "${confirm.rule.title}"?`,
                    description:
                        "Rules that are still linked to a forward cannot be deleted. Unlink it first.",
                    confirmLabel: "Delete rule",
                    tone: "danger" as const,
                    onConfirm: async () => {
                        await botApi.deleteRule(confirm.rule.id)
                        overview.refresh()
                        toast({ title: "Rule deleted", tone: "success" })
                    }
                }
            case "unlinkRule":
                return {
                    title: `Unlink "${confirm.ruleTitle}"?`,
                    description: `Forward #${confirm.forward.id} will stop using this rule. The rule itself stays available.`,
                    confirmLabel: "Unlink rule",
                    tone: "danger" as const,
                    onConfirm: async () => {
                        await botApi.unlinkRule(confirm.forward.id, confirm.ruleId)
                        overview.refresh()
                        toast({ title: "Rule unlinked", tone: "success" })
                    }
                }
        }
    })()

    return (
        <div className="min-h-dvh">
            <Navbar
                health={health.data}
                healthError={health.error}
                isFetching={health.isFetching || overview.isFetching}
                onRefresh={refreshAll}
                onStart={() => runBotAction("start")}
                onStop={() => setConfirm({ kind: "stop" })}
                onRestart={() => setConfirm({ kind: "restart" })}
                pendingAction={pendingAction}
            />

            <main className="mx-auto max-w-[1560px] space-y-4 px-4 py-5 sm:px-6">
                {offline && (
                    <OfflineBanner
                        onStart={() => runBotAction("start")}
                        pending={pendingAction === "start"}
                        container={demo ? null : watchdog.data}
                        watchdogError={demo ? null : watchdog.error}
                    />
                )}

                <StatStrip
                    health={health.data}
                    overview={overview.data}
                    loading={health.isLoading || overview.isLoading}
                />

                {pairing && health.data?.qr && (
                    <QrPanel qr={health.data.qr} onRefresh={health.refresh} refreshing={health.isFetching} />
                )}

                <div className="grid gap-4 xl:h-[620px] xl:grid-cols-[minmax(0,1fr)_384px]">
                    <ForwardMap
                        forwards={forwards}
                        rules={rules}
                        groups={groups}
                        loading={overview.isLoading}
                        onAdd={() => setAddForwardOpen(true)}
                        onDelete={(forward) => setConfirm({ kind: "deleteForward", forward })}
                        onUnlink={(forward, ruleId) => {
                            const rule = forward.rules.find((item) => item.id === ruleId)
                            setConfirm({
                                kind: "unlinkRule",
                                forward,
                                ruleId,
                                ruleTitle: rule?.title ?? `#${ruleId}`
                            })
                        }}
                        onLink={(forward) => setLinkTarget(forward)}
                        onSelectRule={(ruleId) => setInspectRuleId(ruleId)}
                        disabled={manageDisabled}
                        disabledReason={manageDisabledReason}
                        busy={overview.isFetching}
                    />

                    <RulesPanel
                        rules={rules}
                        forwards={forwards}
                        loading={overview.isLoading}
                        onCreate={() => setCreateRuleOpen(true)}
                        onSelectRule={(rule) => setInspectRuleId(rule.id)}
                        onDelete={(rule) => setConfirm({ kind: "deleteRule", rule })}
                        disabled={manageDisabled}
                        disabledReason={manageDisabledReason}
                        busy={overview.isFetching}
                    />
                </div>

                <LogsPanel
                    logs={logs.data}
                    error={logs.error}
                    loading={logs.isLoading}
                    isFetching={logs.isFetching}
                    onRefresh={logs.refresh}
                />

                <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pb-2 pt-1 text-center font-mono text-[10px] text-faint">
                    <span>bot {botApi.baseUrl}</span>
                    <span className="text-line-strong">·</span>
                    <span>watchdog {watchdogApi.baseUrl}</span>
                    <span className="text-line-strong">·</span>
                    <span>{overview.updatedAt ? `synced ${new Date(overview.updatedAt).toLocaleTimeString()}` : "waiting for sync"}</span>
                </footer>
            </main>

            <AddForwardModal
                open={addForwardOpen}
                onClose={() => setAddForwardOpen(false)}
                groups={groups}
                rules={rules}
                onCreated={overview.refresh}
            />

            <CreateRuleModal
                open={createRuleOpen}
                onClose={() => setCreateRuleOpen(false)}
                onCreated={overview.refresh}
            />

            <LinkRuleModal
                open={linkTarget !== null}
                onClose={() => setLinkTarget(null)}
                forward={linkTarget}
                rules={rules}
                onLinked={overview.refresh}
            />

            <RuleDetailModal
                open={inspectRuleId !== null}
                onClose={() => setInspectRuleId(null)}
                ruleId={inspectRuleId}
                groups={groups}
                onDelete={(rule) => setConfirm({ kind: "deleteRule", rule })}
                busy={overview.isFetching}
            />

            <ConfirmDialog
                open={confirm !== null}
                title={confirmContent?.title ?? ""}
                description={confirmContent?.description ?? ""}
                confirmLabel={confirmContent?.confirmLabel}
                tone={confirmContent?.tone}
                onConfirm={async () => {
                    await confirmContent?.onConfirm()
                }}
                onClose={() => setConfirm(null)}
            />
        </div>
    )
}
