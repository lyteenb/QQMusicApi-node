/** 歌曲相关响应模型 */

import { z } from "zod";
import { Song, MV, SongList } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const ContentItem = baseModel({
  id: z.string().default(""),
  name: z.string().default(""),
  alias: z.string().default(""),
  content: z.string().default(""),
  value: z.string().default(""),
});

export const QuerySongResponse = baseModel({
  tracks: z.array(Song).default([]),
});

export const UrlinfoItem = baseModel({
  mid: z.string().default(""),
  filename: z.string().default(""),
  purl: z.string().default(""),
  vkey: z.string().default(""),
  ekey: z.string().default(""),
  result: z.number().default(0),
});

export const GetSongUrlsResponse = baseModel({
  expiration: z.number().default(0),
  data: z.array(UrlinfoItem).default([]),
});

export const GetSongDetailResponse = baseModel({
  company: withJsonPath(NoneToEmptyList, "$.info.company.content").pipe(z.array(ContentItem).default([])),
  genre: withJsonPath(NoneToEmptyList, "$.info.genre.content").pipe(z.array(ContentItem).default([])),
  intro: withJsonPath(NoneToEmptyList, "$.info.intro.content").pipe(z.array(ContentItem).default([])),
  lan: withJsonPath(NoneToEmptyList, "$.info.lan.content").pipe(z.array(ContentItem).default([])),
  pub_time: withJsonPath(NoneToEmptyList, "$.info.pub_time.content").pipe(z.array(ContentItem).default([])),
  extras: z.record(z.string(), z.unknown()).default({}),
  track_info: Song.nullable().default(null),
});

export const SongGroup = baseModel({
  song_group_id: z.number().default(0),
  song_group_name: z.string().default(""),
  songs: z.array(Song).default([]),
});

export const GetSimilarSongResponse = baseModel({
  tag: z.array(z.unknown()).default([]),
  vecSongNew: z.array(SongGroup).default([]),
});

export const SongLabel = baseModel({
  id: z.number().default(0),
  tagTxt: z.string().default(""),
  tagIcon: z.string().default(""),
  tagUrl: z.string().default(""),
  tagType: z.number().default(0),
  species: z.number().default(0),
});

export const GetSongLabelsResponse = baseModel({
  labels: z.array(SongLabel).default([]),
});

export const RelatedPlaylist = SongList.extend({
  songid: z.number().default(0),
});

export const RelatedMv = MV.extend({
  songid: z.number().default(0),
});

export const GetRelatedSonglistResponse = baseModel({
  playlists: withJsonPath(NoneToEmptyList, "$.vecPlaylist[*]").pipe(z.array(RelatedPlaylist).default([])),
  has_more: z.number().default(0),
});

export const GetRelatedMvResponse = baseModel({
  mvs: withJsonPath(NoneToEmptyList, "$.vecMv[*]").pipe(z.array(RelatedMv).default([])),
  has_more: z.number().default(0),
});

export const OtherVersion = baseModel({
  sid: z.number().default(0),
  vid: z.string().default(""),
  mid: z.string().default(""),
  name: z.string().default(""),
  singer: z.array(Song.shape.singer).default([]),
  album: Song.shape.album.default({}),
});

export const GetOtherVersionResponse = baseModel({
  versions: z.array(OtherVersion).default([]),
});

export const SongProducer = baseModel({
  producer_id: z.number().default(0),
  producer_name: z.string().default(""),
  producer_type: z.number().default(0),
});

export const SongProducerGroup = baseModel({
  group_name: z.string().default(""),
  producers: z.array(SongProducer).default([]),
});

export const GetProducerResponse = baseModel({
  groups: z.array(SongProducerGroup).default([]),
});

export const SheetMusic = baseModel({
  score_mid: z.string().default(""),
  score_name: z.string().default(""),
  pic_urls: z.array(z.string()).default([]),
  version: z.string().default(""),
  tonality: z.string().default(""),
  score_type: z.number().default(0),
  difficulty: z.number().default(0),
  sheet_file: z.string().default(""),
});

export const GetSheetResponse = baseModel({
  hasGuitar: z.number().default(0),
  hasMore: z.number().default(0),
  hasLDY: z.number().default(0),
  hasQRCX: z.number().default(0),
  hasChongChong: z.number().default(0),
  scores: z.array(SheetMusic).default([]),
});

export const HasSheetMusicResponse = baseModel({
  hasGuitar: z.number().default(0),
  hasMore: z.number().default(0),
  hasLDY: z.number().default(0),
  hasQRCX: z.number().default(0),
  hasChongChong: z.number().default(0),
});

export const CdnDispatchSipInfo = baseModel({
  sip: z.string().default(""),
  sipinfo: z.array(z.string()).default([]),
  test_file: z.string().default(""),
  expiration: z.number().default(0),
  refresh_time: z.number().default(0),
  cache_time: z.number().default(0),
});

export const GetCdnDispatchResponse = baseModel({
  sip: z.array(CdnDispatchSipInfo).default([]),
});

export const GetFavNumResponse = baseModel({
  m_numbers: z.record(z.string(), z.number()).default({}),
  m_show: z.record(z.string(), z.string()).default({}),
});
