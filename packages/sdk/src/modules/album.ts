/** 专辑相关 API 模块 */
import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { OffsetStrategy, ResponseAdapter } from "../core/pagination.js";

export class AlbumApi extends ApiModule {
  getDetail(value: number | string): Request {
    const param = (typeof value === "number" || /^\d+$/.test(String(value)))
      ? { albumId: Number(value) }
      : { albumMId: value };
    return this._buildRequest({
      module: "music.musichallAlbum.AlbumInfoServer",
      method: "GetAlbumDetail",
      param,
    }) as Request;
  }

  getSong(value: number | string, num: number = 10, page: number = 1): PaginatedRequest {
    const param = (typeof value === "number" || /^\d+$/.test(String(value)))
      ? { albumId: Number(value), begin: num * (page - 1), num }
      : { albumMid: value, begin: num * (page - 1), num };
    return this._buildRequest({
      module: "music.musichallAlbum.AlbumSongList",
      method: "GetAlbumSongList",
      param,
      pagerMeta: {
        strategy: new OffsetStrategy("begin", "num", num),
        adapter: new ResponseAdapter({ total: "total_num" }),
      },
    }) as PaginatedRequest;
  }
}
