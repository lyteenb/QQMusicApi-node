/** 请求版本策略中心 */

import type { Credential } from "../models/request.js";
import type { Device } from "../utils/device.js";
import { hash33 } from "../utils/common.js";

export enum Platform {
  ANDROID = "android",
  DESKTOP = "desktop",
  WEB = "web",
}

export interface VersionProfile {
  ct: number;
  cv: number;
  v?: number;
  platform?: string;
  uaVersion?: number;
  qimeiAppVersion?: string;
  qimeiSdkVersion?: string;
}

/**
 * CommonParams 的构建结果
 */
export type CommParamsMap = Record<string, unknown>;

export class VersionPolicy {
  android: VersionProfile;
  desktop: VersionProfile;
  web: VersionProfile;
  private _commCache: Map<string, CommParamsMap> = new Map();

  constructor(android: VersionProfile, desktop: VersionProfile, web: VersionProfile) {
    this.android = android;
    this.desktop = desktop;
    this.web = web;
  }

  getProfile(platform: Platform): VersionProfile {
    switch (platform) {
      case Platform.ANDROID:
        return this.android;
      case Platform.DESKTOP:
        return this.desktop;
      default:
        return this.web;
    }
  }

  buildComm(
    platform: Platform,
    credential: Credential,
    device: Device,
    qimei: { q16: string; q36: string } | null,
    guid: string,
  ): CommParamsMap {
    const profile = this.getProfile(platform);
    let params: Record<string, string | number | null | undefined>;

    if (platform === Platform.ANDROID) {
      params = {
        ct: profile.ct,
        cv: profile.cv,
        v: profile.v,
        tmeAppID: "qqmusic",
        chid: "10003505",
        qq: credential.musicid ? String(credential.musicid) : undefined,
        authst: credential.musickey || undefined,
        tmeLoginType: credential.loginType || undefined,
        QIMEI: qimei?.q16 ?? "",
        QIMEI36: qimei?.q36 ?? "",
        OpenUDID: guid,
        OpenUDID2: guid,
        udid: guid,
        uid: device.sessionUid ?? undefined,
        sid: device.sessionSid ?? undefined,
        aid: device.androidId,
        os_ver: device.version.release,
        phonetype: device.model,
        devicelevel: String(device.version.sdk),
        newdevicelevel: String(device.version.sdk),
        rom: device.fingerprint,
      };
    } else if (platform === Platform.DESKTOP) {
      params = {
        ct: profile.ct,
        cv: profile.cv,
        platform: profile.platform,
        chid: "0",
        uin: credential.musicid || undefined,
        g_tk: VersionPolicy.getGTk(credential),
        guid: guid.toUpperCase(),
      };
    } else {
      const gTk = VersionPolicy.getGTk(credential);
      params = {
        ct: profile.ct,
        cv: profile.cv,
        platform: profile.platform,
        chid: "0",
        uin: credential.musicid,
        g_tk: gTk,
        g_tk_new_20200303: gTk,
        format: "json",
        inCharset: "utf-8",
        outCharset: "utf-8",
        notice: 0,
        need_new_code: 1,
      };
    }

    // Filter out undefined values (matching Python's `exclude_none=True`)
    const comm: CommParamsMap = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        comm[key] = value;
      }
    }

    return comm;
  }

  getUserAgent(platform: Platform, device: Device): string {
    const profile = this.getProfile(platform);
    if (platform === Platform.ANDROID) {
      const uaVersion = profile.uaVersion ?? profile.cv;
      return `QQMusic ${uaVersion}(android ${device.version.release})`;
    }
    return (
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
  }

  getQimeiAppVersion(): string {
    return this.android.qimeiAppVersion ?? "14.9.0.8";
  }

  getQimeiSdkVersion(): string {
    return this.android.qimeiSdkVersion ?? "1.2.13.6";
  }

  static getGTk(credential: Credential): number {
    if (credential.musickey) {
      return hash33(credential.musickey, 5381);
    }
    return 5381;
  }
}

export const DEFAULT_VERSION_POLICY = new VersionPolicy(
  {
    ct: 11,
    cv: 14090008,
    v: 14090008,
    uaVersion: 14090008,
    qimeiAppVersion: "14.9.0.8",
    qimeiSdkVersion: "1.2.13.6",
  },
  {
    ct: 19,
    cv: 2201,
  },
  {
    ct: 24,
    cv: 4747474,
    platform: "yqq.json",
  },
);
