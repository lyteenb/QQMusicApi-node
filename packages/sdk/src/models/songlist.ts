import { z } from "zod";
import { SongList, Song } from "./base.js";
import { baseModel, withJsonPath, NoneToEmptyList } from "./request.js";

export const SonglistCreator = baseModel({
  musicid: z.number().default(0),
  nick: z.string().default(""),
  headurl: z.string().default(""),
  encrypt_uin: z.string().default(""),
});

export const SonglistInfo = SongList.extend({
  creator: SonglistCreator.default({}),
});

export const GetSonglistDetailResponse = baseModel({
  code: z.number().default(0),
  subcode: z.number().default(0),
  msg: z.string().default(""),
  dirinfo: SonglistInfo.default({}),
  songlist_size: z.number().default(0),
  songlist: withJsonPath(NoneToEmptyList, "$.songlist[*]").pipe(z.array(Song).default([])),
  total_song_num: z.number().default(0),
  hasmore: z.number().default(0),
});

export const CreateDeleteSonglistResp = baseModel({
  retCode: z.number().default(0),
  id: withJsonPath(NoneToEmptyList, "$.result.tid").default(0),
  dirid: withJsonPath(NoneToEmptyList, "$.result.dirId").default(0),
  name: withJsonPath(NoneToEmptyList, "$.result.dirName").default(""),
});
