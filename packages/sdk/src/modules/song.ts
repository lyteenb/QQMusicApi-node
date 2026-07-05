/** 歌曲相关 API 模块 */

import { getGuid } from "../utils/common.js";
import { ApiModule } from "./_base.js";
import type { BuildRequestOptions } from "./_base.js";
import type { Credential } from "../models/request.js";
import {
  QuerySongResponse,
  GetCdnDispatchResponse,
  GetSongUrlsResponse,
  GetSongDetailResponse,
  GetSimilarSongResponse,
  GetSongLabelsResponse,
  GetRelatedSonglistResponse,
  GetRelatedMvResponse,
  GetOtherVersionResponse,
  GetProducerResponse,
  GetSheetResponse,
  HasSheetMusicResponse,
  GetFavNumResponse,
} from "../models/song.js";
import { BatchRefreshStrategy, ResponseAdapter } from "../core/pagination.js";
import type { RefreshMeta } from "../core/pagination.js";
import { Platform } from "../core/versioning.js";
import type { PaginatedRequest, RefreshableRequest } from "../core/request.js";
import { Request } from "../core/request.js";

// ─── Song File Type Enums ────────────────────────────────

class BaseSongFileType {
  constructor(
    public s: string,
    public e: string,
  ) {}
}

export const SongFileType = {
  DTS_X: new BaseSongFileType("DT03", ".mp4"),
  MASTER: new BaseSongFileType("AI00", ".flac"),
  ATMOS_2: new BaseSongFileType("Q000", ".flac"),
  ATMOS_51: new BaseSongFileType("Q001", ".flac"),
  ATMOS_71: new BaseSongFileType("Q003", ".ogg"),
  ATMOS_DB: new BaseSongFileType("D004", ".mp4"),
  NAC: new BaseSongFileType("TL01", ".nac"),
  FLAC: new BaseSongFileType("F000", ".flac"),
  OGG_640: new BaseSongFileType("O801", ".ogg"),
  OGG_320: new BaseSongFileType("O800", ".ogg"),
  OGG_192: new BaseSongFileType("O600", ".ogg"),
  OGG_96: new BaseSongFileType("O400", ".ogg"),
  MP3_320: new BaseSongFileType("M800", ".mp3"),
  MP3_128: new BaseSongFileType("M500", ".mp3"),
  ACC_192: new BaseSongFileType("C600", ".m4a"),
  ACC_96: new BaseSongFileType("C400", ".m4a"),
  ACC_48: new BaseSongFileType("C200", ".m4a"),
};

export const EncryptedSongFileType = {
  DTS_X: new BaseSongFileType("DTM3", ".mmp4"),
  VINYL: new BaseSongFileType("V0M0", ".mflac"),
  MASTER: new BaseSongFileType("AIM0", ".mflac"),
  ATMOS_2: new BaseSongFileType("Q0M0", ".mflac"),
  ATMOS_51: new BaseSongFileType("Q0M1", ".mflac"),
  ATMOS_71: new BaseSongFileType("Q0M3", ".mgg"),
  ATMOS_DB: new BaseSongFileType("D0M4", ".mmp4"),
  NAC: new BaseSongFileType("TLM1", ".mnac"),
  FLAC: new BaseSongFileType("F0M0", ".mflac"),
  OGG_640: new BaseSongFileType("O8M1", ".mgg"),
  OGG_320: new BaseSongFileType("O8M0", ".mgg"),
  OGG_192: new BaseSongFileType("O6M0", ".mgg"),
  OGG_96: new BaseSongFileType("O4M0", ".mgg"),
};

export const SpecialSongFileType = {
  TRY: new BaseSongFileType("RS02", ".mp3"),
  TRY_OGG_640: new BaseSongFileType("O802", ".ogg"),
  ACCOM: new BaseSongFileType("O801", ".ogg"),
  MULTI: new BaseSongFileType("O601", ".ogg"),
  PIANO: new BaseSongFileType("AI01", ".ogg"),
  BAYIN: new BaseSongFileType("AI02", ".ogg"),
  GUZHENG: new BaseSongFileType("AI03", ".ogg"),
  QUDI: new BaseSongFileType("AI04", ".ogg"),
  HULUSI: new BaseSongFileType("AI05", ".ogg"),
  SUONA: new BaseSongFileType("AI06", ".ogg"),
  SHOUDIE: new BaseSongFileType("AI07", ".ogg"),
  GUITAR: new BaseSongFileType("AI08", ".ogg"),
  DRUMS: new BaseSongFileType("AI09", ".ogg"),
  KAZOO: new BaseSongFileType("A200", ".ogg"),
  THERAPY: new BaseSongFileType("AA01", ".ogg"),
};

export interface SongFileInfo {
  mid: string;
  fileType?: BaseSongFileType;
  songType?: number;
  mediaMid?: string;
}

// ─── SongApi Class ────────────────────────────────────────

export class SongApi extends ApiModule {
  private static GET_SONG_URLS_MAX_MID = 100;
  private static SONG_URL_FALLBACK_DOMAIN = "https://isure.stream.qqmusic.qq.com/";

  /** 根据 id 或 mid 获取歌曲信息 */
  querySong(value: number[] | string[]): Request<typeof QuerySongResponse._type> {
    if (!value.length) throw new Error("value 不能为空");

    const params: Record<string, unknown> = {
      types: value.map(() => 0),
      modify_stamp: value.map(() => 0),
      ctx: 0,
      client: 1,
    };

    const numericValues = value.map((v) => typeof v === "number" || /^\d+$/.test(String(v)));
    if (numericValues.every(Boolean)) {
      params.ids = value.map(Number);
    } else if (numericValues.some(Boolean)) {
      throw new Error("value 不能混合歌曲 ID 与 MID");
    } else {
      params.mids = value.map(String);
    }

    return this._buildRequest({
      module: "music.trackInfo.UniformRuleCtrl",
      method: "CgiGetTrackInfo",
      param: params,
      responseModel: QuerySongResponse as unknown as new (data: unknown) => unknown,
    }) as Request<typeof QuerySongResponse._type>;
  }

  /** 获取音频链接 CDN 信息 */
  getCdnDispatch(): Request<typeof GetCdnDispatchResponse._type> {
    return this._buildRequest({
      module: "music.audioCdnDispatch.cdnDispatch",
      method: "GetCdnDispatch",
      param: {
        guid: getGuid(),
        uid: "0",
        use_new_domain: 1,
        use_ipv6: 1,
      },
      responseModel: GetCdnDispatchResponse as unknown as new (data: unknown) => unknown,
    }) as Request<typeof GetCdnDispatchResponse._type>;
  }

  /** 获取歌曲文件链接 */
  getSongUrls(
    fileInfo: SongFileInfo[],
    fileType: BaseSongFileType = SongFileType.MP3_128,
    credential?: Credential | null,
  ): Request<typeof GetSongUrlsResponse._type> {
    const isEncrypted = Object.values(EncryptedSongFileType).includes(fileType);
    const module = isEncrypted ? "music.vkey.GetEVkey" : "music.vkey.GetVkey";
    const method = isEncrypted ? "CgiGetEVkey" : "UrlGetVkey";

    const songmid: string[] = [];
    const filename: string[] = [];
    const songtype: number[] = [];

    for (const item of fileInfo) {
      songmid.push(item.mid);
      const finalFileType = item.fileType || fileType;
      if (!item.mediaMid) {
        filename.push(`${finalFileType.s}${item.mid}${item.mid}${finalFileType.e}`);
      } else {
        filename.push(`${finalFileType.s}${item.mediaMid}${finalFileType.e}`);
      }
      songtype.push(item.songType || 0);
    }

    return this._buildRequest({
      module,
      method,
      param: {
        uin: credential?.strMusicid || this._client.credential.strMusicid,
        filename,
        guid: getGuid(),
        songmid,
        songtype,
        ctx: 0,
      },
      credential,
    }) as Request<typeof GetSongUrlsResponse._type>;
  }

  /** 获取歌曲详细信息 (Web 平台) */
  getDetail(value: number | string): Request<typeof GetSongDetailResponse._type> {
    const param = (typeof value === "number" || /^\d+$/.test(String(value)))
      ? { song_id: Number(value) }
      : { song_mid: value };
    return this._buildRequest({
      module: "music.pf_song_detail_svr",
      method: "get_song_detail_yqq",
      param,
      platform: Platform.WEB,
      responseModel: GetSongDetailResponse as unknown as new (data: unknown) => unknown,
    }) as Request<typeof GetSongDetailResponse._type>;
  }

  /** 获取相似歌曲 */
  getSimilarSong(songid: number): Request<typeof GetSimilarSongResponse._type> {
    return this._buildRequest({
      module: "music.recommend.TrackRelationServer",
      method: "GetSimilarSongs",
      param: { songid },
      responseModel: GetSimilarSongResponse as unknown as new (data: unknown) => unknown,
    }) as Request<typeof GetSimilarSongResponse._type>;
  }

  /** 获取歌曲标签 */
  getLabels(songid: number): Request<typeof GetSongLabelsResponse._type> {
    return this._buildRequest({
      module: "music.recommend.TrackRelationServer",
      method: "GetSongLabels",
      param: { songid },
      responseModel: GetSongLabelsResponse as unknown as new (data: unknown) => unknown,
    }) as Request<typeof GetSongLabelsResponse._type>;
  }

  /** 获取歌曲相关歌单 (Refreshable) */
  getRelatedSonglist(songid: number, last?: number[] | null): RefreshableRequest<typeof GetRelatedSonglistResponse._type> {
    const refreshMeta: RefreshMeta = {
      strategy: new BatchRefreshStrategy("vecPlaylist"),
      adapter: new ResponseAdapter({
        hasMoreFlag: "has_more",
        cursor: (response: unknown) => {
          const r = response as { playlists?: { id: number }[] };
          return r.playlists?.length ? r.playlists.map((p) => p.id) : null;
        },
      }),
    };

    return this._buildRequest({
      module: "music.recommend.TrackRelationServer",
      method: "GetRelatedPlaylist",
      param: { songid, vecPlaylist: last || [] },
      responseModel: GetRelatedSonglistResponse as unknown as new (data: unknown) => unknown,
      refreshMeta,
    }) as RefreshableRequest<typeof GetRelatedSonglistResponse._type>;
  }

  /** 获取歌曲相关 MV (Refreshable) */
  getRelatedMv(songid: number, lastMvid?: string | null): RefreshableRequest<typeof GetRelatedMvResponse._type> {
    const refreshMeta: RefreshMeta = {
      strategy: new BatchRefreshStrategy("lastmvid"),
      adapter: new ResponseAdapter({
        hasMoreFlag: "has_more",
        cursor: (response: unknown) => {
          const r = response as { mvs?: { id: number }[] };
          return r.mvs?.length ? r.mvs[r.mvs.length - 1].id : null;
        },
      }),
    };

    return this._buildRequest({
      module: "MvService.MvInfoProServer",
      method: "GetSongRelatedMv",
      param: { songid: String(songid), songtype: 1, lastmvid: lastMvid || 0 },
      responseModel: GetRelatedMvResponse as unknown as new (data: unknown) => unknown,
      refreshMeta,
    }) as RefreshableRequest<typeof GetRelatedMvResponse._type>;
  }

  /** 获取歌曲其他版本 */
  getOtherVersion(value: number | string): Request<typeof GetOtherVersionResponse._type> {
    const param = (typeof value === "number" || /^\d+$/.test(String(value)))
      ? { songid: Number(value) }
      : { songmid: value };
    return this._buildRequest({
      module: "music.musichallSong.OtherVersionServer",
      method: "GetOtherVersionSongs",
      param,
      responseModel: GetOtherVersionResponse as unknown as new (data: unknown) => unknown,
    }) as Request<typeof GetOtherVersionResponse._type>;
  }

  /** 获取歌曲制作人信息 */
  getProducer(value: number | string): Request<typeof GetProducerResponse._type> {
    const param = (typeof value === "number" || /^\d+$/.test(String(value)))
      ? { songid: Number(value) }
      : { songmid: value };
    return this._buildRequest({
      module: "music.sociality.KolWorksTag",
      method: "SongProducer",
      param,
      responseModel: GetProducerResponse as unknown as new (data: unknown) => unknown,
    }) as Request<typeof GetProducerResponse._type>;
  }

  /** 获取歌曲相关曲谱 */
  getSheet(mid: string, ttype: number = 0): Request<typeof GetSheetResponse._type> {
    if (ttype === 2) {
      return this._buildRequest({
        module: "music.mir.SheetMusicSvr",
        method: "GetChongChongSheetMusic",
        param: { songMid: mid, begin: 0, end: 100, scoreType: -1, ttype: 1 },
        responseModel: GetSheetResponse as unknown as new (data: unknown) => unknown,
        comm: { g_tk: 5381, uin: "", format: "json", inCharset: "utf-8", outCharset: "utf-8", notice: 0, platform: "h5", needNewCode: 1 },
        sign: true,
        overrideComm: true,
        allowErrorCodes: new Set(["10007"]),
        parseOnAllow: true,
      }) as Request<typeof GetSheetResponse._type>;
    }

    const scoreType = ttype === 1 ? -473 : -1;
    return this._buildRequest({
      module: "music.mir.SheetMusicSvr",
      method: "GetMoreSheetMusic",
      param: { songMid: mid, begin: 0, end: 100, scoreType, ttype },
      responseModel: GetSheetResponse as unknown as new (data: unknown) => unknown,
      comm: { g_tk: 5381, uin: "", format: "json", inCharset: "utf-8", outCharset: "utf-8", notice: 0, needNewCode: 1 },
      overrideComm: true,
      allowErrorCodes: new Set(["10007"]),
      parseOnAllow: true,
    }) as Request<typeof GetSheetResponse._type>;
  }

  /** 检查歌曲是否有曲谱 */
  hasSheet(mid: string): Request<typeof HasSheetMusicResponse._type> {
    return this._buildRequest({
      module: "music.mir.SheetMusicSvr",
      method: "HasSheetMusic",
      param: { songMid: mid },
      responseModel: HasSheetMusicResponse as unknown as new (data: unknown) => unknown,
      comm: { g_tk: 5381, uin: "", format: "json", inCharset: "utf-8", outCharset: "utf-8", notice: 0, needNewCode: 1 },
      overrideComm: true,
    }) as Request<typeof HasSheetMusicResponse._type>;
  }

  /** 获取歌曲收藏数量 */
  getFavNum(songIds: number[]): Request<typeof GetFavNumResponse._type> {
    return this._buildRequest({
      module: "music.musicasset.SongFavRead",
      method: "GetSongFansNumberById",
      param: { v_songId: songIds },
      responseModel: GetFavNumResponse as unknown as new (data: unknown) => unknown,
    }) as Request<typeof GetFavNumResponse._type>;
  }
}
