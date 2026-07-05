/** 排行榜相关响应模型 */

import { z } from "zod";
import { Song } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const TopPreviewSong = baseModel({
  rank: z.number().default(0),
  rank_type: z.number().default(0),
  rank_value: z.number().default(0),
  song_id: z.number().default(0),
  title: z.string().default(""),
  singer_name: z.string().default(""),
  singer_mid: z.string().default(""),
  album_mid: z.string().default(""),
  cover: z.string().default(""),
  mvid: z.string().default(""),
});

export const TopSummary = baseModel({
  topId: z.number().default(0),
  title: z.string().default(""),
  title_detail: z.string().default(""),
  title_sub: z.string().default(""),
  intro: z.string().default(""),
  period: z.string().default(""),
  update_time: z.string().default(""),
  listen_num: z.number().default(0),
  total_num: z.number().default(0),
  songs: z.array(TopPreviewSong).default([]),
  front_pic_url: z.string().default(""),
  head_pic_url: z.string().default(""),
  h5_jump_url: z.string().default(""),
  special_scheme: z.string().default(""),
});

export const TopCategory = baseModel({
  groupId: z.number().default(0),
  group_name: z.string().default(""),
  toplist: z.array(TopSummary).default([]),
});

export const TopCategoryResponse = baseModel({
  groups: z.array(TopCategory).default([]),
});

export const TopDetailResponse = baseModel({
  info: TopSummary.default({}),
  songInfoList: withJsonPath(NoneToEmptyList, "$.songInfoList[*]").pipe(z.array(Song).default([])),
  songTags: z.record(z.string(), z.unknown()).default({}),
  extInfoList: z.array(z.unknown()).default([]),
  indexInfoList: z.array(z.unknown()).default([]),
});
