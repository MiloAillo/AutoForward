import { useCallback, useEffect, useRef, useState } from "react"

export interface PollingResult<T> {
    data: T | null
    error: Error | null
    isLoading: boolean
    isFetching: boolean
    updatedAt: number | null
    refresh: () => void
    reset: () => void
}

export interface PollingOptions {
    enabled?: boolean
    clearOnError?: boolean
}

export function usePolling<T>(
    fetcher: () => Promise<T>,
    intervalMs: number,
    options: boolean | PollingOptions = true
): PollingResult<T> {
    const enabled = typeof options === "boolean" ? options : (options.enabled ?? true)
    const clearOnError = typeof options === "object" ? (options.clearOnError ?? false) : false

    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<Error | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isFetching, setIsFetching] = useState(false)
    const [updatedAt, setUpdatedAt] = useState<number | null>(null)
    const [nonce, setNonce] = useState(0)
    const generationRef = useRef(0)

    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    const cancelRef = useRef<(() => void) | null>(null)

    const refresh = useCallback(() => setNonce((value) => value + 1), [])
    const reset = useCallback(() => {
        cancelRef.current?.()
        generationRef.current++
        setData(null)
        setError(null)
        setUpdatedAt(null)
        // restart polling; next fetch that succeeds must match current generation
        setNonce((value) => value + 1)
    }, [])

    useEffect(() => {
        if (!enabled) {
            setIsLoading(false)
            return
        }

        let cancelled = false
        let timer: ReturnType<typeof setTimeout> | undefined
        const gen = generationRef.current
        cancelRef.current = () => {
            cancelled = true
            if (timer) clearTimeout(timer)
        }

        const run = async () => {
            setIsFetching(true)
            try {
                const result = await fetcherRef.current()
                if (cancelled || gen !== generationRef.current) return
                setData(result)
                setError(null)
                setUpdatedAt(Date.now())
            } catch (cause) {
                if (cancelled || gen !== generationRef.current) return
                setError(cause instanceof Error ? cause : new Error("Request failed"))
                if (clearOnError) {
                    setData(null)
                }
            } finally {
                if (!cancelled && gen === generationRef.current) {
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
    }, [intervalMs, enabled, nonce, clearOnError])

    return { data, error, isLoading, isFetching, updatedAt, refresh, reset }
}
