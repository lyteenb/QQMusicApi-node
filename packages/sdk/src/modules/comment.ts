/** 评论相关 API 模块 */

import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { MultiFieldContinuationStrategy, CursorStrategy, ResponseAdapter } from "../core/pagination.js";
import { Platform } from "../core/versioning.js";

const COMMENT_PAGER = {
  strategy: new MultiFieldContinuationStrategy(
    (params, response, adapter) => {
      const hasMore = adapter.getHasMoreFlag(response);
      if (!hasMore) return null;
      const p = params as Record<string, unknown>;
      return {
        ...p,
        PageNum: (p.PageNum as number) + 1,
        LastCommentSeqNo: adapter.getCursor(response) ?? p.LastCommentSeqNo,
      };
    },
  ),
  adapter: new ResponseAdapter({
    hasMoreFlag: "has_more",
    total: "total",
    cursor: (data: unknown) => {
      const d = data as { comments?: { seq_no: number }[] };
      return d.comments?.length ? d.comments[d.comments.length - 1].seq_no : null;
    },
  }),
};

export class CommentApi extends ApiModule {
  getCommentCount(bizId: number): Request {
    return this._buildRequest({
      module: "music.globalComment.CommentCountSrv",
      method: "GetCmCount",
      param: { "request": { biz_id: bizId, biz_type: 1, biz_sub_type: 2 } },
    }) as Request;
  }

  getHotComments(bizId: number, pageNum: number = 1, pageSize: number = 20, lastCommentSeqNo?: number): PaginatedRequest {
    return this._buildRequest({
      module: "music.globalComment.CommentRead",
      method: "GetHotCommentList",
      param: {
        BizType: 1, BizId: bizId, LastCommentSeqNo: lastCommentSeqNo ?? -1,
        PageSize: pageSize, PageNum: pageNum - 1, HotType: 1, WithAirborne: 0, PicEnable: 1,
      },
      pagerMeta: COMMENT_PAGER,
    }) as PaginatedRequest;
  }

  getNewComments(bizId: number, pageNum: number = 1, pageSize: number = 20, lastCommentSeqNo?: number): PaginatedRequest {
    return this._buildRequest({
      module: "music.globalComment.CommentRead",
      method: "GetNewCommentList",
      param: {
        PageSize: pageSize, PageNum: pageNum - 1, BizType: 1, BizId: bizId,
        LastCommentSeqNo: lastCommentSeqNo ?? -1, PicEnable: 1, SelfSeeEnable: 1, AudioEnable: 1,
      },
      pagerMeta: COMMENT_PAGER,
    }) as PaginatedRequest;
  }

  getRecommendComments(bizId: number, pageNum: number = 1, pageSize: number = 20, lastCommentSeqNo?: number): PaginatedRequest {
    return this._buildRequest({
      module: "music.globalComment.CommentRead",
      method: "GetRecCommentList",
      param: {
        PageSize: pageSize, PageNum: pageNum - 1, BizType: 1, BizId: bizId,
        LastCommentSeqNo: lastCommentSeqNo ?? -1, PicEnable: 1, Flag: 1, CmListUIVer: 1, AudioEnable: 1,
      },
      pagerMeta: COMMENT_PAGER,
    }) as PaginatedRequest;
  }

  getMomentComments(bizId: number, pageSize: number = 20, lastCommentSeqNo?: number): PaginatedRequest {
    return this._buildRequest({
      module: "music.globalComment.SongTsComment",
      method: "GetSongTsCmList",
      param: {
        LastPos: lastCommentSeqNo ?? -1, SeekTs: -1, Size: pageSize, BizType: 1, BizId: bizId,
      },
      pagerMeta: {
        strategy: new CursorStrategy("LastPos"),
        adapter: new ResponseAdapter({ cursor: "next_pos" }),
      },
    }) as PaginatedRequest;
  }

  addComment(bizId: number, content: string, replyCmtId?: number, credential?: import("../models/request.js").Credential | null): Request {
    return this._buildRequest({
      module: "music.globalComment.CommentWriteServer",
      method: "AddComment",
      param: { Content: content, BizType: 1, BizId: bizId, RepliedCmId: replyCmtId ?? 0 },
      platform: Platform.ANDROID,
      credential,
      requireLogin: true,
    }) as Request;
  }

  deleteComment(cmId: number, credential?: import("../models/request.js").Credential | null): Request {
    return this._buildRequest({
      module: "music.globalComment.CommentWriteServer",
      method: "DelComment",
      param: { CommentId: cmId },
      platform: Platform.ANDROID,
      credential,
      requireLogin: true,
    }) as Request;
  }
}
