import type { GroupsMap, ParsedLog } from "../types"

export function cn(...values: Array<string | false | null | undefined>): string {
    return values.filter(Boolean).join(" ")
}

export function formatUptime(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds))
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m ${seconds % 60}s`
}

export function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    const seconds = total % 60
    const pad = (n: number) => n.toString().padStart(2, "0")

    return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
}

export function relativeTime(iso: string | null | undefined): string {
    if (!iso) return "unknown"
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return "unknown"

    const diff = Math.max(0, Date.now() - then)
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
}

export function shortJid(jid: string): string {
    if (jid.endsWith("@g.us")) return jid.replace("@g.us", "")
    if (jid.endsWith("@s.whatsapp.net")) return `+${jid.replace("@s.whatsapp.net", "")}`
    if (jid.endsWith("@lid")) return jid.replace("@lid", "")
    return jid.split("@")[0] ?? jid
}

export function groupLabel(jid: string, groups: GroupsMap): string {
    const subject = groups[jid]?.subject
    if (typeof subject === "string" && subject.trim().length > 0) return subject
    return shortJid(jid)
}

export function groupSubtitle(jid: string): string {
    if (jid.endsWith("@g.us")) return "group"
    if (jid.endsWith("@s.whatsapp.net")) return "direct"
    if (jid.endsWith("@lid")) return "lid"
    if (jid.endsWith("@newsletter")) return "channel"
    return "chat"
}

const LEVELS = new Set(["INFO", "WARN", "ERROR", "DEBUG", "LOG", "TRACE"])

/**
 * Docker log output is multiplexed with 8-byte stream headers. Strip control
 * characters, then split the leading timestamp / level / message if present.
 */
export function parseLogLine(rawLine: string): ParsedLog {
    const cleaned = rawLine.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trimEnd()

    const structured = cleaned.match(
        /^(\d{4}-\d{2}-\d{2}T[\d:.,]+Z?)\s+\[?([A-Z]+)\]?\s+(.*)$/
    )
    if (structured) {
        const level = structured[2] as ParsedLog["level"]
        return {
            time: structured[1],
            level: LEVELS.has(level) ? level : "LOG",
            message: structured[3]
        }
    }

    const bracketed = cleaned.match(/^\[?([A-Z]{3,5})\]?\s+(.*)$/)
    if (bracketed && LEVELS.has(bracketed[1])) {
        return {
            time: null,
            level: bracketed[1] as ParsedLog["level"],
            message: bracketed[2]
        }
    }

    return { time: null, level: "LOG", message: cleaned }
}

export function formatClock(iso: string | null): string {
    if (!iso) return ""
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return iso
    return date.toLocaleTimeString("en-GB", { hour12: false })
}
