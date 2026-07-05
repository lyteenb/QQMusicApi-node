/** QIMEI 设备ID 获取与缓存 */

import crypto from "node:crypto";
import type { Device } from "./device.js";
import type { DeviceManager } from "./device.js";
import { calcMd5 } from "./common.js";

const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDEIxgwoutfwoJxcGQeedgP7FG9qaIuS0qzfR8gWkrkTZKM2iWHn2ajQpBRZjMSoSf6+KJGvar2ORhBfpDXyVtZCKpqLQ+FLkpncClKVIrBwv6PHyUvuCb0rIarmgDnzkfQAqVufEtR64iazGDKatvJ9y6B9NMbHddGSAUmRTCrHQIDAQAB
-----END PUBLIC KEY-----`;

const SECRET = "ZdJqM15EeO2zWc08";
const APP_KEY = "0AND0HD6FE4HY80F";
const CHANNEL_ID = "10003505";
const PACKAGE_ID = "com.tencent.qqmusic";
const HEX_CHARS = "0123456789abcdef";
const QIMEI_URL = "https://api.tencentmusic.com/tme/trpc/proxy";

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface QimeiResult {
  q16: string;
  q36: string;
}

function randomHex(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}

function randomBeaconId(): string {
  const now = Date.now();
  // Generate 40-segment Beacon ID similar to Python's random_beacon_id
  const parts: string[] = [];
  for (let i = 0; i < 40; i++) {
    parts.push(
      `k${i}:${randomHex(8)}.t:${now}.p:${Math.floor(Math.random() * 100)}`,
    );
  }
  return parts.join(";");
}

function rsaEncrypt(content: Buffer): Buffer {
  return crypto.publicEncrypt(
    {
      key: PUBLIC_KEY_PEM,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    content,
  );
}

function aesEncrypt(key: Buffer, content: Buffer): Buffer {
  const iv = key; // Key as IV (matching QQ Music's implementation)
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(content), cipher.final()]);
}

function randomPayloadByDevice(
  device: Device,
  version: string,
  sdkVersion: string,
): Record<string, unknown> {
  const now = Math.floor(Date.now() / 1000);
  return {
    appKey: APP_KEY,
    channelId: CHANNEL_ID,
    packageId: PACKAGE_ID,
    platformId: 1,
    sdkVersion,
    appVersion: version,
    beaconIdSrc: randomBeaconId(),
    brand: device.brand,
    model: device.model,
    osVersion: `Android ${device.version.release},level ${device.version.sdk}`,
    imei: device.imei,
    androidId: device.androidId,
    mac: device.macAddress,
    networkType: "wifi",
    oaid: "",
    oaidVer: "",
    // Reserved fields
    harmonyOs: 0,
    cloneFlag: 0,
    kelongFlag: 0,
    // Server specs
    manufacturer: device.brand,
    deviceType: "PHONE",
    sdkName: "",
    romVersion: device.display,
  };
}

function buildQimeiRequest(
  device: Device,
  version: string,
  sdkVersion: string,
): { headers: Record<string, string>; body: Buffer } {
  const payload = randomPayloadByDevice(device, version, sdkVersion);
  const payloadJson = JSON.stringify(payload);

  // Generate random AES key (16 bytes)
  const aesKey = crypto.randomBytes(16);

  // RSA encrypt the AES key
  const encryptedKey = rsaEncrypt(aesKey);

  // AES encrypt the payload
  const encryptedPayload = aesEncrypt(aesKey, Buffer.from(payloadJson, "utf-8"));

  // Build the request body
  const body = {
    cipherText: encryptedPayload.toString("base64"),
    encryptKey: encryptedKey.toString("base64"),
  };
  const bodyJson = JSON.stringify(body);

  // Build headers with sign similar to Python
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomHex(16);
  const signStr = `${APP_KEY}${timestamp}${nonce}${SECRET}`;
  const sign = calcMd5(signStr);

  return {
    headers: {
      "Content-Type": "application/json",
      "qimei-appid": "qimei_qq_android",
      "qimei-timestamp": timestamp,
      "qimei-nonce": nonce,
      "qimei-sign": sign,
    },
    body: Buffer.from(bodyJson, "utf-8"),
  };
}

export class QimeiManager {
  private deviceStore: DeviceManager;
  private appVersion: string;
  private sdkVersion: string;
  private cached: QimeiResult | null = null;
  private cacheTime: number = 0;
  private fetchPromise: Promise<QimeiResult> | null = null;

  constructor(deviceStore: DeviceManager, appVersion: string, sdkVersion: string) {
    this.deviceStore = deviceStore;
    this.appVersion = appVersion;
    this.sdkVersion = sdkVersion;
  }

  private isExpired(): boolean {
    return Date.now() - this.cacheTime >= CACHE_TTL;
  }

  async getCached(): Promise<QimeiResult | null> {
    if (this.cached && !this.isExpired()) return this.cached;

    // Double-checked locking via promise
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = this._requestQimei();
    try {
      const result = await this.fetchPromise;
      this.cached = result;
      this.cacheTime = Date.now();
      return result;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async _requestQimei(): Promise<QimeiResult> {
    const device = await this.deviceStore.getDevice();
    const { headers, body } = buildQimeiRequest(device, this.appVersion, this.sdkVersion);

    const response = await fetch(QIMEI_URL, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      throw new Error(`QIMEI request failed: ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;
    const q16 = (data.q16 ?? data.qimei ?? "") as string;
    const q36 = (data.q36 ?? data.qimei36 ?? "") as string;

    if (q16 && q36) {
      await this.deviceStore.applyQimei(q16, q36);
    }

    return { q16, q36 };
  }
}
