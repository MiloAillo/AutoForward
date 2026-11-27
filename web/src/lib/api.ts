import type {
    ContainerStatus,
    Forward,
    GroupsMap,
    Health,
    LogPayload,
    Overview,
    Rule,
    RuleDetail
} from "../types"
import { demoStore, isDemo } from "./demo"

const BOT_URL = (import.meta.env.VITE_BOT_URL ?? "http://localhost:3001").replace(/\/$/, "")
const WATCHDOG_URL = (import.meta.env.VITE_WATCHDOG_URL ?? "http://localhost:3002").replace(/\/$/, "")

export class ApiError extends Error {
    status: number
    details: unknown

    constructor(message: string, status: number, details?: unknown) {
        super(message)
        this.name = "ApiError"
        this.status = status
        this.details = details
    }
}

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
    let res: Response
    try {
        res = await fetch(`${base}${path}`, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                ...(init?.headers ?? {})
            }
        })
    } catch {
        throw new ApiError("Cannot reach the service. It may be offline.", 0)
    }

    const text = await res.text()
    let payload: unknown = null
    if (text) {
        try {
            payload = JSON.parse(text)
        } catch {
            payload = { error: text }
        }
    }

    if (!res.ok) {
        const body = payload as { error?: string; details?: unknown } | null
        throw new ApiError(body?.error ?? res.statusText, res.status, body?.details)
    }

    return payload as T
}

const unwrap = <T>(payload: { data: T }): T => payload.data

export const botApi = {
    baseUrl: BOT_URL,

    health: async (): Promise<Health> => {
        if (isDemo()) return demoStore.getHealth()
        return request<Health>(BOT_URL, "/health")
    },

    overview: async (): Promise<Overview> => {
        if (isDemo()) return demoStore.getOverview()
        return request<Overview>(BOT_URL, "/overview")
    },

    groups: async (): Promise<GroupsMap> => {
        if (isDemo()) return demoStore.getOverview().groups
        return request<{ data: GroupsMap }>(BOT_URL, "/groups").then(unwrap)
    },

    forwards: async (): Promise<Forward[]> => {
        if (isDemo()) return demoStore.getOverview().forwards
        return request<{ data: Forward[] }>(BOT_URL, "/forwards").then(unwrap)
    },

    forward: async (id: number): Promise<Forward> => {
        if (isDemo()) {
            const f = demoStore.getOverview().forwards.find((item) => item.id === id)
            if (!f) throw new ApiError(`Forward #${id} not found`, 404)
            return f
        }
        return request<{ data: Forward }>(BOT_URL, `/forwards/${id}`).then(unwrap)
    },

    createForward: async (input: {
        listenId: string
        sendId: string
        ruleIds: number[]
    }): Promise<Forward> => {
        if (isDemo()) return demoStore.createForward(input)
        return request<{ data: Forward }>(BOT_URL, "/forwards", {
            method: "POST",
            body: JSON.stringify(input)
        }).then(unwrap)
    },

    deleteForward: async (id: number): Promise<Forward> => {
        if (isDemo()) return demoStore.deleteForward(id)
        return request<{ data: Forward }>(BOT_URL, `/forwards/${id}`, { method: "DELETE" }).then(
            unwrap
        )
    },

    linkRule: async (forwardId: number, ruleId: number): Promise<Forward> => {
        if (isDemo()) return demoStore.linkRule(forwardId, ruleId)
        return request<{ data: Forward }>(BOT_URL, `/forwards/${forwardId}/rules/${ruleId}`, {
            method: "POST"
        }).then(unwrap)
    },

    unlinkRule: async (forwardId: number, ruleId: number): Promise<Forward> => {
        if (isDemo()) return demoStore.unlinkRule(forwardId, ruleId)
        return request<{ data: Forward }>(BOT_URL, `/forwards/${forwardId}/rules/${ruleId}`, {
            method: "DELETE"
        }).then(unwrap)
    },

    rules: async (): Promise<Rule[]> => {
        if (isDemo()) return demoStore.getOverview().rules
        return request<{ data: Rule[] }>(BOT_URL, "/rules").then(unwrap)
    },

    rule: async (id: number): Promise<RuleDetail> => {
        if (isDemo()) {
            return demoStore.getRule(id)
        }
        return request<{ data: RuleDetail }>(BOT_URL, `/rules/${id}`).then(unwrap)
    },

    createRule: async (input: {
        title: string
        description: string
        rule: string
    }): Promise<Rule> => {
        if (isDemo()) return demoStore.createRule(input)
        return request<{ data: Rule }>(BOT_URL, "/rules", {
            method: "POST",
            body: JSON.stringify(input)
        }).then(unwrap)
    },

    deleteRule: async (id: number): Promise<Rule> => {
        if (isDemo()) return demoStore.deleteRule(id)
        return request<{ data: Rule }>(BOT_URL, `/rules/${id}`, { method: "DELETE" }).then(unwrap)
    }
}

export const watchdogApi = {
    baseUrl: WATCHDOG_URL,

    status: async (): Promise<ContainerStatus> => {
        if (isDemo()) return demoStore.getContainer()
        return request<ContainerStatus>(WATCHDOG_URL, "/status")
    },

    start: async (): Promise<{ ok: boolean }> => {
        if (isDemo()) return demoStore.lifecycle("start")
        return request<{ ok: boolean }>(WATCHDOG_URL, "/start", { method: "POST" })
    },

    stop: async (): Promise<{ ok: boolean }> => {
        if (isDemo()) return demoStore.lifecycle("stop")
        return request<{ ok: boolean }>(WATCHDOG_URL, "/stop", { method: "POST" })
    },

    restart: async (): Promise<{ ok: boolean }> => {
        if (isDemo()) return demoStore.lifecycle("restart")
        return request<{ ok: boolean }>(WATCHDOG_URL, "/restart", { method: "POST" })
    },

    logs: async (_tail = 100): Promise<LogPayload> => {
        if (isDemo()) return demoStore.getLogs()
        return request<LogPayload>(WATCHDOG_URL, `/logs?tail=${_tail}`)
    }
}
