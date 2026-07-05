/** 用户相关响应模型 */
import { z } from "zod";
import { Song, Singer, Album, SongList } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const UserPlaylistSummary = SongList.extend({
  create_time: z.number().default(0), update_time: z.number().default(0),
  uin: z.number().default(0), nick: z.string().default(""),
  bigpic_url: z.string().default(""), album_pic_url: z.string().default(""),
  avatar: z.string().default(""), ident_icon: z.string().default(""),
  layer_url: z.string().default(""), invalid: z.number().default(0),
  dir_show: z.number().default(0), fav_cnt: z.number().default(0),
  play_cnt: z.number().default(0), comment_cnt: z.number().default(0),
  op_type: z.number().default(0), sort_weight: z.number().default(0),
});

export const UserCreatedSonglistResponse = baseModel({
  total: z.number().default(0),
  playlists: withJsonPath(NoneToEmptyList, "$.v_playlist[*]").pipe(z.array(UserPlaylistSummary).default([])),
  deleted_ids: withJsonPath(NoneToEmptyList, "$.v_delTid").default([]),
  finished: withJsonPath(NoneToEmptyList, "$.bFinish").default(0),
});

export const UserFavSonglistItem = SongList.extend({});
export const UserFavSonglistResponse = baseModel({
  total: z.number().default(0), hasmore: z.number().default(0),
  lists: z.array(UserFavSonglistItem).default([]),
});

export const UserFavAlbumItem = Album.extend({});
export const UserFavAlbumResponse = baseModel({
  total: z.number().default(0), hasmore: z.number().default(0),
  lists: z.array(UserFavAlbumItem).default([]),
});

export const UserInfoCard = baseModel({
  uin: z.number().default(0), nick: z.string().default(""),
  headurl: z.string().default(""), encrypt_uin: z.string().default(""),
  concern_num: z.number().default(0), fans_num: z.number().default(0), friend_num: z.number().default(0),
});

export const ListeningReport = baseModel({
  listen_time: z.number().default(0), listen_songs: z.number().default(0), listen_days: z.number().default(0),
});

export const UserMusicGeneResponse = baseModel({ report: ListeningReport.default({}) });

export const UserHomepageBaseInfo = baseModel({
  uin: z.number().default(0), nick: z.string().default(""),
  headurl: z.string().default(""), encrypt_uin: z.string().default(""), musicid: z.number().default(0),
});

export const UserHomepageResponse = baseModel({
  base_info: UserHomepageBaseInfo.default({}),
  singer: withJsonPath(NoneToEmptyList, "$.Info.Singer").default(null),
});

export const VipIdentity = baseModel({
  vip: z.number().default(0), huge_vip: z.number().default(0), year_flags: z.number().default(0),
  twelve: z.number().default(0), child_vip: z.number().default(0), exp_vip: z.number().default(0),
  group_vip: z.number().default(0), cp_lover: z.number().default(0), ad_vip: z.number().default(0),
  eight: z.number().default(0), level: z.number().default(0), next_level: z.number().default(0),
  icon: z.string().default(""), purchase_url: z.string().default(""),
});

export const VipUserInfo = baseModel({
  buy_url: z.string().default(""), score: z.number().default(0),
  expire: z.number().default(0), music_level: z.number().default(0),
});

export const UserVipInfoResponse = baseModel({
  auto_down: z.number().default(0), can_renew: z.number().default(0),
  max_dir_num: z.number().default(0), svip: z.number().default(0),
  star: z.number().default(0), ystar: z.number().default(0),
  plus: VipIdentity.default({}), userinfo: VipUserInfo.default({}),
});

export const RelationUser = Singer.extend({
  encrypt_uin: z.string().default(""), headurl: z.string().default(""), concern_time: z.number().default(0),
});

export const UserRelationListResponse = baseModel({
  total: z.number().default(0), has_more: z.number().default(0),
  users: z.array(RelationUser).default([]),
});

export const FriendEntry = baseModel({
  uin: z.number().default(0), nick: z.string().default(""),
  headurl: z.string().default(""), encrypt_uin: z.string().default(""),
  remark: z.string().default(""), concern_state: z.number().default(0),
});

export const UserFriendListResponse = baseModel({
  total: z.number().default(0), has_more: z.number().default(0),
  friends: z.array(FriendEntry).default([]),
});

export const DislikeItem = baseModel({
  ID: z.string().default(""), IdType: z.string().default(""),
  Name: z.string().default(""), Pic: z.string().default(""),
});

export const DislikeListData = baseModel({
  singers: z.array(DislikeItem).default([]),
  songs: z.array(DislikeItem).default([]),
  styles: z.array(DislikeItem).default([]),
});
