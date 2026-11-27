import { useCallback, useEffect, useRef, useState } from "react"

export interface PollingResult<T> {
    data: T | null
    error: Error | null
    isLoading: boolean
    isFetching: boolean
    updatedAt: number | null
    refresh: () => void
}

export function usePolling<T>(
    fetcher: () => Promise<T>,
    intervalMs: number,
    enabled = true
): PollingResult<T> {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isFetching, setIsFetching] = useState(false)
    const [updatedAt, setUpdatedAt] = useState<number | null>(null)
    const [nonce, setNonce] = useState(0)

    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    const refresh = useCallback(() => setNonce((value) => value + 1), [])

    useEffect(() => {
        if (!enabled) {
            setIsLoading(false)
            return
        }

        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | undefined

        const run = async () => {
            setIsFetching(true)
            try {
                const result = await fetcherRef.current()
                if (cancelled) return
                setData(result)
                setError(null)
                setUpdatedAt(Date.now())
            } catch (cause) {
                if (cancelled) return
                setError(cause instanceof Error ? cause : new Error("Request failed"))
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                    setIsFetching(false)
                    timer = setTimeout(run, intervalMs)
                }
            }
        }

        void run()

        return () => {
            cancelled = true
            if (timer) clearTimeout(timer)
        }
    }, [intervalMs, enabled, nonce])

    return { data, error, isLoading, isFetching, updatedAt, refresh }
}
