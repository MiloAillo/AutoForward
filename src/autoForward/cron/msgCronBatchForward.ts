import nodeCron from "node-cron";
import { prismaStorage } from "../../../index.ts";
import { forwardMessages } from "../message/messageSender.ts";
import type { WAMessage } from "@whiskeysockets/baileys";
import { aiReadyFormatter } from "../../helper/aiReadyFormatter.ts";
import { analyzeAndDecide } from "../ai/analyseAndDecide.ts";
import { notifyAdmin } from "../../helper/notifyAdmin.ts";
import { log } from "../../helper/logger.ts";

const logID = "Forward Batch Sender"
const verboseLogID = "cron/msgCronBatchForward.ts"


async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function msgCronBatchForward() {
    const intervalMinutes = parseInt(process.env.BATCH_FORWARD_INTERVAL_MINUTES || "30")

    if (isNaN(intervalMinutes) || intervalMinutes < 1) {
        throw new Error(`[msgCronBatchForward] Invalid BATCH_FORWARD_INTERVAL_MINUTES: "${process.env.BATCH_FORWARD_INTERVAL_MINUTES}". Must be a positive integer >= 1.`)
    }

    const cronExpression = `*/${intervalMinutes} * * * *`
    log.info(logID, `Configured to run every ${intervalMinutes} minute(s)`)

    nodeCron.schedule(cronExpression, async () => {
        log.info(logID, `Batch forward initiated`)

        // Errors collected during this run. Inside the loop we ONLY push here
        // (never notify) - one aggregated notification fires after the loop.
        const batchErrors: string[] = []
        let chatsPassed = 0

        try {
            const forwards = await prismaStorage.getForwardsWithUnsentMessages()

            if (forwards.length === 0) {
                log.info(logID, `No forwards with messages`)
                return
            }

            log.info(logID, `Processing ${forwards.length} forward item(s)`)

            for (let i = 0; i < forwards.length; i++) {
                const forward = forwards[i];
                if (!forward) continue;

                log.debug(verboseLogID, `Processing forward item ${i + 1}/${forwards.length}`)

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

                        log.debug(verboseLogID, `Forwarded ${sentCount}/${msgs.length} messages (no rules)`);

                        // send errors are swallowed per-message, surface the gap
                        if (sentCount < msgs.length) {
                            batchErrors.push(`Forward item ${forward.id} (${forward.listenId} → ${forward.sendId}): sent ${sentCount}/${msgs.length} messages, remaining sends failed`)
                        }

                    // AI forwarding logic with rules
                    } else {
                        const formatted = await aiReadyFormatter(forward)

                        log.debug(verboseLogID, `Rules found. Calling model to decide...`)
                        await analyzeAndDecide(formatted)

                        chatsPassed += forward.chats.length
                    }
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error)
                    batchErrors.push(`Forward item ${forward.id} (${forward.listenId} → ${forward.sendId}): ${message}`)
                    log.error(verboseLogID, `Forward item ${forward.id} failed:`, error)
                }

                // 2-second pause before next forward item
                if (i < forwards.length - 1) {
                    await delay(2000);
                }
            }

            log.info(logID, `Finished processing ${forwards.length} forward item(s)`)

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            batchErrors.push(`Batch run failed: ${message}`)
            log.error(verboseLogID, `Batch forward failed: ${error}`)
        }

        // Outside the loop: a single aggregated notification per cron run
        if (batchErrors.length > 0) {
            const list = batchErrors.map((entry, index) => `${index + 1}. ${entry}`).join("\n")
            await notifyAdmin([
                `⚠️ *[AutoForward] Batch Run Warning: ${batchErrors.length} Error(s) Encountered*`,
                ``,
                `Chats passed: *${chatsPassed}*`,
                `Failed items: *${batchErrors.length}*`,
                ``,
                `*Error Details:*`,
                `\`\`\``,
                list,
                `\`\`\``,
                ``,
                `Affected messages remain unsent in queue and will be retried next batch.`
            ].join("\n"))
        }
    }, {
        missedExecutionTolerance: 60 * 1000
    })
}
