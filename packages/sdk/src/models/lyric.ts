/** 歌词响应模型 */

import { z } from "zod";
import { baseModel } from "./request.js";

export const GetLyricResponse = baseModel({
  song_id: z.number().default(0),
  lyric: z.string().default(""),
  trans: z.string().default(""),
  roma: z.string().default(""),
});
