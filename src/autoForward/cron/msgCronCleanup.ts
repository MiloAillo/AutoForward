import nodeCron from "node-cron";
import { prismaStorage } from "../../../index.ts";
import { log } from "../../helper/logger.ts";

const logID = "Message Cleaner"
const verboseLogID = "cron/msgCronCleanup.ts"

export function msgCronCleanup() {
    const retentionDays = parseInt(process.env.CLEANUP_RETENTION_DAYS || "7")
    
    if (isNaN(retentionDays) || retentionDays < 1) {
        throw new Error(`[msgCronCleanup] Invalid CLEANUP_RETENTION_DAYS: "${process.env.CLEANUP_RETENTION_DAYS}". Must be a positive integer >= 1.`)
    }
    
    log.debug(verboseLogID, `Cleanup configured: Delete all messages older than ${retentionDays} days (Weekly Sunday 3 AM)`)

    nodeCron.schedule("0 3 * * 0", async () => {
        log.info(logID, `Weekly cleanup initiated, deleting all old messages`)

        try {
            const count = await prismaStorage.deleteAllOldMessages(retentionDays)
            log.info(logID, `Weekly cleanup completed: ${count} message(s) deleted`)
        } catch (error) {
            log.error(verboseLogID, `Weekly cleanup failed: ${error}`)
        }
    })
}
