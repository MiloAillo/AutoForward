import { watchdogApi } from "../lib/api"
import type { LogPayload } from "../types"
import { usePolling } from "./usePolling"

export function useLogs(intervalMs = 4000, enabled = true) {
    return usePolling<LogPayload>(() => watchdogApi.logs(200), intervalMs, enabled)
}
