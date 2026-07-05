/** QQMusicApi — QQ 音乐 API SDK for Node.js */

export const __version__ = "0.6.7";

// Core
export { Client } from "./core/client.js";
export type { ClientOptions } from "./core/client.js";
export { Request, PaginatedRequest, RefreshableRequest } from "./core/request.js";
export { Platform, DEFAULT_VERSION_POLICY } from "./core/versioning.js";

// Exceptions
export {
  BaseApiException, ApiException, CgiApiException,
  HTTPError, NetworkError, ApiDataError,
  GlobalApiError, RatelimitedError, SignatureRequiredError,
  CredentialExpiredError, CredentialInvalidError, CredentialRefreshError,
  LoginError, LoginAuthExpiredError, LoginAccountRestrictedError,
  LoginDeviceLimitError, LoginRateLimitError,
} from "./core/exceptions.js";

// Models
export { Credential } from "./models/request.js";

// Modules (for direct access)
export { SongApi, SongFileType, EncryptedSongFileType, SpecialSongFileType } from "./modules/song.js";
export type { SongFileInfo } from "./modules/song.js";
export { SingerApi, AreaType, GenreType, SexType, IndexType } from "./modules/singer.js";
export { SearchApi, SearchType } from "./modules/search.js";
export { AlbumApi } from "./modules/album.js";
export { SonglistApi } from "./modules/songlist.js";
export { MvApi } from "./modules/mv.js";
export { LyricApi } from "./modules/lyric.js";
export { CommentApi } from "./modules/comment.js";
export { TopApi } from "./modules/top.js";
export { RecommendApi } from "./modules/recommend.js";
export { UserApi } from "./modules/user.js";
export { LoginApi } from "./modules/login.js";
export { PrivateMessageApi } from "./modules/private_message.js";
export { HelperApi } from "./modules/helper.js";

// Utils
export { getGuid, getSearchId, hash33 } from "./utils/common.js";
export { qrcDecrypt, zzcSign } from "./algorithms/index.js";
