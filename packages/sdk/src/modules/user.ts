/** 用户相关 API 模块 */

import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { PaginatedRequest } from "../core/request.js";
import { OffsetStrategy, PageStrategy, ResponseAdapter } from "../core/pagination.js";
import type { Credential } from "../models/request.js";

export class UserApi extends ApiModule {
  private static PLACEHOLDER_CREDENTIAL: Credential | null = null;

  getHomepage(euin: string, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.UnifiedHomepage.UnifiedHomepageSrv",
      method: "GetHomepageHeader",
      param: { uin: euin, IsQueryTabDetail: 1 },
      credential: credential || UserApi.PLACEHOLDER_CREDENTIAL,
    }) as Request;
  }

  getVipInfo(credential?: Credential | null): Request {
    return this._buildRequest({
      module: "VipLogin.VipLoginInter",
      method: "vip_login_base",
      param: {},
      credential,
      requireLogin: true,
    }) as Request;
  }

  getFollowSingers(euin: string, page: number = 1, num: number = 20, credential?: Credential | null): PaginatedRequest {
    return this._buildRequest({
      module: "music.concern.RelationList",
      method: "GetFollowSingerList",
      param: { HostUin: euin, From: (page - 1) * num, Size: num },
      credential,
      requireLogin: true,
      pagerMeta: {
        strategy: new OffsetStrategy("From", "Size", num),
        adapter: new ResponseAdapter({ total: "total", hasMoreFlag: "has_more" }),
      },
    }) as PaginatedRequest;
  }

  getFans(euin: string, page: number = 1, num: number = 20, credential?: Credential | null): PaginatedRequest {
    return this._buildRequest({
      module: "music.concern.RelationList",
      method: "GetFansList",
      param: { HostUin: euin, From: (page - 1) * num, Size: num },
      credential,
      requireLogin: true,
      pagerMeta: {
        strategy: new OffsetStrategy("From", "Size", num),
        adapter: new ResponseAdapter({ total: "total", hasMoreFlag: "has_more" }),
      },
    }) as PaginatedRequest;
  }

  getFriend(page: number = 1, num: number = 20, credential?: Credential | null): PaginatedRequest {
    return this._buildRequest({
      module: "music.homepage.Friendship",
      method: "GetFriendList",
      param: { PageSize: num, Page: page - 1 },
      credential,
      requireLogin: true,
      pagerMeta: {
        strategy: new PageStrategy("Page", num, page - 1),
        adapter: new ResponseAdapter({ hasMoreFlag: "has_more" }),
      },
    }) as PaginatedRequest;
  }

  getFollowUser(euin: string, page: number = 1, num: number = 20, credential?: Credential | null): PaginatedRequest {
    return this._buildRequest({
      module: "music.concern.RelationList",
      method: "GetFollowUserList",
      param: { HostUin: euin, From: (page - 1) * num, Size: num },
      credential,
      requireLogin: true,
      pagerMeta: {
        strategy: new OffsetStrategy("From", "Size", num),
        adapter: new ResponseAdapter({ total: "total", hasMoreFlag: "has_more" }),
      },
    }) as PaginatedRequest;
  }

  getCreatedSonglist(uin: string): Request {
    return this._buildRequest({
      module: "music.musicasset.PlaylistBaseRead",
      method: "GetPlaylistByUin",
      param: { uin },
    }) as Request;
  }

  getFavSong(euin: string, page: number = 1, num: number = 20): PaginatedRequest {
    return this._buildRequest({
      module: "music.srfDissInfo.DissInfo",
      method: "CgiGetDiss",
      param: {
        disstid: 0, dirid: 201, tag: true,
        song_begin: num * (page - 1), song_num: num,
        userinfo: true, orderlist: true, enc_host_uin: euin,
      },
      pagerMeta: {
        strategy: new OffsetStrategy("song_begin", "song_num", num),
        adapter: new ResponseAdapter({ total: "total", hasMoreFlag: "hasmore" }),
      },
    }) as PaginatedRequest;
  }

  getFavSonglist(euin: string, page: number = 1, num: number = 20): PaginatedRequest {
    return this._buildRequest({
      module: "music.musicasset.PlaylistFavRead",
      method: "CgiGetPlaylistFavInfo",
      param: { uin: euin, offset: (page - 1) * num, size: num },
      pagerMeta: {
        strategy: new OffsetStrategy("offset", "size", num),
        adapter: new ResponseAdapter({ total: "total", hasMoreFlag: "hasmore" }),
      },
    }) as PaginatedRequest;
  }

  getFavAlbum(euin: string, page: number = 1, num: number = 20): PaginatedRequest {
    return this._buildRequest({
      module: "music.musicasset.AlbumFavRead",
      method: "CgiGetAlbumFavInfo",
      param: { euin, offset: (page - 1) * num, size: num },
      pagerMeta: {
        strategy: new OffsetStrategy("offset", "size", num),
        adapter: new ResponseAdapter({ total: "total", hasMoreFlag: "hasmore" }),
      },
    }) as PaginatedRequest;
  }

  getFavMv(euin: string, page: number = 1, num: number = 20, credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.musicasset.MVFavRead",
      method: "getMyFavMV_v2",
      param: { encuin: euin, pagesize: num, num: page - 1 },
      credential,
      requireLogin: true,
    }) as Request;
  }

  getMusicGene(euin: string): Request {
    return this._buildRequest({
      module: "music.recommend.UserProfileSettingSvr",
      method: "GetProfileReport",
      param: { VisitAccount: euin },
    }) as Request;
  }
}
