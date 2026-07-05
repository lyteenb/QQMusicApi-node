/** 分页与刷新框架 — 策略模式 */

import type { Request, PaginatedRequest, RefreshableRequest } from "./request.js";

// ─── Types ─────────────────────────────────────────────────

export type PaginationParams = Record<string, unknown> | Record<number, unknown>;

export type NextParamsBuilder = (
  params: PaginationParams,
  response: unknown,
  adapter: ResponseAdapter,
) => PaginationParams | null;

// ─── ResponseAdapter ───────────────────────────────────────

type ExtractorFn<T> = ((data: unknown) => T) | string;

export class ResponseAdapter {
  private hasMoreFlag?: ((data: unknown) => boolean) | null;
  private total?: ((data: unknown) => number) | null;
  private cursor?: ((data: unknown) => unknown) | null;
  private count?: ((data: unknown) => number) | null;

  constructor(opts?: {
    hasMoreFlag?: ExtractorFn<boolean> | null;
    total?: ExtractorFn<number> | null;
    cursor?: ExtractorFn<unknown> | null;
    count?: ExtractorFn<number> | null;
  }) {
    this.hasMoreFlag = opts?.hasMoreFlag ? this._makeExtractor(opts.hasMoreFlag) : null;
    this.total = opts?.total ? this._makeExtractor(opts.total) : null;
    this.cursor = opts?.cursor ? this._makeExtractor(opts.cursor) : null;
    this.count = opts?.count ? this._makeExtractor(opts.count) : null;
  }

  private _makeExtractor<T>(extractor: ExtractorFn<T>): (data: unknown) => T {
    if (typeof extractor === "function") return extractor;
    const path = extractor.split(".");
    return (data: unknown): T => {
      let current: unknown = data;
      for (const key of path) {
        if (current && typeof current === "object") {
          current = (current as Record<string, unknown>)[key];
        } else {
          return undefined as unknown as T;
        }
      }
      return current as T;
    };
  }

  getHasMoreFlag(data: unknown): boolean | undefined {
    return this.hasMoreFlag?.(data);
  }

  getTotal(data: unknown): number | undefined {
    return this.total?.(data);
  }

  getCursor(data: unknown): unknown {
    return this.cursor?.(data);
  }

  getCount(data: unknown): number | undefined {
    return this.count?.(data);
  }
}

// ─── Strategy Interfaces ──────────────────────────────────

export interface PagerStrategy {
  hasNext(params: PaginationParams, response: unknown, adapter: ResponseAdapter): boolean;
  nextParams(params: PaginationParams, response: unknown, adapter: ResponseAdapter): PaginationParams | null;
}

export interface RefresherStrategy {
  hasNext(params: PaginationParams, response: unknown, adapter: ResponseAdapter): boolean;
  nextParams(params: PaginationParams, response: unknown, adapter: ResponseAdapter): PaginationParams | null;
}

// ─── Concrete Strategies ──────────────────────────────────

export class PageStrategy implements PagerStrategy {
  constructor(
    private pageKey: string = "page",
    private pageSize: number = 20,
    private startPage: number = 1,
  ) {}

  hasNext(params: PaginationParams, _response: unknown, adapter: ResponseAdapter): boolean {
    const flag = adapter.getHasMoreFlag(_response);
    if (flag !== undefined) return flag;
    const total = adapter.getTotal(_response);
    if (total !== undefined) {
      const page = (params as Record<string, unknown>)[this.pageKey] as number ?? this.startPage;
      return page * this.pageSize < total;
    }
    return true;
  }

  nextParams(params: PaginationParams, _response: unknown, _adapter: ResponseAdapter): PaginationParams {
    const next: Record<string, unknown> = { ...(params as Record<string, unknown>) };
    const currentPage = (next[this.pageKey] as number) ?? this.startPage;
    next[this.pageKey] = currentPage + 1;
    return next;
  }
}

export class OffsetStrategy implements PagerStrategy {
  constructor(
    private offsetKey: string = "begin",
    private pageSizeKey: string = "num",
    private pageSize: number = 20,
    private startOffset: number = 0,
  ) {}

  hasNext(params: PaginationParams, response: unknown, adapter: ResponseAdapter): boolean {
    const flag = adapter.getHasMoreFlag(response);
    if (flag !== undefined) return flag;
    const total = adapter.getTotal(response);
    if (total !== undefined) {
      const p = params as Record<string, unknown>;
      const offset = (p[this.offsetKey] as number) ?? this.startOffset;
      const size = (p[this.pageSizeKey] as number) ?? this.pageSize;
      return offset + size < total;
    }
    const count = adapter.getCount(response);
    return count !== undefined && count > 0;
  }

  nextParams(params: PaginationParams, response: unknown, adapter: ResponseAdapter): PaginationParams {
    const next: Record<string, unknown> = { ...(params as Record<string, unknown>) };
    const offset = (next[this.offsetKey] as number) ?? this.startOffset;
    const size = (next[this.pageSizeKey] as number) ?? this.pageSize;
    const count = adapter.getCount(response) ?? size;
    next[this.offsetKey] = offset + count;
    return next;
  }
}

export class CursorStrategy implements PagerStrategy {
  constructor(private cursorKey: string) {}

  hasNext(_params: PaginationParams, response: unknown, adapter: ResponseAdapter): boolean {
    const cursor = adapter.getCursor(response);
    if (cursor === undefined || cursor === null) return false;
    if (typeof cursor === "number" && cursor === 0) return false;
    return true;
  }

  nextParams(params: PaginationParams, response: unknown, adapter: ResponseAdapter): PaginationParams {
    const next: Record<string, unknown> = { ...(params as Record<string, unknown>) };
    next[this.cursorKey] = adapter.getCursor(response);
    return next;
  }
}

export class MultiFieldContinuationStrategy implements PagerStrategy {
  constructor(
    private buildNextParams: NextParamsBuilder,
    private contextName?: string,
  ) {}

  hasNext(_params: PaginationParams, response: unknown, adapter: ResponseAdapter): boolean {
    return adapter.getHasMoreFlag(response) ?? false;
  }

  nextParams(params: PaginationParams, response: unknown, adapter: ResponseAdapter): PaginationParams | null {
    return this.buildNextParams(params, response, adapter);
  }
}

export class BatchRefreshStrategy implements RefresherStrategy {
  constructor(private refreshKey: string) {}

  hasNext(_params: PaginationParams, response: unknown, adapter: ResponseAdapter): boolean {
    return adapter.getHasMoreFlag(response) ?? false;
  }

  nextParams(params: PaginationParams, response: unknown, adapter: ResponseAdapter): PaginationParams {
    const next: Record<string, unknown> = { ...(params as Record<string, unknown>) };
    next[this.refreshKey] = adapter.getCursor(response);
    return next;
  }
}

// ─── Metadata ──────────────────────────────────────────────

export interface PagerMeta {
  strategy: PagerStrategy;
  adapter: ResponseAdapter;
}

export interface RefreshMeta {
  strategy: RefresherStrategy;
  adapter: ResponseAdapter;
}

// ─── Iterator Base ────────────────────────────────────────

abstract class BaseResponseAdvancer<T> {
  protected _nextRequest: Request<T> | null;

  constructor(request: Request<T>) {
    this._nextRequest = request;
  }

  protected async _advance(): Promise<T> {
    if (!this._nextRequest) {
      throw new Error("No more pages");
    }
    const result = await this._nextRequest;
    this._nextRequest = null; // subclasses will set next if available
    return result;
  }

  hasMore(): boolean {
    return this._nextRequest !== null;
  }
}

// ─── ResponsePager (AsyncIterator) ─────────────────────────

export class ResponsePager<T> extends BaseResponseAdvancer<T> implements AsyncIterator<T> {
  private meta: PagerMeta;
  private limit: number | null;
  private count: number = 0;

  constructor(request: PaginatedRequest<T>, meta: PagerMeta, limit?: number | null) {
    super(request as Request<T>);
    this.meta = meta;
    this.limit = limit ?? null;
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.limit !== null && this.count >= this.limit) {
      return { value: undefined as unknown as T, done: true };
    }

    const request = this._nextRequest;
    if (!request) {
      return { value: undefined as unknown as T, done: true };
    }

    const result = await request;
    this.count++;

    // Check if there are more pages
    if (this.meta.strategy.hasNext(request.param, result, this.meta.adapter)) {
      const nextParam = this.meta.strategy.nextParams(request.param, result, this.meta.adapter);
      if (nextParam) {
        this._nextRequest = request.replace({ param: nextParam }) as Request<T>;
      } else {
        this._nextRequest = null;
      }
    } else {
      this._nextRequest = null;
    }

    return { value: result, done: false };
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this;
  }
}

// ─── ResponseRefresher ─────────────────────────────────────

export class ResponseRefresher<T> extends BaseResponseAdvancer<T> {
  private meta: RefreshMeta;
  private _firstResult: T | null = null;
  private request: RefreshableRequest<T>;

  constructor(request: RefreshableRequest<T>, meta: RefreshMeta) {
    super(request as Request<T>);
    this.request = request;
    this.meta = meta;
  }

  async first(): Promise<T> {
    if (this._firstResult !== null) return this._firstResult;
    this._firstResult = await super._advance();

    // Setup next request for refresh
    if (this.meta.strategy.hasNext(this.request.param, this._firstResult, this.meta.adapter)) {
      const nextParam = this.meta.strategy.nextParams(this.request.param, this._firstResult, this.meta.adapter);
      if (nextParam) {
        this._nextRequest = this.request.replace({ param: nextParam }) as Request<T>;
      }
    }

    return this._firstResult;
  }

  async refresh(): Promise<T | null> {
    await this.first(); // Ensure first has been called
    if (!this._nextRequest) return null;

    const result = await this._nextRequest;

    if (this.meta.strategy.hasNext(this._nextRequest.param, result, this.meta.adapter)) {
      const nextParam = this.meta.strategy.nextParams(this._nextRequest.param, result, this.meta.adapter);
      if (nextParam) {
        this._nextRequest = this.request.replace({ param: nextParam }) as Request<T>;
      } else {
        this._nextRequest = null;
      }
    } else {
      this._nextRequest = null;
    }

    return result;
  }
}
