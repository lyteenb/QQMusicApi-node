/** Fastify 应用工厂 */

import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import rateLimit from "@fastify/rate-limit";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { Client, Credential } from "@qqmusic-api/sdk";
import type { Settings } from "./core/config.js";
import { loadConfig } from "./core/config.js";
import { successResponse, errorResponse } from "./core/response.js";
import { MemoryBackend } from "./core/cache.js";
import type { CacheBackend } from "./core/cache.js";
import { CredentialStore } from "./core/credential_store.js";
import { credentialFromCookies, configuredCredentialForApi } from "./core/auth.js";
import { registerRoutes } from "./routes/index.js";

export interface AppOptions {
  settings?: Settings;
  client?: Client;
  cache?: CacheBackend;
  credentialStore?: CredentialStore | null;
}

export async function createApp(opts: AppOptions = {}) {
  const settings = opts.settings ?? loadConfig();
  const cache = opts.cache ?? new MemoryBackend(settings.cache.memoryMaxSize);
  const credentialStore = opts.credentialStore ?? (settings.credential.enabled
    ? new CredentialStore(settings.credential.storePath) : null);
  const client = opts.client ?? new Client({ devicePath: "./data/device.json" });

  const app = Fastify({
    logger: {
      level: settings.log.level,
      transport: { target: "pino-pretty" },
    },
  });

  // Zod type provider
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Plugins
  await app.register(cors, { origin: settings.security.corsOrigins });
  await app.register(fastifySwagger, {
    openapi: { info: { title: "QQMusic API", version: "0.6.7" } },
  });
  if (settings.security.enabled) {
    await app.register(rateLimit, {
      max: settings.security.rateLimitCapacity,
      timeWindow: settings.security.rateLimitWindow * 1000,
    });
  }

  // Decorate
  app.decorate("sdkClient", client);
  app.decorate("settings", settings);
  app.decorate("credentialStore", credentialStore);

  // Initialize credential store
  if (credentialStore) {
    await credentialStore.initialize();
    // Startup health check — refresh all stored credentials
    const creds = credentialStore.randomCredentials();
    for (const cred of creds) {
      try {
        if (cred.isExpired()) {
          const result = await client.login.refreshCredential(cred);
          credentialStore.update(new Credential(result as unknown as Record<string, unknown>));
        }
      } catch {
        credentialStore.markInvalid(cred.musicid);
      }
    }
  }

  // Health check
  app.get("/", async (_req, reply) => {
    return reply.send(successResponse({ status: "ok", version: "0.6.7" }));
  });

  // Register all business API routes
  await registerRoutes(app, cache);

  // Error handler
  app.setErrorHandler((err: { statusCode?: number; message?: string }, _req, reply) => {
    if (err.statusCode === 429) {
      return reply.status(429).send(errorResponse(429, "请求过于频繁"));
    }
    const code = err.statusCode ?? 500;
    return reply.status(code).send(errorResponse(code, err.message ?? "Internal Server Error"));
  });

  // Graceful shutdown
  app.addHook("onClose", async () => {
    await client.close();
    credentialStore?.close();
    await cache.close();
  });

  return { app, client, cache, credentialStore, settings };
}
