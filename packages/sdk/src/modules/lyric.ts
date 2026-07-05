/** 歌词相关 API 模块 */
import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";

export class LyricApi extends ApiModule {
  getLyric(value: number | string, qrc: boolean = false, trans: boolean = false, roma: boolean = false): Request {
    const commonParams = this._buildQueryCommonParams();
    return this._buildRequest({
      module: "music.musichallSong.PlayLyricInfo",
      method: "GetPlayLyricInfo",
      param: {
        ...((typeof value === "number" || /^\d+$/.test(String(value)))
          ? { songId: Number(value) }
          : { songMid: value }),
        crypt: 1, qrc: qrc ? 1 : 0, qrc_t: 0,
        roma: roma ? 1 : 0, roma_t: 0,
        trans: trans ? 1 : 0, trans_t: 0,
        type: 1, ct: commonParams.ct, cv: commonParams.cv,
      },
    }) as Request;
  }
}
