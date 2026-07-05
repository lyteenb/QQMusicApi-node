/** 辅助功能 API 模块 */

import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import type { Credential } from "../models/request.js";

export class HelperApi extends ApiModule {
  initUpload(busId: string, files: { FileSha1: string; FileName: string; FileSize: number }[], credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.filesys.FileSystem", method: "InitUpload",
      param: { BusID: busId, Files: files },
      credential, requireLogin: true, sign: true,
    }) as Request;
  }

  finishUpload(busId: string, results: { Storage: unknown; UploadResult: unknown }[], credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.filesys.FileSystem", method: "FinishUpload",
      param: { BusID: busId, Results: results },
      credential, requireLogin: true, sign: true,
    }) as Request;
  }
}
