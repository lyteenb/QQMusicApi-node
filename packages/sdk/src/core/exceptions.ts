/** 统一异常定义模块 */

export class BaseApiException extends Error {
  override message: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
  }

  override toString(): string {
    return this.message;
  }
}

export class CredentialInvalidError extends BaseApiException {
  constructor(message: string = "凭证缺失或格式损坏，请先登录") {
    super(message);
  }
}

export class NetworkError extends BaseApiException {
  constructor(message: string = "网络异常") {
    super(message);
  }
}

export class HTTPError extends BaseApiException {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(`HTTP ${statusCode}: ${message}`);
    this.statusCode = statusCode;
  }
}

export class ApiDataError extends BaseApiException {
  data: unknown;

  constructor(message: string, data: unknown = null) {
    super(`API Data Error: ${message}`);
    this.data = data;
  }
}

export class ApiException extends BaseApiException {
  code: number;
  data: unknown;

  constructor(message: string, code: number = -1, data: unknown = null) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

export class GlobalApiError extends ApiException {
  constructor(message: string | null = null, code: number, data: unknown = null) {
    super(message ?? `请求被网关拒绝 (code=${code})`, code, data);
  }
}

export class CgiApiException extends ApiException {
  constructor(message: string | null = null, code: number, data: unknown = null) {
    super(message ?? `CGI 请求错误 (code=${code})`, code, data);
  }
}

export class CredentialExpiredError extends CgiApiException {
  constructor(message: string = "登录凭证已过期，请重新登录", code: number, data: unknown = null) {
    super(message, code, data);
  }
}

export class CredentialRefreshError extends CgiApiException {
  constructor(message: string = "登录凭证刷新失败", code: number, data: unknown = null) {
    super(message, code, data);
  }
}

export class SignatureRequiredError extends CgiApiException {
  constructor(code: number = 2000, data: unknown = null) {
    super("请求需要签名", code, data);
  }
}

export class RatelimitedError extends CgiApiException {
  feedbackUrl: string | null;

  constructor(message: string = "触发风控，需登录或者安全验证", code: number, data: unknown = null) {
    super(message, code, data);
    this.feedbackUrl = (data && typeof data === "object" && "feedbackURL" in (data as Record<string, unknown>))
      ? String((data as Record<string, unknown>).feedbackURL)
      : null;
  }
}

export class LoginError extends CgiApiException {
  constructor(message: string = "登录失败", code: number, data: unknown = null) {
    super(message, code, data);
  }
}

export class LoginAuthExpiredError extends LoginError {
  constructor(message: string = "登录鉴权参数无效或已过期", code: number, data: unknown = null) {
    super(message, code, data);
  }
}

export class LoginDeviceLimitError extends LoginError {
  constructor(message: string = "登录设备超限", code: number, data: unknown = null) {
    super(message, code, data);
  }
}

export class LoginAccountRestrictedError extends LoginError {
  constructor(message: string = "账号受限", code: number, data: unknown = null) {
    super(message, code, data);
  }
}

export class LoginRateLimitError extends LoginError {
  constructor(message: string = "操作过于频繁", code: number, data: unknown = null) {
    super(message, code, data);
  }
}
