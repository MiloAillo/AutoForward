import type { Forward } from "../types"

export interface GraphNode {
    jid: string
    side: "listen" | "send"
    x: number
    y: number
    width: number
    height: number
    edgeCount: number
}

export interface GraphEdge {
    forward: Forward
    path: string
    midX: number
    midY: number
    labelX: number
    labelY: number
    anchorX: number
    anchorY: number
    from: GraphNode
    to: GraphNode
    controls: {
        x1: number
        y1: number
        c1x: number
        c1y: number
        c2x: number
        c2y: number
        x2: number
        y2: number
    }
}

export interface GraphLayout {
    nodes: GraphNode[]
    edges: GraphEdge[]
    width: number
    height: number
    columns: { left: number; right: number }
}

const NODE_WIDTH = 228
const NODE_HEIGHT = 64
const PAD_X = 56
const PAD_Y = 44
const ROW_GAP = 26
const MIN_WIDTH = 860

export function buildGraph(forwards: Forward[]): GraphLayout {
    const listenJids: string[] = []
    const sendJids: string[] = []
    const listenCount = new Map<string, number>()
    const sendCount = new Map<string, number>()

    for (const forward of forwards) {
        if (!listenJids.includes(forward.listenId)) listenJids.push(forward.listenId)
        if (!sendJids.includes(forward.sendId)) sendJids.push(forward.sendId)
        listenCount.set(forward.listenId, (listenCount.get(forward.listenId) ?? 0) + 1)
        sendCount.set(forward.sendId, (sendCount.get(forward.sendId) ?? 0) + 1)
    }

    // Barycenter sort keeps long edges from crossing more than necessary.
    const listenIndex = new Map(listenJids.map((jid, index) => [jid, index]))
    const sendScore = new Map<string, number>()
    for (const forward of forwards) {
        const score = listenIndex.get(forward.listenId) ?? 0
        const current = sendScore.get(forward.sendId)
        sendScore.set(forward.sendId, current === undefined ? score : (current + score) / 2)
    }
    sendJids.sort((a, b) => (sendScore.get(a) ?? 0) - (sendScore.get(b) ?? 0))

    const rows = Math.max(listenJids.length, sendJids.length, 1)
    const width = Math.max(MIN_WIDTH, PAD_X * 2 + NODE_WIDTH * 2 + 260)
    const height = PAD_Y * 2 + rows * NODE_HEIGHT + (rows - 1) * ROW_GAP

    const leftX = PAD_X
    const rightX = width - PAD_X - NODE_WIDTH
    const rowStep = NODE_HEIGHT + ROW_GAP

    const centerColumn = (count: number) => {
        const total = count * NODE_HEIGHT + Math.max(0, count - 1) * ROW_GAP
        return PAD_Y + Math.max(0, (height - PAD_Y * 2 - total) / 2)
    }

    const listenTop = centerColumn(listenJids.length)
    const sendTop = centerColumn(sendJids.length)

    const nodeMap = new Map<string, GraphNode>()
    const nodes: GraphNode[] = []

    listenJids.forEach((jid, index) => {
        const node: GraphNode = {
            jid,
            side: "listen",
            x: leftX,
            y: listenTop + index * rowStep,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            edgeCount: listenCount.get(jid) ?? 0
        }
        nodes.push(node)
        nodeMap.set(`listen:${jid}`, node)
    })

    sendJids.forEach((jid, index) => {
        const node: GraphNode = {
            jid,
            side: "send",
            x: rightX,
            y: sendTop + index * rowStep,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            edgeCount: sendCount.get(jid) ?? 0
        }
        nodes.push(node)
        nodeMap.set(`send:${jid}`, node)
    })

    const edges: GraphEdge[] = []
    for (const forward of forwards) {
        const from = nodeMap.get(`listen:${forward.listenId}`)
        const to = nodeMap.get(`send:${forward.sendId}`)
        if (!from || !to) continue

        const x1 = from.x + from.width
        const y1 = from.y + from.height / 2
        const x2 = to.x
        const y2 = to.y + to.height / 2
        const curve = Math.max(60, (x2 - x1) * 0.48)

        const c1x = x1 + curve
        const c1y = y1
        const c2x = x2 - curve
        const c2y = y2

        const path = `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`

        // Point on cubic bezier at t = 0.5
        const midX = (x1 + 3 * c1x + 3 * c2x + x2) / 8
        const midY = (y1 + 3 * c1y + 3 * c2y + y2) / 8

        edges.push({
            forward,
            path,
            midX,
            midY,
            labelX: midX,
            labelY: midY,
            anchorX: midX,
            anchorY: midY,
            from,
            to,
            controls: { x1, y1, c1x, c1y, c2x, c2y, x2, y2 }
        })
    }

    // Labels sit on the curve. When curves cross, slide the label along its own
    // curve first, then nudge it perpendicular and draw a leader back to the line.
    const placed: Array<{ x: number; y: number; w: number; h: number }> = []
    const TS = [0.5, 0.42, 0.58, 0.34, 0.66, 0.28, 0.72, 0.22, 0.78]
    const DY = [0, -30, 30, -60, 60, -90, 90, -120, 120]

    const pointAt = (edge: GraphEdge, t: number) => {
        const { x1, y1, c1x, c1y, c2x, c2y, x2, y2 } = edge.controls
        const mt = 1 - t
        return {
            x: mt * mt * mt * x1 + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x2,
            y: mt * mt * mt * y1 + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * y2
        }
    }

    for (const edge of edges) {
        const count = Math.max(1, edge.forward.rules.length)
        const h = count * 24 + 8
        const w = 128

        let anchor = pointAt(edge, 0.5)
        let label = { x: anchor.x, y: anchor.y }

        search: for (const dy of DY) {
            for (const t of TS) {
                const point = pointAt(edge, t)
                const candidate = { x: point.x, y: point.y + dy }
                const collides = placed.some(
                    (item) =>
                        Math.abs(item.x - candidate.x) < (item.w + w) / 2 &&
                        Math.abs(item.y - candidate.y) < (item.h + h) / 2
                )
                if (!collides) {
                    anchor = point
                    label = candidate
                    break search
                }
            }
        }

        edge.anchorX = anchor.x
        edge.anchorY = anchor.y
        edge.labelX = Math.min(width - 74, Math.max(74, label.x))
        edge.labelY = Math.min(height - 22, Math.max(22, label.y))
        placed.push({ x: edge.labelX, y: edge.labelY, w, h })
    }

    return {
        nodes,
        edges,
        width,
        height,
        columns: { left: leftX, right: rightX }
    }
}
