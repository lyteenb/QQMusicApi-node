/** 推荐相关 API 模块 */

import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { MultiFieldContinuationStrategy, CursorStrategy, PageStrategy, ResponseAdapter } from "../core/pagination.js";

export class RecommendApi extends ApiModule {
  getHomeFeed(page: number = 0, direction: number = 0, sNum?: number, vCache?: string[]): PaginatedRequest {
    return this._buildRequest({
      module: "music.recommend.RecommendFeed",
      method: "get_recommend_feed",
      param: {
        direction, page, s_num: sNum ?? 3, v_cache: vCache ?? [],
      },
      pagerMeta: {
        strategy: new MultiFieldContinuationStrategy(
          (params, response, adapter) => {
            const hasMore = adapter.getHasMoreFlag(response);
            if (!hasMore) return null;
            const p = params as Record<string, unknown>;
            return {
              ...p,
              page: (p.page as number) + 1,
              v_cache: adapter.getCursor(response) ?? p.v_cache,
            };
          },
        ),
        adapter: new ResponseAdapter({
          hasMoreFlag: "load_mark",
          count: (data: unknown) => {
            const d = data as { shelves?: { niches?: unknown[] }[] };
            return d.shelves?.reduce((sum, s) => sum + (s.niches?.length ?? 0), 0) ?? 0;
          },
          cursor: "d_num",
        }),
      },
    }) as PaginatedRequest;
  }

  getGuessRecommend(credential?: unknown): Request {
    return this._buildRequest({
      module: "music.radioProxy.MbTrackRadioSvr",
      method: "get_radio_track",
      param: { id: 99, num: 5, from: 0, scene: 0, song_ids: [] },
      credential: credential as import("../models/request.js").Credential | null,
    }) as Request;
  }

  getRadarRecommend(page: number = 1): PaginatedRequest {
    return this._buildRequest({
      module: "music.recommend.TrackRelationServer",
      method: "GetRadarSong",
      param: { Page: page, ReqType: 0, FavSongs: [], EntranceSongs: [] },
      pagerMeta: {
        strategy: new PageStrategy("Page", 10, page),
        adapter: new ResponseAdapter({ hasMoreFlag: "HasMore" }),
      },
    }) as PaginatedRequest;
  }

  getRecommendSonglist(page: number = 1, num: number = 20): PaginatedRequest {
    return this._buildRequest({
      module: "music.playlist.PlaylistSquare",
      method: "GetRecommendFeed",
      param: { From: num * (page - 1), Size: num },
      pagerMeta: {
        strategy: new CursorStrategy("From"),
        adapter: new ResponseAdapter({ hasMoreFlag: "has_more", cursor: "from_limit" }),
      },
    }) as PaginatedRequest;
  }

  getRecommendNewSong(): Request {
    return this._buildRequest({
      module: "newsong.NewSongServer",
      method: "get_new_song_info",
      param: { type: 5 },
    }) as Request;
  }
}
