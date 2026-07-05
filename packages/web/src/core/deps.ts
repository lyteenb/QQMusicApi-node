/** Fastify 依赖注入 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Client } from "@qqmusic-api/sdk";
import type { Settings } from "./config.js";
import type { CredentialStore } from "./credential_store.js";

declare module "fastify" {
  interface FastifyInstance {
    sdkClient: Client;
    settings: Settings;
    credentialStore: CredentialStore | null;
  }
}

export interface WebServices {
  client: Client;
  settings: Settings;
  credentialStore: CredentialStore | null;
}

export function getWebServices(app: FastifyInstance): WebServices {
  return {
    client: app.sdkClient,
    settings: app.settings,
    credentialStore: app.credentialStore,
  };
}

export function getClient(app: FastifyInstance): Client {
  return app.sdkClient;
}

export function getSettings(app: FastifyInstance): Settings {
  return app.settings;
}
