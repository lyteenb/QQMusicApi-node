/** Web 层配置系统 */

import fs from "node:fs";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { envSchema } from "env-schema";

export interface LogConfig {
  mode: "console" | "file" | "both";
  level: string;
  filePath: string;
  maxBytes: number;
  backupCount: number;
}

export interface ServerConfig {
  host: string;
  port: number;
  workers: number;
  limitConcurrency: number;
}

export interface CacheConfig {
  ttl: number;
  memoryMaxSize: number;
  backend: "memory" | "redis";
  redisUrl: string;
  redisPrefix: string;
}

export interface SecurityConfig {
  enabled: boolean;
  ipListMode: "allowlist" | "denylist";
  ipList: string[];
  trustedProxyIps: string[];
  clientIpHeader: string;
  rateLimitCapacity: number;
  rateLimitWindow: number;
  concurrencyLimit: number;
  corsOrigins: string[];
}

export interface CredentialConfig {
  enabled: boolean;
  storePath: string;
}

const defaults = {
  log: {
    mode: "both" as const,
    level: "info",
    filePath: "./data/logs/qqmusic-api.log",
    maxBytes: 10_485_760,
    backupCount: 10,
  },
  server: {
    host: "127.0.0.1",
    port: 8080,
    workers: 1,
    limitConcurrency: 100,
  },
  cache: {
    ttl: 60,
    memoryMaxSize: 1024,
    backend: "memory" as const,
    redisUrl: "redis://localhost:6379",
    redisPrefix: "qqmusic:",
  },
  security: {
    enabled: false,
    ipListMode: "allowlist" as const,
    ipList: ["127.0.0.1"],
    trustedProxyIps: [],
    clientIpHeader: "x-forwarded-for",
    rateLimitCapacity: 60,
    rateLimitWindow: 60,
    concurrencyLimit: 100,
    corsOrigins: ["*"],
  },
  credential: {
    enabled: false,
    storePath: "./data/credentials.sqlite3",
  },
};

export interface Settings {
  log: LogConfig;
  server: ServerConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  credential: CredentialConfig;
}

function loadTomlConfig(): Partial<Settings> {
  const tomlPath = path.resolve("config.toml");
  try {
    if (fs.existsSync(tomlPath)) {
      const raw = fs.readFileSync(tomlPath, "utf-8");
      return parseToml(raw) as Partial<Settings>;
    }
  } catch { /* ignore */ }
  return {};
}

export function loadConfig(): Settings {
  const toml = loadTomlConfig();

  const schema = {
    type: "object",
    properties: {
      LOG_MODE: { type: "string", default: toml.log?.mode ?? defaults.log.mode },
      LOG_LEVEL: { type: "string", default: toml.log?.level ?? defaults.log.level },
      LOG_FILE_PATH: { type: "string", default: toml.log?.filePath ?? defaults.log.filePath },
      SERVER_HOST: { type: "string", default: toml.server?.host ?? defaults.server.host },
      SERVER_PORT: { type: "number", default: toml.server?.port ?? defaults.server.port },
      REDIS_URL: { type: "string", default: toml.cache?.redisUrl ?? defaults.cache.redisUrl },
    },
  };

  const env = envSchema({ schema, dotenv: true }) as Record<string, unknown>;

  return {
    log: {
      mode: (env.LOG_MODE as string) as "console" | "file" | "both" ?? defaults.log.mode,
      level: (env.LOG_LEVEL as string) ?? defaults.log.level,
      filePath: (env.LOG_FILE_PATH as string) ?? defaults.log.filePath,
      maxBytes: toml.log?.maxBytes ?? defaults.log.maxBytes,
      backupCount: toml.log?.backupCount ?? defaults.log.backupCount,
    },
    server: {
      host: (env.SERVER_HOST as string) ?? defaults.server.host,
      port: (env.SERVER_PORT as number) ?? defaults.server.port,
      workers: toml.server?.workers ?? defaults.server.workers,
      limitConcurrency: toml.server?.limitConcurrency ?? defaults.server.limitConcurrency,
    },
    cache: {
      ttl: toml.cache?.ttl ?? defaults.cache.ttl,
      memoryMaxSize: toml.cache?.memoryMaxSize ?? defaults.cache.memoryMaxSize,
      backend: toml.cache?.backend ?? defaults.cache.backend,
      redisUrl: (env.REDIS_URL as string) ?? defaults.cache.redisUrl,
      redisPrefix: toml.cache?.redisPrefix ?? defaults.cache.redisPrefix,
    },
    security: {
      enabled: toml.security?.enabled ?? defaults.security.enabled,
      ipListMode: toml.security?.ipListMode ?? defaults.security.ipListMode,
      ipList: toml.security?.ipList ?? defaults.security.ipList,
      trustedProxyIps: toml.security?.trustedProxyIps ?? defaults.security.trustedProxyIps,
      clientIpHeader: toml.security?.clientIpHeader ?? defaults.security.clientIpHeader,
      rateLimitCapacity: toml.security?.rateLimitCapacity ?? defaults.security.rateLimitCapacity,
      rateLimitWindow: toml.security?.rateLimitWindow ?? defaults.security.rateLimitWindow,
      concurrencyLimit: toml.security?.concurrencyLimit ?? defaults.security.concurrencyLimit,
      corsOrigins: toml.security?.corsOrigins ?? defaults.security.corsOrigins,
    },
    credential: {
      enabled: toml.credential?.enabled ?? defaults.credential.enabled,
      storePath: toml.credential?.storePath ?? defaults.credential.storePath,
    },
  };
}
