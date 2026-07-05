/** MV 相关 API 模块 */
import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import { getGuid } from "../utils/common.js";

export class MvApi extends ApiModule {
  getDetail(vids: string[]): Request {
    return this._buildRequest({
      module: "video.VideoDataServer",
      method: "get_video_info_batch",
      param: {
        vidlist: vids,
        required: ["vid","type","sid","cover_pic","duration","singers","video_switch","msg","name","desc","playcnt","pubdate","isfav","gmid","uploader_nick","uploader_uin","uploader_headurl","related_songs"],
      },
    }) as Request;
  }

  getMvUrls(vids: string[]): Request {
    return this._buildRequest({
      module: "music.stream.MvUrlProxy",
      method: "GetMvUrls",
      param: {
        vids, request_type: 10003, guid: getGuid(),
        videoformat: 1, format: 265, dolby: 1,
        use_new_domain: 1, use_ipv6: 1,
      },
    }) as Request;
  }
}
