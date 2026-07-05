/** 全局路由注册 — 所有业务 API 端点 */

import type { FastifyInstance } from "fastify";
import { qrcDecrypt } from "@qqmusic-api/sdk";
import { successResponse, errorResponse } from "../core/response.js";
import { sendCached } from "../core/cache.js";
import type { CacheBackend } from "../core/cache.js";
import { credentialFromCookies } from "../core/auth.js";

export async function registerRoutes(app: FastifyInstance, cache: CacheBackend) {
  const client = app.sdkClient;
  const settings = app.settings;

  // Helper: cached GET
  async function cachedRoute(reply: any, key: string, ttl: number, fn: () => PromiseLike<unknown>) {
    try {
      const cached = await cache.get(key);
      if (cached) {
        return reply.header("Cache-Control", `public, max-age=${cached.ttl}`).send(successResponse(cached.data));
      }
      const data = await fn();
      await sendCached(reply, cache, key, data, ttl);
      return;
    } catch (err: any) {
      return reply.status(500).send(errorResponse(500, err.message));
    }
  }

  // ═══════════════════════════════════════════════════════
  // 歌曲
  // ═══════════════════════════════════════════════════════
  function normalizeQrLoginType(value: unknown): "qq" | "wx" {
    return value === "wx" ? "wx" : "qq";
  }

  function qrEventCode(event: number): number {
    if (event === 0) return 803;
    if (event === 66) return 801;
    if (event === 67) return 802;
    if (event === 65) return 800;
    if (event === 68) return 806;
    return 500;
  }

  function decryptLyricPayload(data: unknown): unknown {
    if (!data || typeof data !== "object") return data;
    const payload = { ...(data as Record<string, unknown>) };
    if (Number(payload.crypt || 0) !== 1) return payload;
    for (const key of ["lyric", "trans", "roma"]) {
      const value = payload[key];
      if (typeof value === "string" && value) {
        try {
          payload[key] = qrcDecrypt(value);
        } catch {
          payload[key] = "";
        }
      }
    }
    return payload;
  }

  app.get("/login/qrcode/:loginType", async (req, reply) => {
    try {
      const { loginType } = req.params as { loginType?: string };
      const qr = await client.login.getQrcode(normalizeQrLoginType(loginType));
      const data = Buffer.from(qr.data).toString("base64");
      return reply.send(successResponse({
        qr_type: qr.qrType,
        identifier: qr.identifier,
        mimetype: qr.mimetype,
        data,
        img: `data:${qr.mimetype};base64,${data}`,
      }));
    } catch (err: any) {
      return reply.status(500).send(errorResponse(500, err.message));
    }
  });

  app.get("/login/qrcode/:loginType/status", async (req, reply) => {
    try {
      const { loginType } = req.params as { loginType?: string };
      const { identifier } = req.query as { identifier?: string };
      if (!identifier) return reply.status(400).send(errorResponse(400, "identifier is required"));
      const qrType = normalizeQrLoginType(loginType);
      const result = await client.login.checkQrcode({
        data: new Uint8Array(),
        qrType,
        mimetype: "image/png",
        identifier,
      });
      return reply.send(successResponse({
        event: qrEventCode(result.event),
        raw_event: result.event,
        done: !!result.done,
        credential: result.credential,
        message: result.message || "",
        identifier,
        login_type: qrType,
      }));
    } catch (err: any) {
      return reply.status(500).send(errorResponse(500, err.message));
    }
  });

  app.get("/song/detail", async (req, reply) => {
    const { id, mid } = req.query as { id?: string; mid?: string };
    const value = id ? Number(id) : mid!;
    const key = `song:detail:${id || mid}`;
    return cachedRoute(reply, key, settings.cache.ttl, () => client.song.getDetail(value));
  });

  app.get("/song/urls", async (req, reply) => {
    const { mid, mediaMid, type } = req.query as { mid: string; mediaMid?: string; type?: string };
    const { SongFileType, SpecialSongFileType } = await import("@qqmusic-api/sdk");
    const ft = type === "try" ? SpecialSongFileType.TRY : type === "flac" ? SongFileType.FLAC : type === "320" ? SongFileType.MP3_320 : SongFileType.MP3_128;
    const credential = credentialFromCookies(req);
    const accountKey = credential?.musicid ? String(credential.musicid) : "anonymous";
    return cachedRoute(reply, `song:urls:${accountKey}:${mid}:${mediaMid || ""}:${type || "128"}`, 300, () =>
      client.song.getSongUrls([{ mid, mediaMid, fileType: ft }], ft, credential));
  });

  app.get("/song/similar", async (req, reply) => {
    const { id } = req.query as { id: string };
    return cachedRoute(reply, `song:similar:${id}`, settings.cache.ttl, () => client.song.getSimilarSong(Number(id)));
  });

  app.get("/song/related-songlist", async (req, reply) => {
    const { id } = req.query as { id: string };
    return cachedRoute(reply, `song:related-sl:${id}`, settings.cache.ttl, () => client.song.getRelatedSonglist(Number(id)));
  });

  app.get("/song/related-mv", async (req, reply) => {
    const { id } = req.query as { id: string };
    return cachedRoute(reply, `song:related-mv:${id}`, settings.cache.ttl, () => client.song.getRelatedMv(Number(id)));
  });

  app.get("/song/other-version", async (req, reply) => {
    const { id, mid } = req.query as { id?: string; mid?: string };
    const value = id ? Number(id) : mid!;
    return cachedRoute(reply, `song:other:${id || mid}`, settings.cache.ttl, () => client.song.getOtherVersion(value));
  });

  app.post("/song/query", async (req, reply) => {
    const { ids, mids } = req.body as { ids?: number[]; mids?: string[] };
    return cachedRoute(reply, `song:query:${JSON.stringify(ids || mids)}`, 600,
      () => client.song.querySong((ids || mids)!));
  });

  app.get("/song/cdn", async (_req, reply) => {
    return cachedRoute(reply, "song:cdn", 300, () => client.song.getCdnDispatch());
  });

  app.get("/song/fav-num", async (req, reply) => {
    const { ids } = req.query as { ids: string };
    const songIds = ids.split(",").map(Number);
    return cachedRoute(reply, `song:fav:${ids}`, 600, () => client.song.getFavNum(songIds));
  });

  // ═══════════════════════════════════════════════════════
  // 歌手
  // ═══════════════════════════════════════════════════════
  app.get("/singer/list", async (req, reply) => {
    const { area, sex, genre } = req.query as { area?: string; sex?: string; genre?: string };
    return cachedRoute(reply, `singer:list:${area}:${sex}:${genre}`, 300, () =>
      client.singer.getSingerList(
        area ? Number(area) : -100, sex ? Number(sex) : -100, genre ? Number(genre) : -100));
  });

  app.get("/singer/list-index", async (req, reply) => {
    const { area, sex, genre, index, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `singer:index:${area}:${sex}:${genre}:${index}:${page}`, 300, () =>
      client.singer.getSingerListIndex(Number(area), Number(sex), Number(genre), Number(index),
        page ? Number(page) : 1, num ? Number(num) : 25));
  });

  app.get("/singer/info", async (req, reply) => {
    const { mid } = req.query as { mid: string };
    return cachedRoute(reply, `singer:info:${mid}`, 600, () => client.singer.getInfo(mid));
  });

  app.get("/singer/tab-detail", async (req, reply) => {
    const { mid, tab, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `singer:tab:${mid}:${tab}:${page}`, 300, () =>
      client.singer.getTabDetail(mid, tab, page ? Number(page) : 1, num ? Number(num) : 20));
  });

  app.get("/singer/desc", async (req, reply) => {
    const { mids } = req.query as { mids: string };
    return cachedRoute(reply, `singer:desc:${mids}`, 600, () => client.singer.getDesc(mids.split(",")));
  });

  app.get("/singer/similar", async (req, reply) => {
    const { mid, n } = req.query as { mid: string; n?: string };
    return cachedRoute(reply, `singer:similar:${mid}`, 300, () => client.singer.getSimilar(mid, n ? Number(n) : 10));
  });

  app.get("/singer/songs", async (req, reply) => {
    const { mid, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `singer:songs:${mid}:${page}`, 300, () =>
      client.singer.getSongsList(mid, num ? Number(num) : 20, page ? Number(page) : 1));
  });

  app.get("/singer/albums", async (req, reply) => {
    const { mid, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `singer:albums:${mid}:${page}`, 300, () =>
      client.singer.getAlbumList(mid, num ? Number(num) : 20, page ? Number(page) : 1));
  });

  app.get("/singer/mvs", async (req, reply) => {
    const { mid, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `singer:mvs:${mid}:${page}`, 300, () =>
      client.singer.getMvList(mid, num ? Number(num) : 20, page ? Number(page) : 1));
  });

  // ═══════════════════════════════════════════════════════
  // 专辑
  // ═══════════════════════════════════════════════════════
  app.get("/album/detail", async (req, reply) => {
    const { id, mid } = req.query as { id?: string; mid?: string };
    const value = id ? Number(id) : (mid!);
    return cachedRoute(reply, `album:detail:${id || mid}`, 300, () => client.album.getDetail(value));
  });

  app.get("/album/songs", async (req, reply) => {
    const { id, mid, page, num } = req.query as Record<string, string>;
    const value = id ? Number(id) : (mid!);
    return cachedRoute(reply, `album:songs:${id || mid}:${page}`, 300, () =>
      client.album.getSong(value, num ? Number(num) : 10, page ? Number(page) : 1));
  });

  // ═══════════════════════════════════════════════════════
  // 歌单
  // ═══════════════════════════════════════════════════════
  app.get("/songlist/detail", async (req, reply) => {
    const { id, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `songlist:detail:${id}:${page}`, 300, () =>
      client.songlist.getDetail(Number(id), undefined, num ? Number(num) : 20, page ? Number(page) : 1));
  });

  // ═══════════════════════════════════════════════════════
  // MV
  // ═══════════════════════════════════════════════════════
  app.get("/mv/detail", async (req, reply) => {
    const { vids } = req.query as { vids: string };
    return cachedRoute(reply, `mv:detail:${vids}`, 300, () => client.mv.getDetail(vids.split(",")));
  });

  app.get("/mv/urls", async (req, reply) => {
    const { vids } = req.query as { vids: string };
    return cachedRoute(reply, `mv:urls:${vids}`, 300, () => client.mv.getMvUrls(vids.split(",")));
  });

  // ═══════════════════════════════════════════════════════
  // 歌词
  // ═══════════════════════════════════════════════════════
  app.get("/lyric", async (req, reply) => {
    const { id, mid, qrc, trans, roma } = req.query as Record<string, string>;
    const value = id ? Number(id) : (mid!);
    return cachedRoute(reply, `lyric:${id || mid}:${qrc}:${trans}:${roma}`, 300, () =>
      client.lyric.getLyric(value, qrc === "1", trans === "1", roma === "1").then(decryptLyricPayload));
  });

  // ═══════════════════════════════════════════════════════
  // 搜索
  // ═══════════════════════════════════════════════════════
  app.get("/search/hotkey", async (_req, reply) => {
    return cachedRoute(reply, "search:hotkey", 60, () => client.search.getHotkey());
  });

  app.get("/search/complete", async (req, reply) => {
    const { q } = req.query as { q: string };
    return cachedRoute(reply, `search:complete:${q}`, 60, () => client.search.complete(q));
  });

  app.get("/search/general", async (req, reply) => {
    const { q, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `search:general:${q}:${page}`, 60, () =>
      client.search.generalSearch(q, page ? Number(page) : 1, num ? Number(num) : 20));
  });

  app.get("/search/by-type", async (req, reply) => {
    const { q, type, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `search:type:${q}:${type}:${page}`, 60, () =>
      client.search.searchByType(q, Number(type), num ? Number(num) : 20, page ? Number(page) : 1));
  });

  // ═══════════════════════════════════════════════════════
  // 排行榜
  // ═══════════════════════════════════════════════════════
  app.get("/top/category", async (_req, reply) => {
    return cachedRoute(reply, "top:category", 60, () => client.top.getCategory());
  });

  app.get("/top/detail", async (req, reply) => {
    const { id, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `top:detail:${id}:${page}`, 60, () =>
      client.top.getDetail(Number(id), num ? Number(num) : 20, page ? Number(page) : 1));
  });

  // ═══════════════════════════════════════════════════════
  // 评论
  // ═══════════════════════════════════════════════════════
  app.get("/comment/count", async (req, reply) => {
    const { id } = req.query as { id: string };
    return cachedRoute(reply, `comment:count:${id}`, 60, () => client.comment.getCommentCount(Number(id)));
  });

  app.get("/comment/hot", async (req, reply) => {
    const { id, page, size } = req.query as Record<string, string>;
    return cachedRoute(reply, `comment:hot:${id}:${page}`, 60, () =>
      client.comment.getHotComments(Number(id), page ? Number(page) : 1, size ? Number(size) : 20));
  });

  app.get("/comment/new", async (req, reply) => {
    const { id, page, size } = req.query as Record<string, string>;
    return cachedRoute(reply, `comment:new:${id}:${page}`, 60, () =>
      client.comment.getNewComments(Number(id), page ? Number(page) : 1, size ? Number(size) : 20));
  });

  app.get("/comment/recommend", async (req, reply) => {
    const { id, page, size } = req.query as Record<string, string>;
    return cachedRoute(reply, `comment:rec:${id}:${page}`, 60, () =>
      client.comment.getRecommendComments(Number(id), page ? Number(page) : 1, size ? Number(size) : 20));
  });

  // ═══════════════════════════════════════════════════════
  // 推荐
  // ═══════════════════════════════════════════════════════
  app.get("/recommend/home-feed", async (req, reply) => {
    const { page } = req.query as { page?: string };
    return cachedRoute(reply, `recommend:feed:${page || 0}`, 60, () =>
      client.recommend.getHomeFeed(page ? Number(page) : 0));
  });

  app.get("/recommend/guess", async (_req, reply) => {
    return cachedRoute(reply, "recommend:guess", 60, () => client.recommend.getGuessRecommend());
  });

  app.get("/recommend/songlist", async (req, reply) => {
    const { page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `recommend:sl:${page || 1}`, 60, () =>
      client.recommend.getRecommendSonglist(page ? Number(page) : 1, num ? Number(num) : 20));
  });

  app.get("/recommend/newsong", async (_req, reply) => {
    return cachedRoute(reply, "recommend:newsong", 60, () => client.recommend.getRecommendNewSong());
  });

  // ═══════════════════════════════════════════════════════
  // 用户
  // ═══════════════════════════════════════════════════════
  app.get("/user/homepage", async (req, reply) => {
    const { uin } = req.query as { uin: string };
    return cachedRoute(reply, `user:homepage:${uin}`, 60, () => client.user.getHomepage(uin));
  });

  app.get("/user/created-songlist", async (req, reply) => {
    const { uin } = req.query as { uin: string };
    return cachedRoute(reply, `user:created-sl:${uin}`, 60, () => client.user.getCreatedSonglist(uin));
  });

  app.get("/user/fav-song", async (req, reply) => {
    const { uin, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `user:fav-song:${uin}:${page}`, 60, () =>
      client.user.getFavSong(uin, page ? Number(page) : 1, num ? Number(num) : 20));
  });

  app.get("/user/fav-songlist", async (req, reply) => {
    const { uin, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `user:fav-sl:${uin}:${page}`, 60, () =>
      client.user.getFavSonglist(uin, page ? Number(page) : 1, num ? Number(num) : 20));
  });

  app.get("/user/fav-album", async (req, reply) => {
    const { uin, page, num } = req.query as Record<string, string>;
    return cachedRoute(reply, `user:fav-album:${uin}:${page}`, 60, () =>
      client.user.getFavAlbum(uin, page ? Number(page) : 1, num ? Number(num) : 20));
  });

  app.get("/user/music-gene", async (req, reply) => {
    const { uin } = req.query as { uin: string };
    return cachedRoute(reply, `user:gene:${uin}`, 60, () => client.user.getMusicGene(uin));
  });
}
