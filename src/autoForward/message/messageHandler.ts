import { isJidGroup, jidDecode, getContentType, type WAMessage, type MessageUpsertType } from "@whiskeysockets/baileys"
import { cacheStorage, prismaStorage } from "../../../index.ts"
import { downloadMedia } from "../../helper/downloadMedia.ts"
import { isCommand } from "../../helper/isCommand.ts"
import { directCommand } from "./directCommand.ts"
import { log } from "../../helper/logger.ts"

const logID = "Message Handler"
const verboseLogID = "message/messageHandler.ts"

type messageHandlerType = {
    messages: WAMessage[],
    type: MessageUpsertType
}

export async function messageHandler({ messages, type }: messageHandlerType) {
    if (type !== "notify") return

    for (const msg of messages) {
        if (msg.key.fromMe) continue

        log.debug(verboseLogID, "Message received")

        const key = msg.key

        // identifier properties
        const isGroup = isJidGroup(key.remoteJid ?? "")
        const isDirect = isCommand(msg.message?.conversation ?? "")
        const converstation = msg.message?.conversation?.trim()
        const contentType = getContentType(msg.message ?? undefined)
        
        // AutoForward
        // direct command from admin
        if (!isGroup && converstation && isDirect) {
            const rawJid = [key.remoteJidAlt, key.remoteJid].find(jid => jid?.endsWith("@s.whatsapp.net")) ?? ""
            const senderPn = jidDecode(rawJid)?.user

            if (senderPn === process.env.ADMIN_NUMBER) {
                log.debug(verboseLogID, "Message comes from ADMIN_NUMBER, executing directCommand...")
                await directCommand(msg, converstation)
            }
        }

        // listening group
        if (isGroup && msg.key.remoteJid) {
            try {
                log.debug(verboseLogID, "message comes from group chat, grabbing forward item if exist...")

                const forwards = await prismaStorage.getForwards(msg.key.remoteJid)
                
                if (forwards.length > 0) {
                    let mediaPath: string | undefined = undefined
                    let mediaBase64: string | undefined = undefined

                    // Handle media messages (images, videos, and documents)
                    if (contentType === "imageMessage" || contentType === "videoMessage" || contentType === "documentMessage" || contentType === "documentWithCaptionMessage") {
                        log.debug(verboseLogID, `Detected media type: ${contentType}`)
                        
                        // Normalize documentWithCaptionMessage to documentMessage
                        const normalizedContentType = contentType === "documentWithCaptionMessage" ? "documentMessage" : contentType
                        
                        const mediaResult = await downloadMedia(msg, normalizedContentType)
                        
                        if (!mediaResult) {
                            log.error(verboseLogID, "Media download failed, skipping message")
                            continue
                        }

                        mediaPath = mediaResult.filename
                        mediaBase64 = mediaResult.base64Url
                        log.debug(verboseLogID, `Media downloaded successfully: ${mediaPath}`)
                    }

                    // Append to each forward's own chat history
                    for (const forward of forwards) {
                        try {
                            await prismaStorage.addMessage({
                                forwardItemId: forward.id,
                                msg: msg,
                                mediaPath: mediaPath,
                                mediaBase64: mediaBase64
                            })
                            log.info(logID, `Message stored for forward item ${forward.id} from ${await cacheStorage.getGroupName(forward.listenId)}`)
                        } catch (error) {
                            log.error(verboseLogID, `Failed to store message for forward item ${forward.id}:`, error)
                        }
                    }
                }
            } catch (error) {
                log.error(verboseLogID, "Failed to process message:", error)
            }
        }
    }
}