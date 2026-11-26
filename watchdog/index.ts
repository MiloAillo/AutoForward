import Docker from "dockerode"
import express from "express"
import cors from "cors"

// env load
try {
  process.loadEnvFile(".env")
} catch (error) {
  // .env file not found - likely running in Docker with environment variables
  console.log("[Watchdog] .env file not found, using environment variables")
}

if (!process.env.WATCHDOG_HTTP_PORT) throw Error("WATCHDOG_HTTP_PORT needed inside .env")

const app = express()
const docker = new Docker({ socketPath: "/var/run/docker.sock" })
const AutoForward = docker.getContainer("autoforward-bot")

app.use(cors())

app.listen(Number(process.env.WATCHDOG_HTTP_PORT), "0.0.0.0", () => {
    console.log(`[Watchdog] Watchdog is supervising AutoForward bot at port ${process.env.WATCHDOG_HTTP_PORT}`)
})

app.post("/start", async (_req, res) => {
    try {
        await AutoForward.start()
        
        return res
        .status(200)
        .json({ ok: true })
    } catch (err: any) {
        return res
        .status(500)
        .json({ error: err.message })
    }
})

app.post("/stop", async (_req, res) => {
    try {
        await AutoForward.stop()
        
        return res
        .status(200)
        .json({ ok: true })
    } catch (err: any) {
        return res
        .status(500)
        .json({ error: err.message })
    }
})

app.post("/restart", async (_req, res) => {
    try {
        await AutoForward.restart()
        
        return res
        .status(200)
        .json({ ok: true })
    } catch (err: any) {
        return res
        .status(500)
        .json({ error: err.message })
    }
})


app.post("/kill", async (_req, res) => {
    try {
        await AutoForward.kill()
        
        return res
        .status(200)
        .json({ ok: true })
    } catch (err: any) {
        return res
        .status(500)
        .json({ error: err.message })
    }
})

app.get("/logs", async (_req, res) => {
    try {
        const logsBuffer = await AutoForward.logs({
            stdout: true,
            stderr: true,
            tail: 100 // last 100 lines
        })     
        
        const rawText = logsBuffer.toString("utf-8")
        
        // Clean Docker multiplex headers and split by line
        const lines = rawText.split("\n").filter(line => line.trim().length > 0)

        return res.status(200).json({
            lines,
            raw: rawText
        })
    } catch (err: any) {
        return res
        .status(500)
        .json({ error: err.message })
    }
})
