export type SocketStatus = "dead" | "connecting" | "open" | "qr"

export interface DbHealth {
    ok: boolean
    latencyMs?: number
    error?: string
}

export interface Health {
    process: string
    socketStatus: SocketStatus
    dbStatus: DbHealth
    qr: string | null
    startedAt?: string
    uptimeSeconds?: number
    batchIntervalMinutes?: number
    nextBatchAt?: string | null
}

export interface GroupInfo {
    subject?: string
    id?: string
    [key: string]: unknown
}

export type GroupsMap = Record<string, GroupInfo>

export interface RuleRef {
    id: number
    title: string
}

export interface Rule extends RuleRef {
    description?: string
}

export interface ForwardRouteRef {
    id: number
    listenId: string
    sendId: string
}

export interface RuleDetail extends Rule {
    rule: string
    forwardItems?: ForwardRouteRef[]
}

export interface Forward {
    id: number
    listenId: string
    sendId: string
    rules: RuleRef[]
}

export interface Overview {
    forwards: Forward[]
    rules: Rule[]
    groups: GroupsMap
}

export interface LogPayload {
    lines: string[]
    raw?: string
}

export interface ContainerStatus {
    name: string
    running: boolean
    status: string
    startedAt?: string | null
    finishedAt?: string | null
    restartCount?: number
}

export interface ParsedLog {
    time: string | null
    level: "INFO" | "WARN" | "ERROR" | "DEBUG" | "LOG"
    message: string
}
