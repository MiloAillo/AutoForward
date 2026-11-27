import { WASocket } from "./src/classes/WASocket.ts";
import { CacheStorage } from "./src/classes/CacheStorage.ts";
import OpenAI from 'openai'
import { PrismaStorage } from "./src/classes/PrismaStorage.ts";
import { mkdir } from "fs/promises";
import { messageHandler } from "./src/autoForward/message/messageHandler.ts";
import { msgCronBatchForward } from "./src/autoForward/cron/msgCronBatchForward.ts";
import { msgCronCleanup } from "./src/autoForward/cron/msgCronCleanup.ts";
import { startInternalAPI } from "./src/autoForward/api/api.js";
import { log } from "./src/helper/logger.ts";

const logID = "AutoForward"
const verboseLogID = "index.ts"

// env load
try {
  process.loadEnvFile(".env")
} catch (error) {
  // .env file not found - likely running in Docker with environment variables
  log.info(logID, ".env file not found, using environment variables")
}

if (!process.env.ADMIN_NUMBER) throw Error("ADMIN_NUMBER needed inside .env")
if (!process.env.OPENAI_API_KEY) throw Error("OPENAI_API_KEY needed inside .env")
if (!process.env.OPENAI_BASE_URL) throw Error("OPENAI_BASE_URL needed inside .env")
if (!process.env.INTERNAL_HTTP_PORT) throw Error("INTERNAL_HTTP_PORT needed inside .env")
if (!process.env.AI_MODEL_NAME) throw Error("AI_MODEL_NAME needed inside .env")

// Ensure media directory exists
await mkdir('./storage/media', { recursive: true })
log.debug(verboseLogID, "Media directory ensured")

// init
export const socket = new WASocket()

export const cacheStorage = new CacheStorage()
log.debug(verboseLogID, "CacheStorage initialized")

export const prismaStorage = new PrismaStorage()
log.debug(verboseLogID, "PrismaStorage initialized")

// start AutoForward Internal API for web UI
startInternalAPI(socket, prismaStorage, cacheStorage)

// The rest wait until WASocket properly started
await socket.waitForConnection()
log.debug(verboseLogID, "WASocket initialized")

export const modelProvider = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
})

// WASocket message upsert event listener after socket ready
socket.on("socket-ready", () => {
    log.debug(verboseLogID, "socket-ready event received. Listening to messages upsert now...")
    socket.getSocket().ev.on('messages.upsert', messageHandler)
})

// message batch send every X minutes
msgCronBatchForward()

// message cleanup cron jobs
msgCronCleanup()