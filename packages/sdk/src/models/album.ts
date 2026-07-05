/** 专辑相关响应模型 */

import { z } from "zod";
import { Album } from "./base.js";
import { Singer } from "./base.js";
import { Song } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const AlbumCompany = baseModel({
  id: z.number().default(0),
  name: z.string().default(""),
  is_show: z.number().default(0),
  brief: z.string().default(""),
});

export const AlbumDetail = Album.extend({
  subtitle: z.string().default(""),
  publish_date: z.string().default(""),
  desc: z.string().default(""),
  language: z.string().default(""),
  album_type: z.number().default(0),
  genre: z.string().default(""),
  wikiurl: z.string().default(""),
  company: AlbumCompany.default({}),
});

export const GetAlbumDetailResponse = baseModel({
  album: AlbumDetail.default({}),
  company: AlbumCompany.default({}),
  singers: withJsonPath(NoneToEmptyList, "$.singer.singerList[*]").pipe(z.array(Singer).default([])),
});

export const GetAlbumSongResponse = baseModel({
  album_mid: z.string().default(""),
  total_num: z.number().default(0),
  song_list: withJsonPath(NoneToEmptyList, "$.songList[*].songInfo").pipe(z.array(Song).default([])),
});
