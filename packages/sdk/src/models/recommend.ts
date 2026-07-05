import { z } from "zod";
import { Song, SongList } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const RecommendNiche = baseModel({
  id: z.number().default(0),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  picurl: z.string().default(""),
  type: z.number().default(0),
  jumpurl: z.string().default(""),
  songlist: z.array(SongList).default([]),
});

export const RecommendShelf = baseModel({
  id: z.number().default(0),
  title: z.string().default(""),
  niches: z.array(RecommendNiche).default([]),
});

export const RecommendFeedCardResponse = baseModel({
  retcode: z.number().default(0),
  msg: z.string().default(""),
  prompt: z.string().default(""),
  d_num: z.number().default(0),
  load_mark: z.number().default(0),
  shelves: withJsonPath(NoneToEmptyList, "$.v_shelf[*]").pipe(z.array(RecommendShelf).default([])),
});

export const GuessRecommendResponse = baseModel({
  songs: withJsonPath(NoneToEmptyList, "$.tracks[*]").pipe(z.array(Song).default([])),
});

export const RadarRecommendResponse = baseModel({
  songs: withJsonPath(NoneToEmptyList, "$.VecSongs[*].Track").pipe(z.array(Song).default([])),
  RecommendSongIds: z.array(z.number()).default([]),
  BaseSongIds: z.array(z.number()).default([]),
  HasMore: z.number().default(0),
  toast: z.string().default(""),
  TimeStamp: z.string().default(""),
  VideoCards: z.array(z.unknown()).default([]),
});

export const RecommendSonglistItem = SongList.extend({
  picurl: withJsonPath(z.string().default(""), "$.cover.default_url"),
});

export const RecommendSonglistResponse = baseModel({
  songlists: withJsonPath(NoneToEmptyList, "$.List[*].Playlist.basic").pipe(z.array(RecommendSonglistItem).default([])),
});

export const RecommendNewSongTag = baseModel({
  id: z.number().default(0),
  name: z.string().default(""),
});

export const RecommendNewSongResponse = baseModel({
  tags: z.array(RecommendNewSongTag).default([]),
  songs: z.array(Song).default([]),
});
