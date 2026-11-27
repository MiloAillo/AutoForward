import NodeCache from "node-cache";
import { socket } from "../../index.ts";
import type { GroupMetadata } from "@whiskeysockets/baileys";
import { log } from "../helper/logger.ts";

const logID = "Cache Storage"
// const verboseLogID = "classes/CacheStorage.ts"

export class CacheStorage {
    private groups: NodeCache;

    constructor() {
        const cacheTTL = process.env.CACHE_TTL_SECONDS 
            ? parseInt(process.env.CACHE_TTL_SECONDS) 
            : 5 * 60
        this.groups = new NodeCache({ stdTTL: cacheTTL, useClones: false });
    }

    /**
     * Fetches and caches all participating groups.
     */
    async getGroups(): Promise<Record<string, GroupMetadata>> {
        let cachedGroups = this.groups.get<Record<string, GroupMetadata>>('groups');

        if (!cachedGroups) {
            try {
                if (socket.getStatus() !== "open") {
                    return {};
                }

                const sock = socket.getSocket();
                if (!sock) return {};

                cachedGroups = await sock.groupFetchAllParticipating();
                this.groups.set('groups', cachedGroups);
            } catch (err: any) {
                log.warn(logID, `Failed to fetch groups: ${err?.message || err}`);
                return {};
            }
        }

        return cachedGroups ?? {};
    }

    /**
     * Retrieves a specific group's subject/name by JID.
     */
    async getGroupName(jid: string): Promise<string | undefined> {
        const groups = await this.getGroups();
        return groups[jid]?.subject;
    }

    /**
     * Clears cached group data manually (useful on events or updates).
     */
    clearGroupCache(): void {
        this.groups.del('groups');
    }
}