/** API 模块基类 */

import type { Client } from "../core/client.js";
import type { Credential } from "../models/request.js";
import type { Platform } from "../core/versioning.js";
import type { PagerMeta, RefreshMeta } from "../core/pagination.js";
import type { AllowErrorCodes } from "../core/request.js";
import { Request, PaginatedRequest, RefreshableRequest } from "../core/request.js";
import type { PaginatedRequest as PaginatedRequestType, RefreshableRequest as RefreshableRequestType } from "../core/request.js";
import { CredentialInvalidError } from "../core/exceptions.js";

export interface BuildRequestOptions {
  module: string;
  method: string;
  param: Record<string, unknown> | Record<number, unknown>;
  responseModel?: (new (data: unknown) => unknown) | null;
  comm?: Record<string, unknown> | null;
  overrideComm?: boolean;
  isJce?: boolean;
  preserveBool?: boolean;
  credential?: Credential | null;
  platform?: Platform | null;
  allowErrorCodes?: AllowErrorCodes;
  parseOnAllow?: boolean;
  pagerMeta?: PagerMeta | null;
  refreshMeta?: RefreshMeta | null;
  sign?: boolean;
  requireLogin?: boolean;
}

export class ApiModule {
  protected _client: Client;

  constructor(client: Client) {
    this._client = client;
  }

  protected _requireLogin(credential?: Credential | null): Credential {
    const targetCredential = credential ?? this._client.credential;
    if (!targetCredential || !targetCredential.musicid || !targetCredential.musickey) {
      throw new CredentialInvalidError("接口需要有效登录凭证");
    }
    return targetCredential;
  }

  protected async _request(
    method: string,
    url: string,
    credential?: Credential | null,
    platform?: Platform | null,
    lazy?: boolean,
    kwargs?: Record<string, unknown>,
  ): Promise<unknown> {
    return this._client.request(method, url, credential, platform, lazy, kwargs);
  }

  protected _buildQueryCommonParams(platform?: Platform | null): Record<string, number> {
    const profile = this._client.getVersionPolicy().getProfile(platform ?? this._client.platform);
    return { ct: profile.ct, cv: profile.cv };
  }

  /**
   * 构建可 await 的请求描述符
   */
  protected _buildRequest(
    options: BuildRequestOptions,
  ): Request | PaginatedRequest | RefreshableRequest {
    const {
      module,
      method,
      param,
      responseModel,
      comm,
      overrideComm,
      isJce,
      preserveBool,
      credential,
      platform,
      allowErrorCodes,
      parseOnAllow,
      pagerMeta,
      refreshMeta,
      sign,
      requireLogin,
    } = options;

    if (pagerMeta && refreshMeta) {
      throw new Error("pagerMeta 与 refreshMeta 不能同时声明");
    }

    let finalCredential = credential ?? null;
    if (requireLogin) {
      finalCredential = this._requireLogin(credential);
    }

    const commonKwargs: Record<string, unknown> = {
      _client: this._client,
      module,
      method,
      param,
      responseModel: responseModel ?? undefined,
      comm: comm ?? null,
      overrideComm: overrideComm ?? false,
      isJce: isJce ?? false,
      preserveBool: preserveBool ?? false,
      credential: finalCredential,
      platform: platform ?? null,
      allowErrorCodes: allowErrorCodes ?? null,
      parseOnAllow: parseOnAllow ?? false,
      sign: sign ?? false,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base = commonKwargs as any;
    if (pagerMeta) {
      return new PaginatedRequest({ ...base, pagerMeta });
    }
    if (refreshMeta) {
      return new RefreshableRequest({ ...base, refreshMeta });
    }
    return new Request(base);
  }
}
