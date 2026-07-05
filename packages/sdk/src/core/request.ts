/** Request 描述符系统 — 可等待的声明式请求模型 */

import type { Client } from "./client.js";
import type { PagerMeta, RefreshMeta } from "./pagination.js";
import type { Credential } from "../models/request.js";
import type { Platform } from "./versioning.js";

export type AllowErrorCodes = string | Set<string> | readonly string[] | null;

export type ResponseModel<T = unknown> = new (data: unknown) => T;

export interface RequestParams<T = unknown> {
  _client: Client;
  module: string;
  method: string;
  param: Record<string, unknown> | Record<number, unknown>;
  responseModel?: ResponseModel<T>;
  comm?: Record<string, unknown> | null;
  overrideComm?: boolean;
  isJce?: boolean;
  preserveBool?: boolean;
  credential?: Credential | null;
  platform?: Platform | null;
  allowErrorCodes?: AllowErrorCodes;
  parseOnAllow?: boolean;
  sign?: boolean;
}

export type RequestResultT = unknown;

function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(deepClone) as unknown as T;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, deepClone(v)]),
  ) as T;
}

/**
 * 构建解析结果 — 对应 Python 的 _build_result()
 */
export function buildResult(
  raw: Record<string, unknown> | Map<number, unknown>,
  responseModel?: new (data: unknown) => unknown,
): unknown {
  if (responseModel) {
    return new responseModel(raw);
  }
  return raw;
}

/**
 * Request — 可直接 await 的声明式请求描述符
 * 实现 PromiseLike 以支持 `await request` 语法
 */
export class Request<T = unknown> implements PromiseLike<T> {
  readonly _client: Client;
  readonly module: string;
  readonly method: string;
  readonly param: Record<string, unknown> | Record<number, unknown>;
  readonly responseModel?: new (data: unknown) => T;
  readonly comm: Record<string, unknown> | null;
  readonly overrideComm: boolean;
  readonly isJce: boolean;
  readonly preserveBool: boolean;
  readonly credential: Credential | null;
  readonly platform: Platform | null;
  readonly allowErrorCodes: AllowErrorCodes;
  readonly parseOnAllow: boolean;
  readonly sign: boolean;

  constructor(params: RequestParams<T> & { responseModel?: new (data: unknown) => T }) {
    this._client = params._client;
    this.module = params.module;
    this.method = params.method;
    this.param = params.param;
    this.responseModel = params.responseModel;
    this.comm = params.comm ?? null;
    this.overrideComm = params.overrideComm ?? false;
    this.isJce = params.isJce ?? false;
    this.preserveBool = params.preserveBool ?? false;
    this.credential = params.credential ?? null;
    this.platform = params.platform ?? null;
    this.allowErrorCodes = params.allowErrorCodes ?? null;
    this.parseOnAllow = params.parseOnAllow ?? false;
    this.sign = params.sign ?? false;
  }

  /** 实现 PromiseLike — 使 Request 可直接 await */
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this._client.execute(this as Request<unknown>).then(onfulfilled as (value: unknown) => TResult1 | PromiseLike<TResult1>, onrejected);
  }

  /** 用于批量合并的分组键 */
  get _groupKey(): string {
    const commEntries = this.comm
      ? Object.entries(this.comm).sort(([a], [b]) => a.localeCompare(b))
      : [];
    return JSON.stringify([
      this.isJce,
      this.platform ?? this._client.platform,
      commEntries,
      this.overrideComm,
      this.credential ? `${this.credential.musicid}:${this.credential.musickey}` : "",
      this.sign,
    ]);
  }

  /** 不可变更新 — 返回新 Request */
  replace(changes: Partial<RequestParams<T>>): Request<T> {
    const newParams: RequestParams<T> = {
      _client: this._client,
      module: this.module,
      method: this.method,
      param: deepClone(changes.param ?? this.param) as Record<string, unknown>,
      responseModel: changes.responseModel ?? this.responseModel,
      comm: changes.comm !== undefined ? deepClone(changes.comm as Record<string, unknown>) : this.comm,
      overrideComm: changes.overrideComm ?? this.overrideComm,
      isJce: changes.isJce ?? this.isJce,
      preserveBool: changes.preserveBool ?? this.preserveBool,
      credential: changes.credential !== undefined ? changes.credential : this.credential,
      platform: changes.platform ?? this.platform,
      allowErrorCodes: changes.allowErrorCodes ?? this.allowErrorCodes,
      parseOnAllow: changes.parseOnAllow ?? this.parseOnAllow,
      sign: changes.sign ?? this.sign,
    };
    return new Request<T>(newParams);
  }
}

/**
 * PaginatedRequest — 带分页元数据的 Request
 */
export class PaginatedRequest<T = unknown> extends Request<T> {
  readonly pagerMeta: PagerMeta;

  constructor(
    params: RequestParams<T> & { pagerMeta: PagerMeta; responseModel?: new (data: unknown) => T },
  ) {
    super(params);
    this.pagerMeta = params.pagerMeta;
  }

  getPagerMeta(): PagerMeta {
    return this.pagerMeta;
  }

  async *paginate(limit?: number): AsyncGenerator<T, void, undefined> {
    // Will be implemented when pagination framework is ready
    const { ResponsePager } = await import("./pagination.js");
    const pager = new ResponsePager<T>(this, this.pagerMeta, limit);
    for await (const page of pager) {
      yield page;
    }
  }
}

/**
 * RefreshableRequest — 带刷新元数据的 Request
 */
export class RefreshableRequest<T = unknown> extends Request<T> {
  readonly refreshMeta: RefreshMeta;

  constructor(
    params: RequestParams<T> & { refreshMeta: RefreshMeta; responseModel?: new (data: unknown) => T },
  ) {
    super(params);
    this.refreshMeta = params.refreshMeta;
  }

  getRefreshMeta(): RefreshMeta {
    return this.refreshMeta;
  }

  async refresh(): Promise<T | null> {
    const { ResponseRefresher } = await import("./pagination.js");
    const refresher = new ResponseRefresher<T>(this, this.refreshMeta);
    return refresher.refresh();
  }
}
