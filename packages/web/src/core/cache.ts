/** Web 层缓存 — 内存 LRU + Redis 双后端 */

import type { FastifyReply } from "fastify";
import { successResponse } from "./response.js";

export interface CacheBackend {
  get(key: string): Promise<{ data: unknown; ttl: number } | null>;
  set(key: string, data: unknown, ttl: number): Promise<void>;
  close(): Promise<void>;
}

export class MemoryBackend implements CacheBackend {
  private store = new Map<string, { data: unknown; expiry: number }>();

  constructor(private maxSize: number) {}

  async get(key: string): Promise<{ data: unknown; ttl: number } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return { data: entry.data, ttl: Math.ceil((entry.expiry - Date.now()) / 1000) };
  }

  async set(key: string, data: unknown, ttl: number): Promise<void> {
    // Simple LRU eviction
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, { data, expiry: Date.now() + ttl * 1000 });
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}

export async function makeCacheKey(path: string, kwargs: Record<string, unknown>): Promise<string> {
  const sorted = JSON.stringify(kwargs, Object.keys(kwargs).sort());
  const { createHash } = await import("node:crypto");
  return `${path}:${createHash("sha256").update(sorted).digest("hex").slice(0, 16)}`;
}

export async function sendCached(
  reply: FastifyReply,
  cache: CacheBackend,
  key: string,
  data: unknown,
  ttl: number,
) {
  await cache.set(key, data, ttl);
  return reply
    .header("Cache-Control", `public, max-age=${ttl}`)
    .send(successResponse(data));
}
