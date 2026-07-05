/** 私信相关 API 模块 — 全部需要登录 */

import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { Platform } from "../core/versioning.js";
import { CursorStrategy, ResponseAdapter } from "../core/pagination.js";
import type { Credential } from "../models/request.js";

export class PrivateMessageApi extends ApiModule {
  constructor(client: import("../core/client.js").Client) { super(client); }

  getSessions(lastId?: number, order?: number, size?: number, lastTime?: number, from?: number, fansFlag?: number, encryptFromUin?: string, credential?: Credential | null): PaginatedRequest {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgRead", method: "GetSessionList",
      param: { last_id: lastId ?? 0, order: order ?? 1, size: size ?? 20, last_time: lastTime ?? 0, from: from ?? 0,
        ...(fansFlag !== undefined ? { FansFlag: fansFlag } : {}),
        ...(encryptFromUin ? { EncryptFromUin: encryptFromUin } : {}),
      },
      platform: Platform.ANDROID, credential, requireLogin: true,
      pagerMeta: {
        strategy: new CursorStrategy("last_id"),
        adapter: new ResponseAdapter({ hasMoreFlag: (d: unknown) => (d as Record<string,number>).has_more === 1, cursor: (d: unknown) => { const s = (d as {sessions?: {session_id: number}[]}).sessions; return s?.length ? s[s.length-1].session_id : null; }}),
      },
    }) as PaginatedRequest;
  }

  deleteSession(sessionId: number, superMsgFlag?: number, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgWrite", method: "DeleteSession",
      param: { session_id: sessionId, super_msg_flag: superMsgFlag ?? 0 },
      platform: Platform.ANDROID, credential, requireLogin: true,
    }) as Request;
  }

  getMessages(sessionId: number, userId: number, lastId?: number, order?: number, size?: number, credential?: Credential | null): PaginatedRequest {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgRead", method: "GetMessage",
      param: { session_id: sessionId, user_id: userId, last_id: lastId ?? 0, order: order ?? 1, size: size ?? 20, flag: 0 },
      platform: Platform.ANDROID, credential, requireLogin: true,
      pagerMeta: {
        strategy: new CursorStrategy("last_id"),
        adapter: new ResponseAdapter({ hasMoreFlag: (d: unknown) => (d as Record<string,number>).has_more === 1, cursor: (d: unknown) => { const ms = (d as {messages?: {id: number}[]}).messages; return ms?.length ? ms[ms.length-1].id : null; }}),
      },
    }) as PaginatedRequest;
  }

  sendMessage(userId: number, msgType: number, content: string, sessionId?: number, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgWrite", method: "SendMessageAsync",
      param: { user_id: userId, msg_type: msgType, content, session_id: sessionId ?? 0, last_msg_seq: 0, entrance: 0, client_key: "", source_flag: 0 },
      platform: Platform.ANDROID, credential, requireLogin: true,
    }) as Request;
  }

  deleteMessage(sessionId: number, msgId: number, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgWrite", method: "DeleteMessage",
      param: { session_id: sessionId, msg_id: msgId, super_msg_flag: 0 },
      platform: Platform.ANDROID, credential, requireLogin: true,
    }) as Request;
  }

  clearSession(sessionId: number, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgWrite", method: "ClearSession",
      param: { session_id: sessionId, super_msg_flag: 0 },
      platform: Platform.ANDROID, credential, requireLogin: true,
    }) as Request;
  }

  setConfig(configType: number, configValue: string, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgWrite", method: "SetConfig",
      param: { config_type: configType, config_value_str: configValue },
      platform: Platform.ANDROID, credential, requireLogin: true,
    }) as Request;
  }

  getConfig(configType: number, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgRead", method: "GetConfig",
      param: { config_type: configType, config_value_str: "" },
      platform: Platform.ANDROID, credential, requireLogin: true,
    }) as Request;
  }

  getMusicianMessageCard(encUin: string, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.privateMsg.MusicianMsgCardSvr", method: "GetMusicianCard",
      param: { EncUin: encUin },
      platform: Platform.ANDROID, credential, requireLogin: true,
    }) as Request;
  }

  getSafetyHint(encUin: string, close?: number, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.privateMsg.PrivateMsgRead", method: "GetSafetyHint",
      param: { encUin, close: close ?? 0 },
      platform: Platform.ANDROID, credential, requireLogin: true,
    }) as Request;
  }
}
