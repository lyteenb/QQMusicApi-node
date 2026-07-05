import { z } from "zod";
import { Song, Singer, Album, MV, SongList } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const HotnessData = baseModel({
  hot: z.number().default(0),
  listen: z.number().default(0),
  play: z.number().default(0),
  score: z.number().default(0),
  value: z.number().default(0),
  trend: z.number().default(0),
});

export const ContentHit = baseModel({
  type: z.string().default(""),
  value: z.string().default(""),
  alias: z.string().default(""),
});

export const SongSearch = Song.extend({
  search_title: z.string().default(""),
  title_main: z.string().default(""),
  title_extra: z.string().default(""),
  fav_show: z.number().default(0),
  desc: z.string().default(""),
  desc_icon: z.string().default(""),
  content: z.array(ContentHit).default([]),
  hotness: HotnessData.default({}),
});

export const AlbumSearch = Album.extend({
  ranking_info: z.unknown().default(null),
  desc_detail: z.string().default(""),
  description: z.string().default(""),
  type: withJsonPath(NoneToEmptyList, "$.core_album_config.album_type").default(0),
});

export const SongListSearch = SongList;
export const SingerSearch = Singer;
export const MvSearch = MV.extend({});

export const GeneralSearchMeta = baseModel({
  sid: z.number().default(0),
  perpage: z.number().default(0),
  nextpage: z.number().default(0),
  nextpage_start: z.number().default(0),
});

export const GeneralSearchResponse = baseModel({
  meta: GeneralSearchMeta.default({}),
  item_song: withJsonPath(NoneToEmptyList, "$.body.item_song[*]").pipe(z.array(SongSearch).default([])),
  item_singer: withJsonPath(NoneToEmptyList, "$.body.singer[*]").pipe(z.array(SingerSearch).default([])),
  item_mv: withJsonPath(NoneToEmptyList, "$.body.item_mv[*]").pipe(z.array(MvSearch).default([])),
  item_album: withJsonPath(NoneToEmptyList, "$.body.item_album[*]").pipe(z.array(AlbumSearch).default([])),
  item_songlist: withJsonPath(NoneToEmptyList, "$.body.item_songlist[*]").pipe(z.array(SongListSearch).default([])),
  item_audio: withJsonPath(NoneToEmptyList, "$.body.item_audio[*]").default([]),
  direct_result: withJsonPath(NoneToEmptyList, "$.body.direct_result").default(null),
  item_related: withJsonPath(NoneToEmptyList, "$.body.item_related").default(null),
});

export const SearchByTypeResponse = baseModel({
  meta: withJsonPath(NoneToEmptyList, "$.meta").default(null),
  items: withJsonPath(NoneToEmptyList, "$.body.itemlist[*]").default([]),
});

export const RelatedSearchWord = baseModel({
  display_word: z.string().default(""),
  search_word: z.string().default(""),
});
