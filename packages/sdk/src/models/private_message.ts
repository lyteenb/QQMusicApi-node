/** 私信相关响应模型 */
import { z } from "zod";
import { baseModel, NoneToEmptyList } from "./request.js";

export const PrivateMessageUser = baseModel({
  avatar: z.string().default(""), encrypt_uin: z.string().default(""),
  uin: z.number().default(0), identity_pic: z.string().default(""),
  nick: z.string().default(""), identity: z.number().default(0),
  type: z.number().default(0), is_concern: z.number().default(0),
});

export const PrivateMessageMetaData = baseModel({
  card_info: z.unknown().default(null),
  media_info: z.unknown().default(null),
});

export const PrivateMessageInfo = baseModel({
  id: z.number().default(0), meta_data: PrivateMessageMetaData.default({}),
  client_key: z.string().default(""), from_user: PrivateMessageUser.default({}),
  time: z.number().default(0), state: z.number().default(0),
  result: z.number().default(0), tips: z.string().default(""),
  sequence: z.number().default(0), show_type: z.number().default(0),
  msg_type: z.number().default(0), confirm: z.number().default(0),
  sort_time: z.number().default(0),
  complain_tip: z.string().default(""), complain_url: z.string().default(""),
});

export const PrivateMessageSession = baseModel({
  session_id: z.number().default(0), user: PrivateMessageUser.default({}),
  new_msg: z.string().default(""), new_msg_cnt: z.number().default(0),
  sort_time: z.number().default(0), url: z.string().default(""),
  create_time: z.number().default(0), from_: z.number().default(0),
  tail_tags: z.array(z.unknown()).default([]),
  auth: z.unknown().default(null), ext: z.unknown().default(null),
});

export const PrivateSessionListResponse = baseModel({
  sessions: z.array(PrivateMessageSession).default([]),
  has_more: z.number().default(0), total: z.number().default(0),
});

export const PrivateMessageListResponse = baseModel({
  messages: z.array(PrivateMessageInfo).default([]),
  has_more: z.number().default(0),
});

export const PrivateSendMessageResponse = baseModel({
  msg_id: z.number().default(0), session_id: z.number().default(0),
  result: z.number().default(0), seq: z.number().default(0),
});

export const PrivateOperationResponse = baseModel({
  code: z.number().default(0), msg: z.string().default(""),
});

export const PrivateConfigResponse = baseModel({
  config_type: z.number().default(0), config_value: z.string().default(""),
});

export const PrivateMusicianCardResponse = baseModel({
  card: z.unknown().default(null),
});

export const PrivateChatEntriesResponse = baseModel({
  entries: z.array(z.unknown()).default([]),
});

export const PrivateMediaMessageDetailsResponse = baseModel({
  details: z.array(z.unknown()).default([]),
});

export const PrivateSafetyHintResponse = baseModel({
  show_hint: z.number().default(0), hint_text: z.string().default(""),
});
