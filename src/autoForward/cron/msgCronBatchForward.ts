import nodeCron from "node-cron";
import { prismaStorage } from "../../../index.ts";
import { forwardMessages } from "../message/messageSender.ts";
import type { WAMessage } from "@whiskeysockets/baileys";
import { aiReadyFormatter } from "../../helper/aiReadyFormatter.ts";
import { analyzeAndDecide } from "../ai/analyseAndDecide.ts";
import { notifyAdmin } from "../../helper/notifyAdmin.ts";

async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function msgCronBatchForward() {
    const intervalMinutes = parseInt(process.env.BATCH_FORWARD_INTERVAL_MINUTES || "30")

    if (isNaN(intervalMinutes) || intervalMinutes < 1) {
        throw new Error(`[msgCronBatchForward] Invalid BATCH_FORWARD_INTERVAL_MINUTES: "${process.env.BATCH_FORWARD_INTERVAL_MINUTES}". Must be a positive integer >= 1.`)
    }

    const cronExpression = `*/${intervalMinutes} * * * *`
    console.log(`[msgCronBatchForward] Configured to run every ${intervalMinutes} minute(s)`)

    nodeCron.schedule(cronExpression, async () => {
        console.log("[msgCronBatchForward] Batch forward initiated")

        // Errors collected during this run. Inside the loop we ONLY push here
        // (never notify) - one aggregated notification fires after the loop.
        const batchErrors: string[] = []
        let chatsPassed = 0

        try {
            const forwards = await prismaStorage.getForwardsWithUnsentMessages()

            if (forwards.length === 0) {
                console.log("[msgCronBatchForward] No forwards with messages")
                return
            }

            console.log(`[msgCronBatchForward] Processing ${forwards.length} forward item(s)`)

            for (let i = 0; i < forwards.length; i++) {
                const forward = forwards[i];
                if (!forward) continue;

                console.log(`[msgCronBatchForward] Processing forward item ${i + 1}/${forwards.length}`)

                // Per-item guard: an error here is added to the batch and the
                // loop continues with the next forward item.
                try {
                    // No rules - forward all messages directly
                    if (forward.rules.length === 0) {
                        const msgs = forward.chats.map(chat => chat.msg as any);
                        const sentCount = await forwardMessages(msgs, forward.sendId);

                        // delete them from chat histories
                        const chatIds = forward.chats.map(chat => chat.id);
                        await prismaStorage.deleteMessages(chatIds);

                        chatsPassed += sentCount

                        console.log(`[msgCronBatchForward] Forwarded ${sentCount}/${msgs.length} messages (no rules)`);

                        // send errors are swallowed per-message, surface the gap
                        if (sentCount < msgs.length) {
                            batchErrors.push(`Forward item ${forward.id} (${forward.listenId} → ${forward.sendId}): sent ${sentCount}/${msgs.length} messages, remaining sends failed`)
                        }

                    // AI forwarding logic with rules
                    } else {
                        const formatted = await aiReadyFormatter(forward)

                        console.log(`[msgCronBatchForward] Rules found. Calling AI to decide...`)
                        await analyzeAndDecide(formatted)

                        chatsPassed += forward.chats.length
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error)
                    batchErrors.push(`Forward item ${forward.id} (${forward.listenId} → ${forward.sendId}): ${message}`)
                    console.error(`[msgCronBatchForward] Forward item ${forward.id} failed:`, error)
                }

                // 2-second pause before next forward item
                if (i < forwards.length - 1) {
                    await delay(2000);
                }
            }

            console.log(`[msgCronBatchForward] Finished processing ${forwards.length} forward item(s)`)

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            batchErrors.push(`Batch run failed: ${message}`)
            console.error("[msgCronBatchForward] Batch forward failed:", error)
        }

        // Outside the loop: a single aggregated notification per cron run
        if (batchErrors.length > 0) {
            const list = batchErrors.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
            await notifyAdmin(
                `[msgCronBatchForward] ${chatsPassed} chats passed, ${batchErrors.length} error(s):\n\n\`\`\`\n${list}\n\`\`\``
            )
        }
    })
}
