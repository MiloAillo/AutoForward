import express from "express"
import type { WASocket } from "../../classes/WASocket.ts"
import type { PrismaStorage } from "../../classes/PrismaStorage.ts"
import type { CacheStorage } from "../../classes/CacheStorage.ts"
import {
    CreateForwardSchema,
    CreateRuleSchema,
    ForwardRuleParamSchema,
    IdParamSchema
} from "../../schema.ts"

const app = express()

app.use(express.json())

export function startInternalAPI(socket: WASocket, prismaStorage: PrismaStorage, cacheStorage: CacheStorage) {
    const port = Number(process.env.INTERNAL_HTTP_PORT) || 3001

    app.listen(port, "0.0.0.0", () => {
        console.log(`[api] AutoForward Internal API online on port ${port}`)
    })

    // Health
    app.get("/health", async (_req, res) => {
        try {
            const socketStatus = socket.getStatus()
            const dbStatus = await prismaStorage.checkHealth()
            const qr = socket.getQR()

            return res.status(200).json({
                process: "running",
                socketStatus,
                dbStatus,
                qr
            })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    // System Overview
    app.get("/overview", async (_req, res) => {
        try {
            const [forwards, rules, groups] = await Promise.all([
                prismaStorage.getForwards(),
                prismaStorage.getRules(),
                cacheStorage.getGroups()
            ])

            return res.status(200).json({
                forwards,
                rules,
                groups
            })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    // Groups
    app.get("/groups", async (_req, res) => {
        try {
            const data = await cacheStorage.getGroups()
            return res.status(200).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    // Forwards CRUD
    app.get("/forwards", async (_req, res) => {
        try {
            const data = await prismaStorage.getForwards()
            return res.status(200).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    app.get("/forwards/:id", async (req, res) => {
        const parsed = IdParamSchema.safeParse(req.params)
        if (!parsed.success) {
            return res.status(400).json({
                error: "validation failed",
                details: parsed.error.issues
            })
        }

        try {
            const data = await prismaStorage.getForward(parsed.data.id)
            if (!data) {
                return res.status(404).json({ error: `Forward ${parsed.data.id} not found` })
            }
            return res.status(200).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    app.post("/forwards", async (req, res) => {
        const parsed = CreateForwardSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                error: "validation failed",
                details: parsed.error.issues
            })
        }

        const { listenId, sendId, ruleIds } = parsed.data

        try {
            const data = await prismaStorage.addForwardItem({
                listenId,
                sendId,
                rules: ruleIds
            })
            return res.status(201).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    app.delete("/forwards/:id", async (req, res) => {
        const parsed = IdParamSchema.safeParse(req.params)
        if (!parsed.success) {
            return res.status(400).json({
                error: "validation failed",
                details: parsed.error.issues
            })
        }

        try {
            const data = await prismaStorage.deleteForwardItem(parsed.data.id)
            return res.status(200).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    // Forward Rules relationship
    app.post("/forwards/:id/rules/:ruleId", async (req, res) => {
        const parsed = ForwardRuleParamSchema.safeParse(req.params)
        if (!parsed.success) {
            return res.status(400).json({
                error: "validation failed",
                details: parsed.error.issues
            })
        }

        try {
            const data = await prismaStorage.linkRule(parsed.data.id, parsed.data.ruleId)
            return res.status(201).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    app.delete("/forwards/:id/rules/:ruleId", async (req, res) => {
        const parsed = ForwardRuleParamSchema.safeParse(req.params)
        if (!parsed.success) {
            return res.status(400).json({
                error: "validation failed",
                details: parsed.error.issues
            })
        }

        try {
            const data = await prismaStorage.unlinkRule(parsed.data.id, parsed.data.ruleId)
            return res.status(200).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    // Rules CRUD
    app.get("/rules", async (_req, res) => {
        try {
            const data = await prismaStorage.getRules()
            return res.status(200).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    app.get("/rules/:id", async (req, res) => {
        const parsed = IdParamSchema.safeParse(req.params)
        if (!parsed.success) {
            return res.status(400).json({
                error: "validation failed",
                details: parsed.error.issues
            })
        }

        try {
            const data = await prismaStorage.getRule(parsed.data.id)
            if (!data) {
                return res.status(404).json({ error: `Rule ${parsed.data.id} not found` })
            }
            return res.status(200).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    app.post("/rules", async (req, res) => {
        const parsed = CreateRuleSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                error: "validation failed",
                details: parsed.error.issues
            })
        }

        const { title, description, rule } = parsed.data

        try {
            const data = await prismaStorage.createRule({ title, description, rule })
            return res.status(201).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })

    app.delete("/rules/:id", async (req, res) => {
        const parsed = IdParamSchema.safeParse(req.params)
        if (!parsed.success) {
            return res.status(400).json({
                error: "validation failed",
                details: parsed.error.issues
            })
        }

        try {
            const data = await prismaStorage.deleteRule(parsed.data.id)
            return res.status(200).json({ data })
        } catch (err: any) {
            return res.status(500).json({ error: err.message })
        }
    })
}
