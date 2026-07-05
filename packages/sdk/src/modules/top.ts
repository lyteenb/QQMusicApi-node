/** 排行榜相关 API 模块 */

import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { OffsetStrategy, ResponseAdapter } from "../core/pagination.js";

export class TopApi extends ApiModule {
  getCategory(): Request {
    return this._buildRequest({
      module: "music.musicToplist.Toplist",
      method: "GetAll",
      param: {},
    }) as Request;
  }

  getDetail(topId: number, num: number = 20, page: number = 1, tag?: boolean): PaginatedRequest {
    return this._buildRequest({
      module: "music.musicToplist.Toplist",
      method: "GetDetail",
      param: {
        topId,
        offset: num * (page - 1),
        num,
        ...(tag ? { withTags: true } : {}),
      },
      pagerMeta: {
        strategy: new OffsetStrategy("offset", "num", num),
        adapter: new ResponseAdapter({ total: "info.total_num" }),
      },
    }) as PaginatedRequest;
  }
}
