/** 通用工具函数模块 */

import crypto from "node:crypto";
import { JSONPath } from "jsonpath-plus";

/**
 * 计算 MD5 值
 */
export function calcMd5(...items: (string | Buffer)[]): string {
  const md5 = crypto.createHash("md5");
  for (const item of items) {
    if (Buffer.isBuffer(item)) {
      md5.update(item);
    } else {
      md5.update(item, "utf-8");
    }
  }
  return md5.digest("hex");
}

/**
 * 生成随机 GUID (32 位 hex)
 */
export function getGuid(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Hash33 算法
 */
export function hash33(s: string, h: number = 0): number {
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) + h + s.charCodeAt(i);
  }
  return 2147483647 & h;
}

/**
 * 生成随机 searchID
 */
export function getSearchId(): string {
  const e = Math.floor(Math.random() * 20) + 1;
  const t = e * 18014398509481984;
  const n = Math.floor(Math.random() * 4194304) * 4294967296;
  const a = Date.now();
  const r = Math.round(a) % (24 * 60 * 60 * 1000);
  return String(t + n + r);
}

/**
 * 递归将数据结构中的 bool 值转换为 int (0 或 1)
 */
export function boolToInt(data: unknown): unknown {
  if (typeof data === "boolean") {
    return data ? 1 : 0;
  }

  if (Array.isArray(data)) {
    let changed = false;
    const newList: unknown[] = [];
    for (const item of data) {
      const newItem = boolToInt(item);
      if (newItem !== item) changed = true;
      newList.push(newItem);
    }
    return changed ? newList : data;
  }

  if (data !== null && typeof data === "object") {
    let changed = false;
    const newDict: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      const newV = boolToInt(v);
      if (newV !== v) changed = true;
      newDict[k] = newV;
    }
    return changed ? newDict : data;
  }

  return data;
}

/**
 * LRU 缓存的 JSONPath 解析器
 */
const jsonPathCache = new Map<string, ReturnType<typeof JSONPath>>();
const MAX_CACHE_SIZE = 256;

export function parseJsonpath(expression: string): ReturnType<typeof JSONPath> {
  if (jsonPathCache.has(expression)) {
    return jsonPathCache.get(expression)!;
  }

  const compiled = JSONPath({ path: expression, json: {} });
  // Keep as function: (obj) => JSONPath({ path: expression, json: obj, resultType: 'value' })

  if (jsonPathCache.size >= MAX_CACHE_SIZE) {
    const firstKey = jsonPathCache.keys().next().value;
    if (firstKey !== undefined) jsonPathCache.delete(firstKey);
  }
  jsonPathCache.set(expression, compiled);

  return compiled;
}
