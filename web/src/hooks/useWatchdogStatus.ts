import { watchdogApi } from "../lib/api"
import type { ContainerStatus } from "../types"
import { usePolling } from "./usePolling"

/**
 * Container state lives in the watchdog, so it stays readable while the bot
 * itself is stopped or crash-looping.
 */
export function useWatchdogStatus(enabled = true, intervalMs = 5000) {
    return usePolling<ContainerStatus>(() => watchdogApi.status(), intervalMs, enabled)
}
