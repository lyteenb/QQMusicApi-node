/** MV 相关响应模型 */

import { z } from "zod";
import { MV } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const MvDetail = MV.extend({
  cover_pic: z.string().default(""),
  duration: z.number().default(0),
  singers: z.array(z.unknown()).default([]),
  video_switch: z.number().default(0),
  desc: z.string().default(""),
  playcnt: z.number().default(0),
  pubdate: z.string().default(""),
  isfav: z.number().default(0),
  gmid: z.string().default(""),
  uploader_nick: z.string().default(""),
  uploader_uin: z.string().default(""),
  uploader_headurl: z.string().default(""),
  related_songs: z.array(z.unknown()).default([]),
});

export const GetMvDetailResponse = baseModel({
  data: z.record(z.string(), MvDetail).default({}),
});

export const MvUrlItem = baseModel({
  url: z.string().default(""),
  freeflow_url: z.string().default(""),
  comm_url: z.string().default(""),
  cn: z.string().default(""),
  vkey: z.string().default(""),
  expire: z.number().default(0),
  code: z.number().default(0),
  filetype: z.number().default(0),
  m3u8: z.string().default(""),
  new_file_type: z.number().default(0),
  format: z.number().default(0),
  file_size: z.number().default(0),
});

export const MvUrlSet = baseModel({
  mp4: z.array(MvUrlItem).default([]),
  hls: z.array(MvUrlItem).default([]),
  svp_flag: z.number().default(0),
  duration: z.number().default(0),
});

export const GetMvUrlsResponse = baseModel({
  data: z.record(z.string(), MvUrlSet).default({}),
});
