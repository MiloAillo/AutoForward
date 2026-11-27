import { botApi } from "../lib/api"
import type { Overview } from "../types"
import { usePolling } from "./usePolling"

export function useOverview(intervalMs = 15000, enabled = true) {
    return usePolling<Overview>(() => botApi.overview(), intervalMs, enabled)
}
