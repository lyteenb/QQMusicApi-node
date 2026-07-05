/** 评论相关响应模型 */

import { z } from "zod";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const IconTextInfo = baseModel({
  txt: z.string().default(""),
  unique_id: z.string().default(""),
  type: z.number().default(0),
  cmid: z.number().default(0),
  is_dynamic: z.number().default(0),
});

export const CommentCountResponse = baseModel({
  biz_type: withJsonPath(NoneToEmptyList, "$.response.biz_type").default(null),
  biz_id: withJsonPath(NoneToEmptyList, "$.response.biz_id").default(null),
  count: withJsonPath(NoneToEmptyList, "$.response.count").default(null),
  cmTabType: z.number().default(0),
});

export const CommentItem = baseModel({
  cmid: z.number().default(0),
  seq_no: z.number().default(0),
  nick: z.string().default(""),
  avatar: z.string().default(""),
  encrypt_uin: z.string().default(""),
  content: z.string().default(""),
  pub_time: z.number().default(0),
  praise_num: z.number().default(0),
  reply_cnt: z.number().default(0),
  is_praised: z.number().default(0),
  is_self: z.number().default(0),
  state: z.number().default(0),
  hot_score: z.number().default(0),
  rec_score: z.number().default(0),
  song_id: z.number().default(0),
  song_name: z.string().default(""),
  singer_names: z.string().default(""),
  song_ts_elems: z.array(z.unknown()).default([]),
  hash_tag_list: z.array(z.unknown()).default([]),
  little_tails: z.array(IconTextInfo).default([]),
  icon_list: z.array(z.unknown()).default([]),
  vip_ui: z.unknown().default(null),
  sub_comments: z.array(z.unknown()).default([]),
});

export const CommentListResponse = baseModel({
  comments: withJsonPath(NoneToEmptyList, "$.CommentList.Comments[*]").pipe(z.array(CommentItem).default([])),
  comment_ids: withJsonPath(NoneToEmptyList, "$.CommentList.CommentIds[*]").default([]),
  has_more: z.number().default(0),
  next_offset: z.number().default(0),
  total: z.number().default(0),
});

export const MomentCommentItem = baseModel({
  cmid: z.number().default(0),
  nick: z.string().default(""),
  avatar: z.string().default(""),
  content: z.string().default(""),
  pub_time: z.number().default(0),
  city: z.string().default(""),
  location: z.string().default(""),
  phone_type: z.string().default(""),
  pics: z.array(z.unknown()).default([]),
});

export const MomentCommentResponse = baseModel({
  comments: withJsonPath(NoneToEmptyList, "$.CmList[*]").pipe(z.array(MomentCommentItem).default([])),
  next_pos: z.number().default(0),
});

export const AddCommentResponse = baseModel({
  subcode: z.number().default(0),
  msg: z.string().default(""),
  AddedCmId: z.number().default(0),
  ParentCmId: z.number().default(0),
  Num: withJsonPath(NoneToEmptyList, "$.Floor.Num").default(0),
  VerifyUrl: z.string().default(""),
});
