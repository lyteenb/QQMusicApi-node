/** 歌手相关响应模型 */

import { z } from "zod";
import { Singer, Album, MV, Song } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const SingerBrief = Singer.extend({
  area_id: z.number().default(0),
  country_id: z.number().default(0),
  country: z.string().default(""),
  other_name: z.string().default(""),
  spell: z.string().default(""),
  trend: z.number().default(0),
  concern_num: z.number().default(0),
  singer_pic: z.string().default(""),
});

export const TagOption = baseModel({
  id: z.number().default(0),
  name: z.string().default(""),
  count: z.number().default(0),
});

export const SingerTagData = baseModel({
  area: z.array(TagOption).default([]),
  genre: z.array(TagOption).default([]),
  sex: z.array(TagOption).default([]),
  index: z.array(TagOption).default([]),
});

export const SingerTypeListResponse = baseModel({
  tag_data: SingerTagData.default({}),
  singers: z.array(SingerBrief).default([]),
  total: z.number().default(0),
});

export const SingerIndexPageResponse = SingerTypeListResponse.extend({
  index: z.number().default(0),
});

export const HomepageBaseInfo = baseModel({
  uin: z.number().default(0),
  nick: z.string().default(""),
  headurl: z.string().default(""),
  encrypt_uin: z.string().default(""),
  musicid: z.number().default(0),
});

export const HomepageSinger = Singer.extend({
  base_info: HomepageBaseInfo.default({}),
});

export const TabMeta = baseModel({
  tab_id: z.string().default(""),
  tab_name: z.string().default(""),
  tab_type: z.number().default(0),
});

export const AlbumBrief = Album.extend({
  singer_name: z.string().default(""),
  type: z.number().default(0),
});

export const VideoBrief = baseModel({
  vid: z.string().default(""),
  name: z.string().default(""),
  cover_pic: z.string().default(""),
  playcnt: z.number().default(0),
  pubdate: z.string().default(""),
  duration: z.number().default(0),
});

export const HomepageTabDetailResponse = baseModel({
  tab_id: z.string().default(""),
  tab_list: z.array(TabMeta).default([]),
  introduction_tab: z.unknown().default(null),
  song_tab: withJsonPath(NoneToEmptyList, "$.SongTab.List[*]").default([]),
  album_tab: withJsonPath(NoneToEmptyList, "$.AlbumTab.AlbumList[*]").default([]),
  video_tab: withJsonPath(NoneToEmptyList, "$.VideoTab.VideoList[*]").default([]),
});

export const HomepageHeaderResponse = baseModel({
  Status: z.number().default(0),
  Singer: withJsonPath(NoneToEmptyList, "$.Info.Singer").default(null),
  BaseInfo: withJsonPath(NoneToEmptyList, "$.Info.BaseInfo").default(null),
  TabDetail: HomepageTabDetailResponse.default({}),
});

export const SingerDetail = baseModel({
  basic_info: SingerBrief.default({}),
  ex_info: z.record(z.string(), z.unknown()).default({}),
  wiki: z.string().default(""),
  group_list: z.array(z.unknown()).default([]),
  photos: z.array(z.unknown()).default([]),
  group_info: z.unknown().default(null),
});

export const SingerDetailResponse = baseModel({
  singer_list: z.array(SingerDetail).default([]),
});

export const SimilarSinger = Singer.extend({
  reason: z.string().default(""),
});

export const SimilarSingerResponse = baseModel({
  singers: z.array(SimilarSinger).default([]),
});

export const SingerSongListResponse = baseModel({
  songs: withJsonPath(NoneToEmptyList, "$.songList[*].songInfo").pipe(z.array(Song).default([])),
  total_num: z.number().default(0),
});

export const SingerAlbumListResponse = baseModel({
  albums: withJsonPath(NoneToEmptyList, "$.albumList[*]").pipe(z.array(AlbumBrief).default([])),
  total: z.number().default(0),
});

export const SingerMvListResponse = baseModel({
  mvs: withJsonPath(NoneToEmptyList, "$.mvList[*]").pipe(z.array(MV).default([])),
  total: z.number().default(0),
});
