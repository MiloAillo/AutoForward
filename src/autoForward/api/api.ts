import express from "express"
import type { WASocket } from "../../classes/WASocket"
import type { PrismaStorage } from "../../classes/PrismaStorage"

const app = express()

app.use(express.json())

export function startInternalAPI(socket: WASocket, storage: PrismaStorage) {
    app.listen(process.env.INTERNAL_HTTP_PORT, () => {
        console.log("[api] AutoForward Internal API is online")
    })

    app.get("/health", async (req, res) => {
        const socketStatus = socket.getStatus()
        const dbStatus = await storage.checkHealth()
    
        res.json({
            process: "running",
            socketStatus: socketStatus,
            dbStatus: dbStatus
        })
    })
}