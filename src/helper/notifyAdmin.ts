import { socket } from "../../index.ts";

/**
 * Sends a notification message to the admin using ADMIN_NUMBER .env variable.
 */
export async function notifyAdmin(text: string): Promise<boolean> {
    const adminNumber = process.env.ADMIN_NUMBER

    if (!adminNumber) {
        console.error(`[notifyAdmin] ADMIN_NUMBER is not set. Notification not sent. Text: ${text}`)
        return false
    }

    try {
        const sock = socket.getSocket()
        const jid = `${adminNumber}@s.whatsapp.net`

        await sock.sendMessage(jid, { text })
        console.log(`[notifyAdmin] Notification sent to admin: ${text}`)
        return true
    } catch (error) {
        console.error(`[notifyAdmin] Failed to notify admin. Text: ${text}`, error)
        return false
    }
}
