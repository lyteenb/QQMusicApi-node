/** 基础数据模型模块 */

import { z } from "zod";
import { JSONPath } from "jsonpath-plus";

// ─── Credential ────────────────────────────────────────────

export interface CredentialData {
  openid: string;
  refreshToken: string;
  accessToken: string;
  expiredAt: number;
  musicid: number;
  musickey: string;
  unionid: string;
  strMusicid: string;
  refreshKey: string;
  musickeyCreateTime: number;
  keyExpiresIn: number;
  firstLogin: number;
  bindAccountType: number;
  needRefreshKeyIn: number;
  encryptUin: string;
  loginType: number;
}

const credentialDefaults: CredentialData = {
  openid: "",
  refreshToken: "",
  accessToken: "",
  expiredAt: 0,
  musicid: 0,
  musickey: "",
  unionid: "",
  strMusicid: "",
  refreshKey: "",
  musickeyCreateTime: 0,
  keyExpiresIn: 0,
  firstLogin: 0,
  bindAccountType: 0,
  needRefreshKeyIn: 0,
  encryptUin: "",
  loginType: 0,
};

export class Credential implements CredentialData {
  openid: string;
  refreshToken: string;
  accessToken: string;
  expiredAt: number;
  musicid: number;
  musickey: string;
  unionid: string;
  strMusicid: string;
  refreshKey: string;
  musickeyCreateTime: number;
  keyExpiresIn: number;
  firstLogin: number;
  bindAccountType: number;
  needRefreshKeyIn: number;
  encryptUin: string;
  loginType: number;

  constructor(data: Partial<CredentialData> = {}) {
    const d = { ...credentialDefaults, ...data };
    this.openid = d.openid;
    this.refreshToken = d.refreshToken;
    this.accessToken = d.accessToken;
    this.expiredAt = d.expiredAt;
    this.musicid = d.musicid;
    this.musickey = d.musickey;
    this.unionid = d.unionid;
    this.strMusicid = d.strMusicid;
    this.refreshKey = d.refreshKey;
    this.musickeyCreateTime = d.musickeyCreateTime;
    this.keyExpiresIn = d.keyExpiresIn;
    this.firstLogin = d.firstLogin;
    this.bindAccountType = d.bindAccountType;
    this.needRefreshKeyIn = d.needRefreshKeyIn;
    this.encryptUin = d.encryptUin;
    this.loginType = d.loginType;

    // Auto-infer loginType if not provided
    if (d.loginType === 0 && d.musickey) {
      this.loginType = d.musickey.startsWith("W_X") ? 1 : 2;
    }
  }

  isExpired(): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= this.musickeyCreateTime + this.keyExpiresIn;
  }

  /** Convert to plain object for serialization */
  toJSON(): CredentialData {
    return {
      openid: this.openid,
      refreshToken: this.refreshToken,
      accessToken: this.accessToken,
      expiredAt: this.expiredAt,
      musicid: this.musicid,
      musickey: this.musickey,
      unionid: this.unionid,
      strMusicid: this.strMusicid,
      refreshKey: this.refreshKey,
      musickeyCreateTime: this.musickeyCreateTime,
      keyExpiresIn: this.keyExpiresIn,
      firstLogin: this.firstLogin,
      bindAccountType: this.bindAccountType,
      needRefreshKeyIn: this.needRefreshKeyIn,
      encryptUin: this.encryptUin,
      loginType: this.loginType,
    };
  }
}

// ─── CommonParams ──────────────────────────────────────────

export interface CommonParamsData {
  ct: number;
  cv: number;
  v?: number | null;
  platform?: string | null;
  tmeAppID?: string | null;
  chid?: string | null;
  uin?: number | null;
  g_tk?: number | null;
  g_tk_new_20200303?: number | null;
  qq?: string | null;
  authst?: string | null;
  tmeLoginType?: number | null;
  QIMEI?: string | null;
  QIMEI36?: string | null;
  OpenUDID?: string | null;
  OpenUDID2?: string | null;
  udid?: string | null;
  aid?: string | null;
  guid?: string | null;
  uid?: string | null;
  sid?: string | null;
  os_ver?: string | null;
  phonetype?: string | null;
  devicelevel?: string | null;
  newdevicelevel?: string | null;
  rom?: string | null;
  format?: string | null;
  inCharset?: string | null;
  outCharset?: string | null;
  notice?: number | null;
  need_new_code?: number | null;
}

// ─── Request / Response Items ──────────────────────────────

export interface RequestItem {
  module: string;
  method: string;
  param: Record<string, unknown> | Record<number, unknown>;
  preserveBool?: boolean;
}

export interface JceRequestItem {
  module: string;
  method: string;
  param: Map<number, unknown>;
}

export interface JceRequest {
  comm: Map<string, string>;
  data: Map<string, JceRequestItem>;
}

export interface JceResponseItem {
  code: number;
  data: Map<number, unknown>;
}

export interface JceResponse {
  code: number;
  data: Map<string, JceResponseItem>;
}

// ─── Response Base with JSONPath ───────────────────────────

/**
 * JSONPath field metadata stored on Zod schemas
 */
export interface JsonPathMeta {
  jsonpath: string;
}

const JSONPATH_KEY = Symbol("qqmusic.jsonpath");

/**
 * Decorate a Zod schema with JSONPath extraction metadata.
 */
export function withJsonPath<T extends z.ZodTypeAny>(schema: T, jsonpath: string): T {
  (schema as z.ZodTypeAny & { [JSONPATH_KEY]?: JsonPathMeta })[JSONPATH_KEY] = { jsonpath };
  return schema;
}

/**
 * Extract JSONPath values from raw data before Zod validation.
 * This mirrors Python's Response._extract_jsonpath_fields() model_validator.
 */
export function extractJsonPathFields(
  schema: z.ZodObject<z.ZodRawShape>,
  data: unknown,
): unknown {
  if (typeof data !== "object" || data === null) return data;

  const shape = schema.shape;
  const processed = { ...(data as Record<string, unknown>) };

  for (const [fieldName, fieldSchema] of Object.entries(shape)) {
    const meta = (fieldSchema as z.ZodTypeAny & { [JSONPATH_KEY]?: JsonPathMeta })[JSONPATH_KEY];
    if (!meta) continue;

    try {
      const results = JSONPath({
        path: meta.jsonpath,
        json: data,
        resultType: "all",
        wrap: false,
      });

      if (results && results.length > 0) {
        const values = results.map((r: { value: unknown }) => (r as { value: unknown }).value);

        if (meta.jsonpath.includes("[*]")) {
          processed[fieldName] = values;
        } else if (values.length === 1) {
          processed[fieldName] = values[0];
        } else {
          processed[fieldName] = values;
        }
      }
    } catch {
      // JSONPath parse error – silently skip
    }
  }

  return processed;
}

/**
 * Base Zod object with common configuration.
 * extra="ignore" + strict mode disabled
 */
export function baseModel<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).passthrough();
}

// ─── Zod Helpers matching Python Pydantic validators ───────

export const NoneToEmptyList = z.preprocess((val) => val ?? [], z.array(z.unknown()));
export const NoneToEmptyDict = z.preprocess((val) => val ?? {}, z.record(z.string(), z.unknown()));
export const NoneOrZeroToEmptyStr = z.preprocess(
  (val) => (val === null || val === 0 || val === undefined ? "" : val),
  z.string(),
);
