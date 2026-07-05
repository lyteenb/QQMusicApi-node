/** 定义多个接口共享的基础业务实体模型 */

import { z } from "zod";
import { baseModel } from "./request.js";

export type CoverSize = 150 | 300 | 500 | 800 | 1200 | 1500;

const PHOTO_NEW_SIZE_SEGMENTS: Record<number, string> = {
  150: "R150x150",
  300: "R300x300",
  500: "R500x500",
  800: "R800x800",
  1200: "R1200x1200",
  1500: "R1500x1500",
};

function normalizeCoverSize(size: CoverSize): string {
  const seg = PHOTO_NEW_SIZE_SEGMENTS[size];
  if (!seg) throw new Error(`not supported size: ${size}`);
  return seg;
}

export function buildPhotoNewCoverUrl(kind: string, mid: string, size: CoverSize): string {
  const normalizedMid = mid.trim();
  if (!normalizedMid) return "";
  return `https://y.gtimg.cn/music/photo_new/${kind}${normalizeCoverSize(size)}M000${normalizedMid}.jpg`;
}

export const Singer = baseModel({
  id: z.number().default(0),
  mid: z.string().default(""),
  name: z.string().default(""),
  title: z.string().default(""),
  type: z.number().default(0),
  uin: z.number().default(0),
  pmid: z.string().default(""),
});

export type Singer = z.infer<typeof Singer>;

export const Album = baseModel({
  id: z.number().default(0),
  mid: z.string().default(""),
  name: z.string().default(""),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  time_public: z.string().default(""),
  pmid: z.string().default(""),
});

export type Album = z.infer<typeof Album>;

export const File = baseModel({
  media_mid: z.string().default(""),
  size_24aac: z.number().default(0),
  size_48aac: z.number().default(0),
  size_96aac: z.number().default(0),
  size_192ogg: z.number().default(0),
  size_192aac: z.number().default(0),
  size_128mp3: z.number().default(0),
  size_320mp3: z.number().default(0),
  size_flac: z.number().default(0),
  size_dts: z.number().default(0),
  size_try: z.number().default(0),
  try_begin: z.number().default(0),
  try_end: z.number().default(0),
  size_96ogg: z.number().default(0),
  size_dolby: z.number().default(0),
  size_new: z.array(z.number()).default([]),
});

export type File = z.infer<typeof File>;

export const Pay = baseModel({
  pay_month: z.number().default(0),
  price_track: z.number().default(0),
  price_album: z.number().default(0),
  pay_play: z.number().default(0),
  pay_down: z.number().default(0),
  pay_status: z.number().default(0),
  time_free: z.number().default(0),
});

export type Pay = z.infer<typeof Pay>;

export const MV = baseModel({
  id: z.number().default(0),
  vid: z.string().default(""),
  type: z.number().default(0),
  name: z.string().default(""),
  title: z.string().default(""),
});

export type MV = z.infer<typeof MV>;

export const SongList = baseModel({
  id: z.number().default(0),
  dirid: z.number().default(0),
  title: z.string().default(""),
  picurl: z.string().default(""),
  desc: z.string().default(""),
  songnum: z.number().default(0),
  listennum: z.number().default(0),
});

export type SongList = z.infer<typeof SongList>;

export const Song = baseModel({
  id: z.number(),
  mid: z.string(),
  name: z.string(),
  type: z.number(),
  title: z.string().default(""),
  subtitle: z.string().default(""),
  singer: z.array(Singer).default([]),
  album: Album.default({}),
  mv: MV.default({}),
  file: File.default({}),
  pay: Pay.default({}),
  interval: z.number().default(0),
  isonly: z.number().default(0),
  language: z.number().default(0),
  genre: z.number().default(0),
  index_cd: z.number().default(0),
  index_album: z.number().default(0),
  time_public: z.string().default(""),
  status: z.number().default(0),
  label: z.string().default(""),
  bpm: z.number().default(0),
  ov: z.number().default(0),
  sa: z.number().default(0),
  es: z.string().default(""),
  vs: z.array(z.string()).default([]),
  vi: z.array(z.number()).default([]),
  vf: z.array(z.number()).default([]),
});

export type Song = z.infer<typeof Song>;
