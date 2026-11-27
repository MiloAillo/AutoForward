import type { Health, SocketStatus } from "../types"

export type OverallStatus = "online" | "degraded" | "pairing" | "offline"

export interface StatusView {
    overall: OverallStatus
    label: string
    detail: string
}

export function socketLabel(status: SocketStatus | undefined): string {
    switch (status) {
        case "open":
            return "Connected"
        case "connecting":
            return "Connecting"
        case "qr":
            return "Pairing"
        case "dead":
            return "Offline"
        default:
            return "Unknown"
    }
}

export function deriveStatus(health: Health | null, error: Error | null): StatusView {
    if (error || !health) {
        return {
            overall: "offline",
            label: "Unreachable",
            detail: "The bot process is not responding on its internal API."
        }
    }

    if (health.socketStatus === "qr") {
        return {
            overall: "pairing",
            label: "Pairing required",
            detail: "Scan the QR code to link the WhatsApp account."
        }
    }

    if (health.socketStatus === "dead") {
        return {
            overall: "offline",
            label: "Socket dead",
            detail: "WhatsApp session ended. Restart the bot to reconnect."
        }
    }

    if (health.socketStatus === "connecting") {
        return {
            overall: "degraded",
            label: "Connecting",
            detail: "The WhatsApp socket is still establishing a session."
        }
    }

    if (!health.dbStatus?.ok) {
        return {
            overall: "degraded",
            label: "Database issue",
            detail: health.dbStatus?.error ?? "The database health check failed."
        }
    }

    return {
        overall: "online",
        label: "All systems go",
        detail: "Socket connected and database responding."
    }
}
