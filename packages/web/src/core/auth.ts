/** Web 层认证逻辑 */

import type { FastifyRequest } from "fastify";
import { Credential } from "@qqmusic-api/sdk";
import type { Client } from "@qqmusic-api/sdk";
import type { CredentialStore } from "./credential_store.js";

/**
 * 从请求 Cookie 提取 Credential
 */
function parseCookies(request: FastifyRequest): Record<string, string> {
  const raw = request.headers.cookie || "";
  const result: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      result[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }
  }
  return result;
}

export function credentialFromCookies(request: FastifyRequest): Credential | null {
  const cookies = parseCookies(request);
  const musicid = cookies.musicid ? parseInt(cookies.musicid, 10) : 0;
  const musickey = cookies.musickey || "";

  if (!musicid || !musickey) return null;

  return new Credential({
    musicid,
    musickey,
    openid: cookies.openid || "",
    refreshToken: cookies.refresh_token || "",
    accessToken: cookies.access_token || "",
    expiredAt: cookies.expired_at ? parseInt(cookies.expired_at, 10) : 0,
    unionid: cookies.unionid || "",
    strMusicid: cookies.str_musicid || String(musicid),
    refreshKey: cookies.refresh_key || "",
  });
}

/**
 * 获取配置的凭证（凭证池后备）
 */
export async function configuredCredentialForApi(
  store: CredentialStore | null,
  client: Client,
): Promise<Credential | null> {
  if (!store) return null;

  const creds = store.randomCredentials();
  for (const cred of creds) {
    // Check if expired
    if (!cred.isExpired()) {
      return cred;
    }
    // Try to refresh
    try {
      const result = await client.login.refreshCredential(cred);
      const newCred = new Credential(result as unknown as Record<string, unknown>);
      store.update(newCred);
      return newCred;
    } catch {
      store.markInvalid(cred.musicid);
    }
  }
  return null;
}

/**
 * 凭证刷新并发锁
 */
const refreshLocks = new Map<number, Promise<Credential | null>>();

export async function refreshCredentialWithLock(
  store: CredentialStore,
  client: Client,
  cred: Credential,
): Promise<Credential | null> {
  const key = cred.musicid;
  if (refreshLocks.has(key)) {
    return refreshLocks.get(key)!;
  }

  const promise = (async () => {
    try {
      const result = await client.login.refreshCredential(cred);
      const newCred = new Credential(result as unknown as Record<string, unknown>);
      store.update(newCred);
      return newCred;
    } catch {
      store.markInvalid(key);
      return null;
    } finally {
      refreshLocks.delete(key);
    }
  })();

  refreshLocks.set(key, promise);
  return promise;
}
