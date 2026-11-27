import { downloadMediaMessage, type WAMessage } from "@whiskeysockets/baileys";
import { createWriteStream } from "fs";
import { readFile, unlink } from "fs/promises";
import { v4 as UUID } from "uuid";
import sharp from "sharp";
import path from "path"
import { log } from "./logger.ts";

const logID = "Media Downloader"
const verboseLogID = "helper/downloadMedia.ts"

type MediaResult = {
    filename: string
    base64Url: string
}

async function compressImage(inputPath: string, outputPath: string): Promise<void> {
    await sharp(inputPath)
        .resize(1024, null, { 
            withoutEnlargement: true,
            fit: 'inside'
        })
        .jpeg({ quality: 75 })
        .toFile(outputPath)
}

export async function downloadMedia(msg: WAMessage, contentType: string): Promise<MediaResult | undefined> {
    try {
        log.info(logID, `Starting download for contentType: ${contentType}`)
        
        // set the mimetype and default extension based on the content type
        let mimeType: string | null | undefined
        let defaultExt: string
        let isImage = false
        let isVideo = false
        let isDocument = false

        if (contentType === "imageMessage") {
            mimeType = msg.message?.imageMessage?.mimetype ?? null
            defaultExt = 'jpeg'
            isImage = true
        } else if (contentType === "videoMessage") {
            mimeType = msg.message?.videoMessage?.mimetype ?? null
            defaultExt = 'mp4'
            isVideo = true
        } else if (contentType === "documentMessage") {
            // Check both regular document and documentWithCaption paths
            const docMsg = msg.message?.documentMessage 
                        ?? msg.message?.documentWithCaptionMessage?.message?.documentMessage
            
            mimeType = docMsg?.mimetype ?? null
            
            // Get original filename from document metadata
            const originalFilename = docMsg?.fileName ?? null
            
            // Extract extension from mimetype or original filename
            let extractedExt = 'pdf'  // Default to pdf
            if (mimeType) {
                const parts = mimeType.split('/')
                extractedExt = parts[1] ?? 'pdf'
            } else if (originalFilename) {
                const parts = originalFilename.split('.')
                if (parts.length > 1) {
                    extractedExt = parts[parts.length - 1] ?? 'pdf'
                }
            }
            
            defaultExt = extractedExt
            isDocument = true
            log.debug(verboseLogID, `Document detected - mimetype: ${mimeType}, original filename: ${originalFilename}`)
        } else {
            log.debug(verboseLogID, `Unknown contentType: ${contentType}`)
            return undefined
        }

        // Get original filename for documents
        let finalFilename: string
        
        if (isDocument) {
            const docMsg = msg.message?.documentMessage 
                        ?? msg.message?.documentWithCaptionMessage?.message?.documentMessage
            const originalFilename = docMsg?.fileName
            
            if (originalFilename) {
                // Sanitize filename (remove dangerous characters but keep spaces)
                finalFilename = (path.basename(originalFilename).replace(/[^a-zA-Z0-9 ._-]/g, '_').replace(/^\.+/, '').replace(/\.{2,}/g, '.').trim() || `unnamed_file.${defaultExt}`)
            } else {
                finalFilename = `document_${UUID()}.${defaultExt}`
            }
        } else {
            // For images/videos, use UUID-based naming
            const ext = mimeType ? mimeType.split('/')[1] ?? defaultExt : defaultExt
            finalFilename = `${UUID()}.${isImage ? 'jpeg' : ext}`
        }
        
        const tempFilename = `temp_${UUID()}.${defaultExt}`
        
        // download media to temp file
        const mediaStream = await downloadMediaMessage(msg, "stream", {})
        const writeStream = createWriteStream(`./storage/media/${tempFilename}`)
        
        // pipe it cuzzo
        mediaStream.pipe(writeStream)
        
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve)
            writeStream.on('error', reject)
            mediaStream.on('error', reject)
        })
        
        // compress image or handle video/document
        if (isImage) {
            await compressImage(
                `./storage/media/${tempFilename}`,
                `./storage/media/${finalFilename}`
            )
            
            // delete temp file
            await unlink(`./storage/media/${tempFilename}`)
            
            log.info(logID, `Image saved: ${finalFilename}`)
            
            return {
                filename: finalFilename,
                base64Url: ""
            }
        } else if (isVideo) {
            log.info(logID, `Video saved: ${tempFilename}`)
            
            return {
                filename: tempFilename,
                base64Url: ""
            }
        } else if (isDocument) {
            // Rename temp file to final filename
            const fs = await import('fs/promises')
            await fs.rename(`./storage/media/${tempFilename}`, `./storage/media/${finalFilename}`)
            
            log.info(logID, `Document saved: ${finalFilename}`)
            
            return {
                filename: finalFilename,
                base64Url: ""
            }
        }
        
        return undefined
    } catch (error) {
        log.error(verboseLogID, `Failed to download ${contentType}, skipping:`, error)
        return undefined
    }
}
