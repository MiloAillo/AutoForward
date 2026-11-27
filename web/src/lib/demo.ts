import type { ContainerStatus, Forward, Health, LogPayload, Overview, Rule, RuleDetail } from "../types"

const DEMO_STARTED_AT = new Date(Date.now() - (3 * 86400 + 14 * 3600 + 22 * 60) * 1000).toISOString()
const DEMO_NEXT_BATCH = new Date(Date.now() + 12 * 60 * 1000 + 47 * 1000).toISOString()

export function isDemo(): boolean {
    if (import.meta.env.VITE_DEMO === "1") return true
    if (typeof window === "undefined") return false
    return new URLSearchParams(window.location.search).has("demo")
}

let demoHealthState: Health = {
    process: "running",
    socketStatus: "open",
    dbStatus: { ok: true, latencyMs: 4 },
    qr: null,
    startedAt: DEMO_STARTED_AT,
    uptimeSeconds: 3 * 86400 + 14 * 3600 + 22 * 60,
    batchIntervalMinutes: 30,
    nextBatchAt: DEMO_NEXT_BATCH
}

let demoContainerState: ContainerStatus = {
    name: "autoforward-bot",
    running: true,
    status: "running",
    startedAt: DEMO_STARTED_AT,
    finishedAt: null,
    restartCount: 0
}

let demoRules: RuleDetail[] = [
    {
        id: 1,
        title: "Urgent only",
        description: "Forward only messages that need a same-day response.",
        rule: "Forward only if the message contains an explicit request for immediate same-day action, words like urgent, ASAP, emergency, or critical downtime. Drop casual banter, general questions, or non-urgent status reports."
    },
    {
        id: 2,
        title: "No spam",
        description: "Drop promos, chain messages and forwarded posters.",
        rule: "Skip and drop any promotional content, discount flyers, event advertisements, chain messages, viral broadcasts, and holiday greetings. Mark as sent without forwarding."
    },
    {
        id: 3,
        title: "Invoice keywords",
        description: "Forward anything mentioning invoice, payment or PO.",
        rule: "Forward any message mentioning invoice, billing, payment receipt, bank transfer, PO, purchase order, or payment confirmation, along with any attached documents or images."
    }
]

let demoForwards: Forward[] = [
    {
        id: 1,
        listenId: "120363024512345@g.us",
        sendId: "120363098765432@g.us",
        rules: [
            { id: 1, title: "Urgent only" },
            { id: 2, title: "No spam" }
        ]
    },
    {
        id: 2,
        listenId: "120363024512345@g.us",
        sendId: "120363444555666@g.us",
        rules: [{ id: 3, title: "Invoice keywords" }]
    },
    {
        id: 3,
        listenId: "120363111222333@g.us",
        sendId: "120363098765432@g.us",
        rules: []
    },
    {
        id: 4,
        listenId: "120363777888999@g.us",
        sendId: "120363444555666@g.us",
        rules: [{ id: 2, title: "No spam" }]
    }
]

const demoGroups = {
    "120363024512345@g.us": { subject: "Tim Marketing" },
    "120363098765432@g.us": { subject: "Tim Ops" },
    "120363111222333@g.us": { subject: "Grup Alumni" },
    "120363444555666@g.us": { subject: "Tim Support" },
    "120363777888999@g.us": { subject: "Kantor Pusat" }
}

let nextForwardId = 5
let nextRuleId = 4

const now = () => new Date().toISOString()

let demoLogsLines = [
    `${now()} [INFO] socket connection open — Auto Forward linked`,
    `${now()} [INFO] PrismaStorage Fetched 4 forward item(s) with unsent messages`,
    `${now()} [INFO] msgCronBatchForward Processing 2 forward item(s)`,
    `${now()} [INFO] aiReadyFormatter Built context for forward 1 (3 chats)`,
    `${now()} [INFO] analyseAndDecide rule "Urgent only" approved 2 message(s)`,
    `${now()} [INFO] forwardMessages sent 2/2 to 120363098765432@g.us`,
    `${now()} [WARN] rate limiter delaying 1000ms before next send`,
    `${now()} [INFO] forwardMessages sent 1/1 to 120363444555666@g.us`,
    `${now()} [INFO] PrismaStorage Marked 3 message(s) as sent`,
    `${now()} [INFO] msgCronBatchForward Batch complete in 8421ms`,
    `${now()} [INFO] msgCronCleanup Deleted 0 unsent message(s) older than 7 days`,
    `${now()} [ERROR] modelProvider timeout after 30000ms — retrying next batch`
]

export const demoStore = {
    getHealth(): Health {
        return { ...demoHealthState }
    },

    getContainer(): ContainerStatus {
        return { ...demoContainerState }
    },

    getOverview(): Overview {
        return {
            groups: { ...demoGroups },
            rules: [...demoRules],
            forwards: structuredClone(demoForwards)
        }
    },

    getLogs(): LogPayload {
        return { lines: [...demoLogsLines], raw: demoLogsLines.join("\n") }
    },

    createForward(input: { listenId: string; sendId: string; ruleIds: number[] }): Forward {
        const rules = demoRules
            .filter((rule) => input.ruleIds.includes(rule.id))
            .map((r) => ({ id: r.id, title: r.title }))

        const forward: Forward = {
            id: nextForwardId++,
            listenId: input.listenId,
            sendId: input.sendId,
            rules
        }
        demoForwards.push(forward)
        demoLogsLines.push(`${now()} [INFO] created forward #${forward.id}: ${input.listenId} → ${input.sendId}`)
        return forward
    },

    deleteForward(id: number): Forward {
        const index = demoForwards.findIndex((f) => f.id === id)
        if (index === -1) throw new Error(`Forward #${id} not found`)
        const [removed] = demoForwards.splice(index, 1)
        demoLogsLines.push(`${now()} [INFO] deleted forward #${id}`)
        return removed!
    },

    createRule(input: { title: string; description: string; rule: string }): RuleDetail {
        const rule: RuleDetail = {
            id: nextRuleId++,
            title: input.title,
            description: input.description,
            rule: input.rule
        }
        demoRules.push(rule)
        demoLogsLines.push(`${now()} [INFO] created rule #${rule.id} "${rule.title}"`)
        return rule
    },

    getRule(id: number): RuleDetail {
        const rule = demoRules.find((r) => r.id === id)
        if (!rule) throw new Error(`Rule #${id} not found`)
        const forwardItems = demoForwards
            .filter((f) => f.rules.some((r) => r.id === id))
            .map((f) => ({ id: f.id, listenId: f.listenId, sendId: f.sendId }))
        return {
            ...rule,
            forwardItems
        }
    },

    deleteRule(id: number): Rule {
        const isUsed = demoForwards.some((f) => f.rules.some((r) => r.id === id))
        if (isUsed) {
            throw new Error(`Cannot delete rule #${id} — it is still linked to one or more forwards`)
        }
        const index = demoRules.findIndex((r) => r.id === id)
        if (index === -1) throw new Error(`Rule #${id} not found`)
        const [removed] = demoRules.splice(index, 1)
        demoLogsLines.push(`${now()} [INFO] deleted rule #${id}`)
        return removed!
    },

    linkRule(forwardId: number, ruleId: number): Forward {
        const forward = demoForwards.find((f) => f.id === forwardId)
        if (!forward) throw new Error(`Forward #${forwardId} not found`)
        const rule = demoRules.find((r) => r.id === ruleId)
        if (!rule) throw new Error(`Rule #${ruleId} not found`)

        if (!forward.rules.some((r) => r.id === ruleId)) {
            forward.rules.push({ id: rule.id, title: rule.title })
        }
        demoLogsLines.push(`${now()} [INFO] linked rule #${ruleId} to forward #${forwardId}`)
        return forward
    },

    unlinkRule(forwardId: number, ruleId: number): Forward {
        const forward = demoForwards.find((f) => f.id === forwardId)
        if (!forward) throw new Error(`Forward #${forwardId} not found`)
        forward.rules = forward.rules.filter((r) => r.id !== ruleId)
        demoLogsLines.push(`${now()} [INFO] unlinked rule #${ruleId} from forward #${forwardId}`)
        return forward
    },

    lifecycle(action: "start" | "stop" | "restart"): { ok: boolean } {
        if (action === "start") {
            demoContainerState = { ...demoContainerState, running: true, status: "running" }
            demoHealthState = { ...demoHealthState, process: "running", socketStatus: "open" }
            demoLogsLines.push(`${now()} [INFO] bot started via watchdog`)
        } else if (action === "stop") {
            demoContainerState = { ...demoContainerState, running: false, status: "exited" }
            demoHealthState = { ...demoHealthState, process: "stopped", socketStatus: "dead" }
            demoLogsLines.push(`${now()} [WARN] bot stopped via watchdog`)
        } else if (action === "restart") {
            demoLogsLines.push(`${now()} [INFO] bot restart requested via watchdog`)
        }
        return { ok: true }
    }
}
