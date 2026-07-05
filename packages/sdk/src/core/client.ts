/** API 客户端核心实现 */

import { Request } from "./request.js";
import type { RequestItem } from "../models/request.js";
import { Credential } from "../models/request.js";
import type { Credential as CredentialType } from "../models/request.js";
import type { Platform, CommParamsMap } from "./versioning.js";
import { DEFAULT_VERSION_POLICY } from "./versioning.js";
import type { VersionPolicy } from "./versioning.js";
import { DeviceManager } from "../utils/device.js";
import { QimeiManager } from "../utils/qimei.js";
import { zzcSign } from "../algorithms/sign.js";
import { boolToInt } from "../utils/common.js";
import {
  NetworkError, HTTPError, ApiDataError, GlobalApiError,
  CgiApiException, CredentialExpiredError, RatelimitedError, SignatureRequiredError,
} from "./exceptions.js";

// ─── Module imports ────────────────────────────────────────
import { SongApi } from "../modules/song.js";
import { SingerApi } from "../modules/singer.js";
import { SearchApi } from "../modules/search.js";
import { AlbumApi } from "../modules/album.js";
import { SonglistApi } from "../modules/songlist.js";
import { MvApi } from "../modules/mv.js";
import { LyricApi } from "../modules/lyric.js";
import { CommentApi } from "../modules/comment.js";
import { TopApi } from "../modules/top.js";
import { RecommendApi } from "../modules/recommend.js";
import { UserApi } from "../modules/user.js";
import { LoginApi } from "../modules/login.js";
import { PrivateMessageApi } from "../modules/private_message.js";
import { HelperApi } from "../modules/helper.js";

const SESSION_TTL = 86400; // 24 hours in seconds

export interface ClientOptions {
  credential?: Credential;
  platform?: Platform;
  devicePath?: string | null;
  rate?: number;
  capacity?: number;
  connectRetries?: number;
}

export class Client {
  credential: CredentialType;
  platform: Platform;
  private _deviceStore: DeviceManager;
  _versionPolicy: VersionPolicy = DEFAULT_VERSION_POLICY;
  private _qimeiManager: QimeiManager;
  private _sessionCache: { uid: string; sid: string; vkey: string | null } | null = null;
  private _sessionInitPromise: Promise<void> | null = null;
  private _rate: number;
  private _capacity: number;
  private _connectRetries: number;

  // Module instances (lazy-initialized)
  private _song?: SongApi;
  private _singer?: SingerApi;
  private _search?: SearchApi;
  private _album?: AlbumApi;
  private _songlist?: SonglistApi;
  private _mv?: MvApi;
  private _lyric?: LyricApi;
  private _comment?: CommentApi;
  private _top?: TopApi;
  private _recommend?: RecommendApi;
  private _user?: UserApi;
  private _login?: LoginApi;
  private _privateMessage?: PrivateMessageApi;
  private _helper?: HelperApi;

  constructor(options: ClientOptions = {}) {
    this.credential = options.credential ?? new Credential();
    this.platform = options.platform ?? "android" as Platform;
    this._rate = options.rate ?? 10;
    this._capacity = options.capacity ?? 50;
    this._connectRetries = options.connectRetries ?? 2;

    this._deviceStore = new DeviceManager(options.devicePath ?? null);

    this._qimeiManager = new QimeiManager(
      this._deviceStore,
      this._versionPolicy.getQimeiAppVersion(),
      this._versionPolicy.getQimeiSdkVersion(),
    );
  }

  getVersionPolicy(): VersionPolicy {
    return this._versionPolicy;
  }

  // ─── Module Accessors (lazy init) ──────────────────────

  get song(): SongApi { return this._song ??= new SongApi(this); }
  get singer(): SingerApi { return this._singer ??= new SingerApi(this); }
  get search(): SearchApi { return this._search ??= new SearchApi(this); }
  get album(): AlbumApi { return this._album ??= new AlbumApi(this); }
  get songlist(): SonglistApi { return this._songlist ??= new SonglistApi(this); }
  get mv(): MvApi { return this._mv ??= new MvApi(this); }
  get lyric(): LyricApi { return this._lyric ??= new LyricApi(this); }
  get comment(): CommentApi { return this._comment ??= new CommentApi(this); }
  get top(): TopApi { return this._top ??= new TopApi(this); }
  get recommend(): RecommendApi { return this._recommend ??= new RecommendApi(this); }
  get user(): UserApi { return this._user ??= new UserApi(this); }
  get login(): LoginApi { return this._login ??= new LoginApi(this); }
  get privateMessage(): PrivateMessageApi { return this._privateMessage ??= new PrivateMessageApi(this); }
  get helper(): HelperApi { return this._helper ??= new HelperApi(this); }

  // ─── Session Management ────────────────────────────────

  private _isSessionExpired(): boolean {
    if (!this._sessionCache) return true;
    const device = this._deviceStore["_device"] as import("../utils/device.js").Device | null;
    if (!device || !device.sessionSaveTime) return true;
    return Math.floor(Date.now() / 1000) - device.sessionSaveTime >= SESSION_TTL;
  }

  async _ensureSession(): Promise<void> {
    const device = await this._deviceStore.getDevice();

    if (!this._isSessionExpired() && !this._sessionInitPromise) return;

    if (this._sessionInitPromise) {
      await this._sessionInitPromise;
      if (!this._isSessionExpired()) return;
    }

    // Double-checked locking via promise chain
    this._sessionInitPromise = this._doInitSession();
    await this._sessionInitPromise;
    this._sessionInitPromise = null;
  }

  private async _doInitSession(): Promise<void> {
    const device = await this._deviceStore.getDevice();

    // Check if we can reuse existing session
    if (!this._isSessionExpired() && device.sessionUid && device.sessionSid) {
      this._sessionCache = {
        uid: device.sessionUid,
        sid: device.sessionSid,
        vkey: device.sessionVkey,
      };
      return;
    }

    const qimei = await this._qimeiManager.getCached();
    const comm = this._versionPolicy.buildComm(
      "android" as Platform,
      this.credential,
      device,
      qimei,
      device.openUdid,
    );

    const payload = {
      comm,
      req_0: {
        module: "music.getSession.session",
        method: "GetSession",
        param: {
          uid: device.sessionUid || "",
          vkey: 0,
          caller: 0,
        },
      },
    };

    const ua = this._versionPolicy.getUserAgent("android" as Platform, device);

    let resp: Response;
    try {
      resp = await fetch("https://u.y.qq.com/cgi-bin/musicu.fcg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": ua,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new NetworkError(String(err));
    }

    if (resp.status !== 200) {
      throw new HTTPError(`HTTP 请求状态码异常: ${resp.status}`, resp.status);
    }

    const respData = await resp.json() as Record<string, unknown>;
    const sessionData = ((respData as Record<string, unknown>).req_0 as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    const session = sessionData?.session as Record<string, unknown> | undefined;
    if (!session) {
      throw new ApiDataError("Session data missing from response");
    }

    const now = Math.floor(Date.now() / 1000);
    device.sessionUid = String(session.uid);
    device.sessionSid = String(session.sid);
    device.sessionVkey = (session.vkey as string) ?? null;
    device.sessionSaveTime = now;

    this._sessionCache = {
      uid: device.sessionUid,
      sid: device.sessionSid,
      vkey: device.sessionVkey,
    };

    await this._deviceStore.saveDevice();
  }

  // ─── HTTP Request Methods ──────────────────────────────

  async _getUserAgent(platform: Platform): Promise<string> {
    const device = await this._deviceStore.getDevice();
    return this._versionPolicy.getUserAgent(platform, device);
  }

  async request(
    method: string,
    url: string,
    credential?: Credential | null,
    platform?: Platform | null,
    lazy?: boolean,
    kwargs?: Record<string, unknown>,
  ): Promise<Response> {
    const targetPlatform = platform ?? this.platform;
    const targetCredential = credential ?? this.credential;
    const userAgent = await this._getUserAgent(targetPlatform);

    const headers: Record<string, string> = {
      "User-Agent": userAgent,
      ...(kwargs?.headers as Record<string, string> || {}),
    };

    // Add cookie-style credential headers
    if (targetCredential?.musicid) {
      headers["Cookie"] = [
        `uin=${targetCredential.musicid}`,
        targetCredential.musickey ? `qqmusic_key=${targetCredential.musickey}` : "",
        targetCredential.musickey ? `qm_keyst=${targetCredential.musickey}` : "",
      ].filter(Boolean).join("; ");
    }

    try {
      const resp = await fetch(url, {
        method,
        headers,
        ...kwargs as RequestInit,
      });
      return resp;
    } catch (err) {
      throw new NetworkError(String(err));
    }
  }

  async requestApi(
    data: RequestItem[],
    comm?: CommParamsMap | null,
    credential?: Credential | null,
    platform?: Platform | null,
    opts?: {
      overrideComm?: boolean;
      isJce?: boolean;
      lazy?: boolean;
      sign?: boolean;
    },
  ): Promise<Response> {
    const targetPlatform = opts?.isJce ? ("android" as Platform) : (platform ?? this.platform);
    const targetCredential = credential ?? this.credential;

    // Auto-build comm if not overriding
    let finalComm: CommParamsMap = {};
    if (!opts?.overrideComm) {
      const device = await this._deviceStore.getDevice();
      const qimei = await this._qimeiManager.getCached();
      finalComm = this._versionPolicy.buildComm(
        targetPlatform,
        targetCredential,
        device,
        qimei,
        device.openUdid,
      );
    }
    if (comm) {
      finalComm = { ...finalComm, ...comm };
    }

    // Build payload
    const payload: Record<string, unknown> = { comm: finalComm };
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      let param = item.param;
      if (!item.preserveBool) {
        param = boolToInt(param) as Record<string, unknown>;
      }
      payload[`req_${i}`] = {
        module: item.module,
        method: item.method,
        param,
      };
    }

    const url = opts?.sign
      ? "https://u.y.qq.com/cgi-bin/musics.fcg"
      : "https://u.y.qq.com/cgi-bin/musicu.fcg";

    const ua = await this._getUserAgent(targetPlatform);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": ua,
        },
        body: JSON.stringify(payload),
      });
      return resp;
    } catch (err) {
      throw new NetworkError(String(err));
    }
  }

  // ─── Execute Single Request ────────────────────────────

  async execute<T>(request: Request<T>): Promise<T> {
    // Ensure session for Android platform requests
    if ((request.platform ?? this.platform) === "android") {
      await this._ensureSession();
    }

    const items: RequestItem[] = [{
      module: request.module,
      method: request.method,
      param: request.param,
      preserveBool: request.preserveBool,
    }];

    const resp = await this.requestApi(items, request.comm, request.credential, request.platform, {
      overrideComm: request.overrideComm,
      isJce: request.isJce,
      sign: request.sign,
    });

    return this._validateAndParse(resp, items[0], request) as T;
  }

  // ─── Batch Execute ─────────────────────────────────────

  async gather<T>(
    requests: Request<T>[],
    batchSize: number = 20,
    returnExceptions: boolean = false,
  ): Promise<(T | null)[]> {
    // Group requests by _groupKey
    const groups = new Map<string, { requests: Request<T>[]; indices: number[] }>();

    for (let i = 0; i < requests.length; i++) {
      const req = requests[i];
      const key = req._groupKey;
      if (!groups.has(key)) {
        groups.set(key, { requests: [], indices: [] });
      }
      groups.get(key)!.requests.push(req);
      groups.get(key)!.indices.push(i);
    }

    // Batch each group
    const allPromises: Promise<{ index: number; result: T | null; error?: Error }>[] = [];

    for (const [, group] of groups) {
      for (let start = 0; start < group.requests.length; start += batchSize) {
        const batch = group.requests.slice(start, start + batchSize);
        const indices = group.indices.slice(start, start + batchSize);

        const promise = this._executeBatch(batch, indices, returnExceptions);
        allPromises.push(...promise);
      }
    }

    const resolved = await Promise.all(allPromises);

    // Reorder results by original index
    const results: (T | null)[] = new Array(requests.length).fill(null);
    for (const { index, result, error } of resolved) {
      if (error && !returnExceptions) throw error;
      results[index] = result;
    }

    return results;
  }

  private _executeBatch<T>(
    batch: Request<T>[],
    indices: number[],
    returnExceptions: boolean,
  ): Promise<{ index: number; result: T | null; error?: Error }>[] {
    const items: RequestItem[] = batch.map((req) => ({
      module: req.module,
      method: req.method,
      param: req.param,
      preserveBool: req.preserveBool,
    }));

    // Send all as one batch request
    const firstReq = batch[0];

    return indices.map(async (originalIndex, i) => {
      try {
        const resp = await this.requestApi(items, firstReq.comm, firstReq.credential, firstReq.platform, {
          overrideComm: firstReq.overrideComm,
          isJce: firstReq.isJce,
          sign: firstReq.sign,
        });

        const respData = await resp.json() as Record<string, unknown>;
        const itemData = respData[`req_${i}`] as Record<string, unknown>;
        const result = this._parseCgiItem(itemData, batch[i]) as T;
        return { index: originalIndex, result };
      } catch (err) {
        if (returnExceptions) {
          return { index: originalIndex, result: null, error: err as Error };
        }
        throw err;
      }
    });
  }

  // ─── Response Validation & Parsing ─────────────────────

  private async _validateAndParse<T>(
    resp: Response,
    item: RequestItem,
    request: Request<T>,
  ): Promise<T> {
    if (resp.status !== 200) {
      throw new HTTPError(`HTTP ${resp.status}`, resp.status);
    }

    const body = await resp.text();
    if (!body) {
      throw new ApiDataError("Empty response body");
    }

    let respData: Record<string, unknown>;
    try {
      respData = JSON.parse(body) as Record<string, unknown>;
    } catch {
      throw new ApiDataError("Failed to parse JSON response");
    }

    // Check top-level code
    if (respData.code !== undefined && respData.code !== 0) {
      throw new GlobalApiError(
        null,
        respData.code as number,
        respData,
      );
    }

    const itemData = respData.req_0 as Record<string, unknown>;
    return this._parseCgiItem(itemData, request) as T;
  }

  private _parseCgiItem(itemData: Record<string, unknown>, request: Request): unknown {
    if (!itemData) {
      throw new ApiDataError("Response item missing");
    }

    const code = (itemData.code ?? 0) as number;

    if (code === 0 || this._isAllowedError(code, request.allowErrorCodes)) {
      const data = itemData.data;
      if (request.responseModel) {
        return new request.responseModel(data);
      }
      return data;
    }

    switch (code) {
      case 2000:
        throw new SignatureRequiredError(2000, itemData);
      case 2001:
        throw new RatelimitedError(undefined, 2001, itemData);
      case 1000:
      case 104401:
      case 104400:
        throw new CredentialExpiredError(undefined, code, itemData);
      default:
        throw new CgiApiException(null, code, itemData);
    }
  }

  private _isAllowedError(code: number, allowErrorCodes: Request["allowErrorCodes"]): boolean {
    if (!allowErrorCodes) return false;
    if (allowErrorCodes instanceof Set) return allowErrorCodes.has(String(code));
    if (Array.isArray(allowErrorCodes)) return allowErrorCodes.includes(String(code));
    return String(code) === allowErrorCodes;
  }

  // ─── Cleanup ───────────────────────────────────────────

  async close(): Promise<void> {
    this._song = undefined;
    this._sessionCache = null;
  }
}
