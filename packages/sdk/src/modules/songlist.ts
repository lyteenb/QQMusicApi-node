/** 歌单相关 API 模块 */

import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { OffsetStrategy, ResponseAdapter } from "../core/pagination.js";

export class SonglistApi extends ApiModule {
  getDetail(songlistId: number, dirid?: number, num: number = 20, page: number = 1, onlysong?: boolean, tag?: boolean, userinfo?: boolean): PaginatedRequest {
    return this._buildRequest({
      module: "music.srfDissInfo.DissInfo",
      method: "CgiGetDiss",
      param: {
        disstid: songlistId, dirid: dirid ?? 0, tag: tag ?? true,
        song_begin: num * (page - 1), song_num: num, userinfo: userinfo ?? true,
        orderlist: true, onlysonglist: onlysong ? 1 : 0,
      },
      pagerMeta: {
        strategy: new OffsetStrategy("song_begin", "song_num", num),
        adapter: new ResponseAdapter({ total: "total_song_num" }),
      },
    }) as PaginatedRequest;
  }

  create(dirname: string, credential?: import("../models/request.js").Credential | null): Request {
    return this._buildRequest({
      module: "music.musicasset.PlaylistBaseWrite",
      method: "AddPlaylist",
      param: { dirName: dirname },
      credential,
      requireLogin: true,
    }) as Request;
  }

  delete(dirid: number, credential?: import("../models/request.js").Credential | null): Request {
    return this._buildRequest({
      module: "music.musicasset.PlaylistBaseWrite",
      method: "DelPlaylist",
      param: { dirId: dirid },
      credential,
      requireLogin: true,
    }) as Request;
  }

  addSongs(dirid: number, songInfo: { songId: number; songType: number }[], tid?: number, credential?: import("../models/request.js").Credential | null): Request {
    return this._buildRequest({
      module: "music.musicasset.PlaylistDetailWrite",
      method: "AddSonglist",
      param: { dirId: dirid, tid: tid ?? 0, bFmtUtf8: true, v_songInfo: songInfo },
      credential,
      requireLogin: true,
      allowErrorCodes: new Set(["80092"]), // song already exists
    }) as Request;
  }

  delSongs(dirid: number, songInfo: { songId: number; songType: number }[], tid?: number, credential?: import("../models/request.js").Credential | null): Request {
    return this._buildRequest({
      module: "music.musicasset.PlaylistDetailWrite",
      method: "DelSonglist",
      param: { dirId: dirid, tid: tid ?? 0, bFmtUtf8: true, v_songInfo: songInfo },
      credential,
      requireLogin: true,
      allowErrorCodes: new Set(["80092"]), // song doesn't exist
    }) as Request;
  }
}
