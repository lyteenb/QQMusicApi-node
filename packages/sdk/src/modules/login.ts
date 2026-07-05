/** 登录相关 API 模块 */

import crypto from "node:crypto";
import { ApiModule } from "./_base.js";
import { Request } from "../core/request.js";
import { Platform } from "../core/versioning.js";
import { hash33 } from "../utils/common.js";
import { Credential } from "../models/request.js";
import type { Credential as CredentialType } from "../models/request.js";
import { QR, QRLoginResult, QRCodeLoginEvents, PhoneAuthCodeResult, PhoneLoginEvents, type QRLoginType } from "../models/login.js";

function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join("; ");
}

function cookieValue(setCookie: string | null, name: string): string {
  if (!setCookie) return "";
  const match = setCookie.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] || "";
}

function getSetCookies(headers: Headers): string[] {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  const values = extended.getSetCookie?.();
  if (values?.length) return values;
  const single = headers.get("set-cookie");
  if (!single) return [];
  return single.split(/,(?=\s*[^;,\s]+=)/g).map((item) => item.trim()).filter(Boolean);
}

function setCookiesToCookieHeader(headers: Headers): string {
  return getSetCookies(headers)
    .map((item) => item.split(";")[0]?.trim() || "")
    .filter(Boolean)
    .join("; ");
}

function setCookieValue(headers: Headers, name: string): string {
  for (const item of getSetCookies(headers)) {
    const value = cookieValue(item, name);
    if (value) return value;
  }
  return "";
}

export class LoginApi extends ApiModule {
  /** 检查凭证是否过期 */
  async checkExpired(credential: Credential): Promise<boolean> {
    try {
      if (credential.musickey) {
        const resp = await this._request("GET",
          `https://c6.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg?g_tk=${hash33(credential.musickey, 5381)}&loginUin=${credential.musicid}&hostUin=${credential.musicid}&userid=${credential.musicid}`,
          credential, Platform.WEB);
        const data = await (resp as Response).json();
        return (data as Record<string, unknown>).code !== 0;
      }
      const result = await this._buildRequest({
        module: "music.UserInfo.userInfoServer", method: "GetLoginUserInfo",
        param: {}, credential, isJce: true,
      });
      return !result;
    } catch {
      return true;
    }
  }

  /** 刷新登录凭证 */
  refreshCredential(credential: Credential): Request {
    return this._buildRequest({
      module: "music.login.LoginServer",
      method: "Login",
      param: {
        openid: credential.openid, refresh_token: credential.refreshToken,
        musickey: credential.musickey, refresh_key: credential.refreshKey,
        loginMode: 2,
      },
      comm: { tmeLoginType: credential.loginType },
      credential,
    }) as Request;
  }

  /** 退出登录 */
  logout(credential?: Credential | null): Request {
    return this._buildRequest({
      module: "music.login.LoginServer",
      method: "Logout",
      param: {},
      credential,
      requireLogin: true,
    }) as Request;
  }

  /** 获取登录二维码 */
  async getQrcode(loginType: QRLoginType): Promise<QR> {
    if (loginType === "qq") {
      const t = String(Math.random());
      const resp = await this._request("GET",
        `https://ssl.ptlogin2.qq.com/ptqrshow?appid=716027609&e=2&l=M&s=3&d=72&v=4&t=${encodeURIComponent(t)}&daid=383&pt_3rd_aid=100497308`,
        undefined,
        undefined,
        undefined,
        { headers: { Referer: "https://xui.ptlogin2.qq.com/" } });
      const data = Buffer.from(await (resp as Response).arrayBuffer());
      const qrsig = cookieValue((resp as Response).headers.get("set-cookie"), "qrsig");
      return new QR(new Uint8Array(data), "qq", "image/png", qrsig);
    }
    // WeChat
    const resp = await this._request("GET",
      `https://open.weixin.qq.com/connect/qrconnect?appid=wx48db31d50e334801&redirect_uri=https://y.qq.com&response_type=code&scope=snsapi_login`);
    const text = await (resp as Response).text();
    const uuid = text.match(/uuid=([^"&]+)/)?.[1] || "";
    const imgResp = await this._request("GET", `https://open.weixin.qq.com/connect/qrcode/${uuid}`);
    const imgData = Buffer.from(await (imgResp as Response).arrayBuffer());
    return new QR(new Uint8Array(imgData), "wx", "image/jpeg", uuid);
  }

  /** 轮询 QR 码登录状态 */
  async checkQrcode(qrcode: QR): Promise<QRLoginResult> {
    if (qrcode.qrType === "qq") {
      const ptqrtoken = hash33(qrcode.identifier);
      const action = `0-0-${Date.now()}`;
      const resp = await this._request("GET",
        "https://ssl.ptlogin2.qq.com/ptqrlogin?" + new URLSearchParams({
          u1: "https://graph.qq.com/oauth2.0/login_jump",
          ptqrtoken: String(ptqrtoken),
          ptredirect: "0",
          h: "1",
          t: "1",
          g: "1",
          from_ui: "1",
          ptlang: "2052",
          action,
          js_ver: "20102616",
          js_type: "1",
          pt_uistyle: "40",
          aid: "716027609",
          daid: "383",
          pt_3rd_aid: "100497308",
          has_onekey: "1",
        }).toString(),
        undefined,
        undefined,
        undefined,
        { headers: { Referer: "https://xui.ptlogin2.qq.com/", Cookie: cookieHeader({ qrsig: qrcode.identifier }) } });
      const text = await (resp as Response).text();
      // Parse ptuiCB response
      const match = text.match(/ptuiCB\((.*)\)/);
      if (!match) return new QRLoginResult(QRCodeLoginEvents.TIMEOUT);
      const args = Array.from(match[1].matchAll(/'([^']*)'/g)).map((item) => item[1]);
      const code = parseInt(args[0] || "", 10);
      if (code === 0) {
        // Parse uin and sigx for QQ auth
        const redirect = args[2] || "";
        const uin = redirect.match(/[?&]uin=([^&]+)/)?.[1] || "";
        const sigx = redirect.match(/[?&]ptsigx=([^&]+)/)?.[1] || "";
        if (!uin || !sigx) return new QRLoginResult(QRCodeLoginEvents.TIMEOUT);
        return await this._authorizeQQQR(uin, sigx);
      }
      if (code === 66) return new QRLoginResult(QRCodeLoginEvents.SCAN);
      if (code === 67) return new QRLoginResult(QRCodeLoginEvents.CONF);
      if (code === 65) return new QRLoginResult(QRCodeLoginEvents.TIMEOUT);
      return new QRLoginResult(QRCodeLoginEvents.REFUSE);
    }
    // WeChat
    const resp = await this._request("GET",
      `https://lp.open.weixin.qq.com/connect/l/qrconnect?uuid=${qrcode.identifier}&_=${Date.now()}`);
    const text = await (resp as Response).text();
    const errCode = text.match(/wx_errcode=(\d+)/)?.[1];
    if (errCode === "405") return new QRLoginResult(QRCodeLoginEvents.DONE,
      await this._authorizeWxQR(text.match(/wx_code=([^&]+)/)?.[1] || ""));
    if (errCode === "408") return new QRLoginResult(QRCodeLoginEvents.SCAN);
    if (errCode === "404") return new QRLoginResult(QRCodeLoginEvents.CONF);
    return new QRLoginResult(QRCodeLoginEvents.TIMEOUT);
  }

  /** 发送手机验证码 */
  sendAuthcode(phone: string, countryCode: string = "+86"): Request {
    return this._buildRequest({
      module: "music.login.LoginServer",
      method: "SendPhoneAuthCode",
      param: { tmeAppid: "qqmusic", areaCode: countryCode, phoneNo: phone },
      comm: { tmeLoginMethod: 3 },
      platform: Platform.ANDROID,
    }) as Request;
  }

  /** 手机验证码登录 */
  phoneAuthorize(phone: string, authCode: string): Request {
    return this._buildRequest({
      module: "music.login.LoginServer",
      method: "Login",
      param: { code: authCode, loginMode: 1, phoneNo: phone },
      comm: { tmeLoginMethod: 3, tmeLoginType: 0 },
      platform: Platform.ANDROID,
    }) as Request;
  }

  // ─── Internal QR auth methods ───────────────────────────

  private async _authorizeQQQR(uin: string, sigx: string): Promise<QRLoginResult> {
    try {
      // Step 1: check_sig
      const checkResp = await this._request("GET",
        "https://ssl.ptlogin2.graph.qq.com/check_sig?" + new URLSearchParams({
          uin,
          pttype: "1",
          service: "ptqrlogin",
          nodirect: "0",
          ptsigx: sigx,
          s_url: "https://graph.qq.com/oauth2.0/login_jump",
          ptlang: "2052",
          ptredirect: "100",
          aid: "716027609",
          daid: "383",
          j_later: "0",
          low_login_hour: "0",
          regmaster: "0",
          pt_login_type: "3",
          pt_aid: "0",
          pt_aaid: "16",
          pt_light: "0",
          pt_3rd_aid: "100497308",
        }).toString(),
        undefined,
        undefined,
        undefined,
        { headers: { Referer: "https://xui.ptlogin2.qq.com/" }, redirect: "manual" });
      const checkHeaders = (checkResp as Response).headers;
      const pSkey = setCookieValue(checkHeaders, "p_skey");
      if (!pSkey) return new QRLoginResult(QRCodeLoginEvents.CONF, null, "QQ 授权失败: 获取 p_skey 失败");
      const authCookie = setCookiesToCookieHeader(checkHeaders);

      // Step 2: OAuth authorize
      const body = new URLSearchParams({
        response_type: "code",
        client_id: "100497308",
        redirect_uri: "https://y.qq.com/portal/wx_redirect.html?login_type=1&surl=https://y.qq.com/",
        scope: "get_user_info,get_app_friends",
        state: "state",
        switch: "",
        from_ptlogin: "1",
        src: "1",
        update_auth: "1",
        openapi: "1010_1030",
        g_tk: String(hash33(pSkey, 5381)),
        auth_time: String(Date.now()),
        ui: crypto.randomUUID(),
      });
      const authResp = await this._request("POST",
        "https://graph.qq.com/oauth2.0/authorize",
        undefined,
        undefined,
        undefined,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Referer: "https://graph.qq.com/oauth2.0/show",
            Cookie: authCookie,
          },
          body,
          redirect: "manual",
        });
      const location = (authResp as Response).headers.get("location") || "";
      const code = location.match(/[?&]code=([^&]+)/)?.[1] || "";
      if (!code) return new QRLoginResult(QRCodeLoginEvents.CONF, null, "QQ 授权失败: 获取 OAuth code 失败");

      // Step 3: QQConnect login
      const result = await this._buildRequest({
        module: "QQConnectLogin.LoginServer", method: "QQLogin",
        param: { code },
        comm: { tmeLoginType: 2 },
      });
      const cred = new Credential(result as Record<string, unknown>);
      return new QRLoginResult(QRCodeLoginEvents.DONE, cred);
    } catch (err: any) {
      return new QRLoginResult(QRCodeLoginEvents.CONF, null, err?.message ? `QQ 授权失败: ${err.message}` : "QQ 授权失败");
    }
  }

  private async _authorizeWxQR(code: string): Promise<Credential> {
    const result = await this._buildRequest({
      module: "music.login.LoginServer", method: "Login",
      param: { code, strAppid: "wx48db31d50e334801" },
      comm: { tmeLoginType: 1 },
    });
    return new Credential(result as Record<string, unknown>);
  }
}
