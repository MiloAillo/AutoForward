import { botApi } from "../lib/api"
import type { Health } from "../types"
import { usePolling } from "./usePolling"

export function useHealth(intervalMs = 5000, enabled = true) {
    return usePolling<Health>(() => botApi.health(), intervalMs, enabled)
}
