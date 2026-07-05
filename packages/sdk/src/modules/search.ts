/** 搜索相关 API 模块 */
import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { PageStrategy, MultiFieldContinuationStrategy, ResponseAdapter } from "../core/pagination.js";
import { Platform } from "../core/versioning.js";
import { getSearchId, getGuid } from "../utils/common.js";

export enum SearchType {
  SONG = 0, SINGER = 1, ALBUM = 2, SONGLIST = 3, MV = 4,
  LYRIC = 7, USER = 8, AUDIO_ALBUM = 15, AUDIO = 18,
}

export class SearchApi extends ApiModule {
  getHotkey(): Request {
    return this._buildRequest({
      module: "music.musicsearch.HotkeyService",
      method: "GetHotkeyForQQMusicMobile",
      param: { search_id: getSearchId() },
    }) as Request;
  }

  complete(keyword: string): Request {
    return this._buildRequest({
      module: "music.smartboxCgi.SmartBoxCgi",
      method: "GetSmartBoxResult",
      param: { search_id: getSearchId(), query: keyword, num_per_page: 0, page_idx: 0 },
    }) as Request;
  }

  async quickSearch(keyword: string): Promise<unknown> {
    const resp = await this._request("GET", `https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?key=${encodeURIComponent(keyword)}`);
    const data = await (resp as Response).json();
    return (data as Record<string, unknown>).data;
  }

  generalSearch(keyword: string, page: number = 1, num: number = 20, searchid?: string, pageStart?: number, highlight?: number): PaginatedRequest {
    const sid = searchid || getSearchId();
    const pagerMeta = {
      strategy: new MultiFieldContinuationStrategy(
        (params, _response, adapter) => {
          const nextPageStart = adapter.getCursor(_response);
          const hasMore = adapter.getHasMoreFlag(_response);
          if (!hasMore) return null;
          return { ...params as Record<string,unknown>, page_id: (params as Record<string,unknown>).page_id as number + 1, page_start: nextPageStart ?? 0 };
        },
      ),
      adapter: new ResponseAdapter({
        hasMoreFlag: (data: unknown) => {
          const d = data as Record<string, unknown>;
          const meta = d.meta as Record<string, number> | undefined;
          return meta ? meta.nextpage !== -1 : false;
        },
        cursor: (data: unknown) => {
          const d = data as Record<string, unknown>;
          const meta = d.meta as Record<string, number> | undefined;
          return meta?.nextpage_start ?? 0;
        },
      }),
    };

    return this._buildRequest({
      module: "music.adaptor.SearchAdaptor",
      method: "do_search_v2",
      param: {
        searchid: sid, search_type: 100, page_num: num, query: keyword,
        page_id: page, highlight: highlight ?? 1, grp: true, page_start: pageStart ?? 0,
      },
      pagerMeta,
    }) as PaginatedRequest;
  }

  searchByType(keyword: string, searchType: SearchType, num: number = 20, page: number = 1, searchid?: string, highlight?: number): PaginatedRequest {
    const sid = searchid || getSearchId();
    return this._buildRequest({
      module: "music.search.SearchCgiService",
      method: "DoSearchForQQMusicMobile",
      param: {
        searchid: sid, query: keyword, search_type: searchType,
        num_per_page: num, page_num: page, highlight: highlight ?? 1, grp: true,
      },
      platform: Platform.ANDROID,
      pagerMeta: {
        strategy: new PageStrategy("page_num", num, page),
        adapter: new ResponseAdapter({ hasMoreFlag: (data: unknown) => {
          const d = data as Record<string, unknown>;
          const meta = d.meta as Record<string, number> | undefined;
          return meta ? meta.nextpage !== -1 : false;
        }, total: (data: unknown) => {
          const d = data as Record<string, unknown>;
          const meta = d.meta as Record<string, number> | undefined;
          return meta?.sum ?? 0;
        }}),
      },
    }) as PaginatedRequest;
  }
}
