/** 歌手相关 API 模块 */

import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { OffsetStrategy, PageStrategy, ResponseAdapter } from "../core/pagination.js";
import { Platform } from "../core/versioning.js";

export enum AreaType { ALL = -100, CHINA = 200, TAIWAN = 2, AMERICA = 5, JAPAN = 4, KOREA = 3 }
export enum GenreType { ALL = -100, POP = 7, RAP = 3, CHINESE_STYLE = 19, ROCK = 4, ELECTRONIC = 2, FOLK = 8, R_AND_B = 11, ETHNIC = 37, LIGHT_MUSIC = 93, JAZZ = 14, CLASSICAL = 33, COUNTRY = 13, BLUES = 10 }
export enum SexType { ALL = -100, MALE = 0, FEMALE = 1, GROUP = 2 }
export enum IndexType { ALL = -100, A = 1, B = 2, C = 3, D = 4, E = 5, F = 6, G = 7, H = 8, I = 9, J = 10, K = 11, L = 12, M = 13, N = 14, O = 15, P = 16, Q = 17, R = 18, S = 19, T = 20, U = 21, V = 22, W = 23, X = 24, Y = 25, Z = 26, HASH = 27 }

export class SingerApi extends ApiModule {
  getSingerList(area: AreaType = AreaType.ALL, sex: SexType = SexType.ALL, genre: GenreType = GenreType.ALL): Request {
    return this._buildRequest({
      module: "music.musichallSinger.SingerList",
      method: "GetSingerList",
      param: { hastag: 0, area, sex, genre },
    }) as Request;
  }

  getSingerListIndex(area: AreaType, sex: SexType, genre: GenreType, index: IndexType, page: number = 1, num: number = 25): PaginatedRequest {
    return this._buildRequest({
      module: "music.musichallSinger.SingerList",
      method: "GetSingerListIndex",
      param: { area, sex, genre, index, sin: (page - 1) * num, cur_page: page },
      pagerMeta: {
        strategy: new OffsetStrategy("sin", undefined, num),
        adapter: new ResponseAdapter({ total: "total" }),
      },
    }) as PaginatedRequest;
  }

  getInfo(mid: string): Request {
    return this._buildRequest({
      module: "music.UnifiedHomepage.UnifiedHomepageSrv",
      method: "GetHomepageHeader",
      param: { SingerMid: mid },
      platform: Platform.ANDROID,
    }) as Request;
  }

  getTabDetail(mid: string, tabId: string, page: number = 1, num: number = 20): PaginatedRequest {
    return this._buildRequest({
      module: "music.UnifiedHomepage.UnifiedHomepageSrv",
      method: "GetHomepageTabDetail",
      param: {
        SingerMid: mid, IsQueryTabDetail: 1, TabID: tabId,
        PageNum: page - 1, PageSize: num, Order: 0,
      },
      platform: Platform.ANDROID,
      pagerMeta: {
        strategy: new PageStrategy("PageNum", num, page - 1),
        adapter: new ResponseAdapter({ hasMoreFlag: "has_more" }),
      },
    }) as PaginatedRequest;
  }

  getDesc(mids: string[]): Request {
    return this._buildRequest({
      module: "music.musichallSinger.SingerInfoInter",
      method: "GetSingerDetail",
      param: { singer_mids: mids, groups: 1, wikis: 1 },
    }) as Request;
  }

  getSimilar(mid: string, number: number = 10): Request {
    return this._buildRequest({
      module: "music.SimilarSingerSvr",
      method: "GetSimilarSingerList",
      param: { singerMid: mid, number },
    }) as Request;
  }

  getSongsList(mid: string, num: number = 20, page: number = 1): PaginatedRequest {
    return this._buildRequest({
      module: "musichall.song_list_server",
      method: "GetSingerSongList",
      param: { singerMid: mid, order: 1, number: num, begin: (page - 1) * num },
      pagerMeta: {
        strategy: new OffsetStrategy("begin", "number", num),
        adapter: new ResponseAdapter({ total: "total_num" }),
      },
    }) as PaginatedRequest;
  }

  getAlbumList(mid: string, num: number = 20, page: number = 1): PaginatedRequest {
    return this._buildRequest({
      module: "music.musichallAlbum.AlbumListServer",
      method: "GetAlbumList",
      param: { singerMid: mid, order: 1, number: num, begin: (page - 1) * num },
      pagerMeta: {
        strategy: new OffsetStrategy("begin", "number", num),
        adapter: new ResponseAdapter({ total: "total" }),
      },
    }) as PaginatedRequest;
  }

  getMvList(mid: string, num: number = 20, page: number = 1): PaginatedRequest {
    return this._buildRequest({
      module: "MvService.MvInfoProServer",
      method: "GetSingerMvList",
      param: { singermid: mid, order: 1, count: num, start: (page - 1) * num },
      pagerMeta: {
        strategy: new OffsetStrategy("start", "count", num),
        adapter: new ResponseAdapter({ total: "total" }),
      },
    }) as PaginatedRequest;
  }
}
