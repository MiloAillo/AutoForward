import Docker from "dockerode"
import express from "express"
import cors from "cors"

// env load
try {
    process.loadEnvFile(".env")
} catch {
    // .env file not found - likely running in Docker with environment variables
    console.log("[Watchdog] .env file not found, using environment variables")
}

if (!process.env.WATCHDOG_HTTP_PORT) throw Error("WATCHDOG_HTTP_PORT needed inside .env")

const BOT_CONTAINER = process.env.BOT_CONTAINER_NAME || "autoforward-bot"
const DEFAULT_TAIL = 100

const app = express()
const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock" })
const bot = docker.getContainer(BOT_CONTAINER)

app.use(cors())
app.use(express.json())

/**
 * Docker multiplexes stdout and stderr into frames when the container has no
 * TTY: 8-byte header (stream, 3 padding bytes, 4-byte big-endian length) followed
 * by the payload. TTY containers emit raw text instead, so detect before parsing.
 */
function decodeLogStream(buffer: Buffer): string {
    const looksFramed =
        buffer.length >= 8 &&
        (buffer[0] === 0 || buffer[0] === 1 || buffer[0] === 2) &&
        buffer[1] === 0 &&
        buffer[2] === 0 &&
        buffer[3] === 0

    if (!looksFramed) return buffer.toString("utf-8")

    const parts: string[] = []
    let offset = 0

    while (offset + 8 <= buffer.length) {
        const size = buffer.readUInt32BE(offset + 4)
        const start = offset + 8
        const end = start + size
        if (size === 0 || end > buffer.length) break
        parts.push(buffer.subarray(start, end).toString("utf-8"))
        offset = end
    }

    return parts.length > 0 ? parts.join("") : buffer.toString("utf-8")
}

function sendError(res: express.Response, err: any, fallback: string) {
    const status = typeof err?.statusCode === "number" ? err.statusCode : 500
    const message: string = err?.json?.message || err?.reason || err?.message || fallback

    // Docker answers 304/409 when the requested state already holds.
    if (status === 304 || status === 409) {
        return res.status(200).json({ ok: true, already: true, message })
    }

    if (status === 404) {
        return res.status(404).json({ error: `Container "${BOT_CONTAINER}" not found` })
    }

    return res.status(500).json({ error: message })
}

async function lifecycle(action: "start" | "stop" | "restart" | "kill", res: express.Response) {
    try {
        if (action === "start") await bot.start()
        else if (action === "stop") await bot.stop()
        else if (action === "restart") await bot.restart()
        else await bot.kill()

        console.log(`[Watchdog] ${action} requested for ${BOT_CONTAINER}`)
        return res.status(200).json({ ok: true })
    } catch (err: any) {
        console.error(`[Watchdog] ${action} failed:`, err?.message)
        return sendError(res, err, `Could not ${action} ${BOT_CONTAINER}`)
    }
}

app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true })
})

app.get("/status", async (_req, res) => {
    try {
        const info = await bot.inspect()
        const state = info.State ?? {}

        return res.status(200).json({
            name: info.Name?.replace(/^\//, "") ?? BOT_CONTAINER,
            running: Boolean(state.Running),
            status: state.Status ?? "unknown",
            startedAt: state.StartedAt ?? null,
            finishedAt: state.FinishedAt ?? null,
            restartCount: info.RestartCount ?? 0
        })
    } catch (err: any) {
        if (err?.statusCode === 404) {
            return res.status(200).json({ name: BOT_CONTAINER, running: false, status: "missing" })
        }
        return sendError(res, err, "Could not inspect the bot container")
    }
})

app.post("/start", (_req, res) => lifecycle("start", res))
app.post("/stop", (_req, res) => lifecycle("stop", res))
app.post("/restart", (_req, res) => lifecycle("restart", res))
app.post("/kill", (_req, res) => lifecycle("kill", res))

app.get("/logs", async (req, res) => {
    const requested = Number(req.query.tail)
    const tail = Number.isFinite(requested) && requested > 0 ? Math.min(5000, Math.floor(requested)) : DEFAULT_TAIL

    try {
        const logsBuffer = await bot.logs({ stdout: true, stderr: true, tail, timestamps: false })
        const text = decodeLogStream(logsBuffer)
        const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)

        return res.status(200).json({ lines, raw: text, tail })
    } catch (err: any) {
        if (err?.statusCode === 404) {
            return res.status(200).json({ lines: [], raw: "", tail, error: `Container "${BOT_CONTAINER}" not found` })
        }
        return sendError(res, err, "Could not read container logs")
    }
})

app.use((_req, res) => {
    res.status(404).json({ error: "Unknown watchdog route" })
})

app.listen(Number(process.env.WATCHDOG_HTTP_PORT), "0.0.0.0", () => {
    console.log(
        `[Watchdog] Supervising "${BOT_CONTAINER}" on port ${process.env.WATCHDOG_HTTP_PORT}`
    )
})
