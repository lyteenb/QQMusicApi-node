/** 虚拟设备信息构造与持久化管理 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * 生成满足标准 Luhn 校验的随机 IMEI 号码
 */
export function randomImei(): string {
  const digits: number[] = [];
  for (let i = 0; i < 14; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  let sum = 0;
  for (let idx = 0; idx < digits.length; idx++) {
    let checksumDigit = digits[idx];
    if (idx % 2 === 1) {
      checksumDigit *= 2;
      if (checksumDigit > 9) checksumDigit -= 9;
    }
    sum += checksumDigit;
  }
  const ctrlDigit = (10 - (sum % 10)) % 10;
  digits.push(ctrlDigit);
  return digits.join("");
}

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function randomIntStr(min: number, max: number): string {
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function randomLettersDigits(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/** 系统版本信息 */
export interface OSVersionData {
  incremental: string;
  release: string;
  codename: string;
  sdk: number;
}

export const DEFAULT_OS_VERSION: OSVersionData = {
  incremental: "5891938",
  release: "10",
  codename: "REL",
  sdk: 29,
};

/** 设备信息 */
export interface DeviceData {
  display: string;
  product: string;
  device: string;
  board: string;
  model: string;
  fingerprint: string;
  bootId: string;
  procVersion: string;
  imei: string;
  brand: string;
  bootloader: string;
  baseBand: string;
  version: OSVersionData;
  simInfo: string;
  osType: string;
  macAddress: string;
  wifiBssid: string;
  wifiSsid: string;
  imsiMd5: number[];
  androidId: string;
  apn: string;
  vendorName: string;
  vendorOsName: string;
  qimei: string | null;
  qimei36: string | null;
  qimeiSaveTime: number | null;
  sessionUid: string | null;
  sessionSid: string | null;
  sessionVkey: string | null;
  sessionSaveTime: number | null;
  openUdid: string;
}

function createDeviceData(): DeviceData {
  return {
    display: `QMAPI.${randomIntStr(100000, 999999)}.001`,
    product: "iarim",
    device: "sagit",
    board: "eomam",
    model: "MI 6",
    fingerprint: `xiaomi/iarim/sagit:10/eomam.200122.001/${randomIntStr(1000000, 9999999)}:user/release-keys`,
    bootId: crypto.randomUUID(),
    procVersion: `Linux 5.4.0-54-generic-${randomLettersDigits(8)} (android-build@google.com)`,
    imei: randomImei(),
    brand: "Xiaomi",
    bootloader: "U-boot",
    baseBand: "",
    version: { ...DEFAULT_OS_VERSION },
    simInfo: "T-Mobile",
    osType: "android",
    macAddress: "00:50:56:C0:00:08",
    wifiBssid: "00:50:56:C0:00:08",
    wifiSsid: "<unknown ssid>",
    imsiMd5: Array.from(crypto.randomBytes(16)),
    androidId: randomHex(8),
    apn: "wifi",
    vendorName: "MIUI",
    vendorOsName: "qmapi",
    qimei: null,
    qimei36: null,
    qimeiSaveTime: null,
    sessionUid: null,
    sessionSid: null,
    sessionVkey: null,
    sessionSaveTime: null,
    openUdid: randomHex(16),
  };
}

export class Device {
  display: string;
  product: string;
  device: string;
  board: string;
  model: string;
  fingerprint: string;
  bootId: string;
  procVersion: string;
  imei: string;
  brand: string;
  bootloader: string;
  baseBand: string;
  version: OSVersionData;
  simInfo: string;
  osType: string;
  macAddress: string;
  wifiBssid: string;
  wifiSsid: string;
  imsiMd5: number[];
  androidId: string;
  apn: string;
  vendorName: string;
  vendorOsName: string;
  qimei: string | null;
  qimei36: string | null;
  qimeiSaveTime: number | null;
  sessionUid: string | null;
  sessionSid: string | null;
  sessionVkey: string | null;
  sessionSaveTime: number | null;
  openUdid: string;

  constructor(data?: Partial<DeviceData>) {
    const defaults = createDeviceData();
    const d = { ...defaults, ...data };
    this.display = d.display;
    this.product = d.product;
    this.device = d.device;
    this.board = d.board;
    this.model = d.model;
    this.fingerprint = d.fingerprint;
    this.bootId = d.bootId;
    this.procVersion = d.procVersion;
    this.imei = d.imei;
    this.brand = d.brand;
    this.bootloader = d.bootloader;
    this.baseBand = d.baseBand;
    this.version = d.version;
    this.simInfo = d.simInfo;
    this.osType = d.osType;
    this.macAddress = d.macAddress;
    this.wifiBssid = d.wifiBssid;
    this.wifiSsid = d.wifiSsid;
    this.imsiMd5 = d.imsiMd5;
    this.androidId = d.androidId;
    this.apn = d.apn;
    this.vendorName = d.vendorName;
    this.vendorOsName = d.vendorOsName;
    this.qimei = d.qimei;
    this.qimei36 = d.qimei36;
    this.qimeiSaveTime = d.qimeiSaveTime;
    this.sessionUid = d.sessionUid;
    this.sessionSid = d.sessionSid;
    this.sessionVkey = d.sessionVkey;
    this.sessionSaveTime = d.sessionSaveTime;
    this.openUdid = d.openUdid;
  }

  toJSON(): DeviceData {
    return {
      display: this.display,
      product: this.product,
      device: this.device,
      board: this.board,
      model: this.model,
      fingerprint: this.fingerprint,
      bootId: this.bootId,
      procVersion: this.procVersion,
      imei: this.imei,
      brand: this.brand,
      bootloader: this.bootloader,
      baseBand: this.baseBand,
      version: { ...this.version },
      simInfo: this.simInfo,
      osType: this.osType,
      macAddress: this.macAddress,
      wifiBssid: this.wifiBssid,
      wifiSsid: this.wifiSsid,
      imsiMd5: [...this.imsiMd5],
      androidId: this.androidId,
      apn: this.apn,
      vendorName: this.vendorName,
      vendorOsName: this.vendorOsName,
      qimei: this.qimei,
      qimei36: this.qimei36,
      qimeiSaveTime: this.qimeiSaveTime,
      sessionUid: this.sessionUid,
      sessionSid: this.sessionSid,
      sessionVkey: this.sessionVkey,
      sessionSaveTime: this.sessionSaveTime,
      openUdid: this.openUdid,
    };
  }
}

/** 管理单个 Client 的设备状态 */
export class DeviceManager {
  private _devicePath: string | null;
  private _device: Device | null = null;

  constructor(devicePath?: string | null) {
    this._devicePath = devicePath ?? null;
  }

  private async _loadDevice(filePath: string): Promise<Device> {
    try {
      await fs.access(filePath);
      const raw = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (data.version && typeof data.version === "object") {
        data.version = { ...DEFAULT_OS_VERSION, ...data.version };
      }
      return new Device(data);
    } catch {
      return new Device();
    }
  }

  private async _saveDevice(device: Device, filePath: string | null): Promise<void> {
    if (!filePath) return;
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(device.toJSON()));
  }

  private async _getCachedDevice(filePath: string | null): Promise<Device> {
    if (!filePath) return new Device();
    try {
      await fs.access(filePath);
      return await this._loadDevice(filePath);
    } catch {
      const device = new Device();
      await this._saveDevice(device, filePath);
      return device;
    }
  }

  async getDevice(): Promise<Device> {
    if (this._device) return this._device;
    this._device = await this._getCachedDevice(this._devicePath);
    return this._device;
  }

  async saveDevice(): Promise<void> {
    if (this._device) {
      await this._saveDevice(this._device, this._devicePath);
    }
  }

  async applyQimei(q16: string, q36: string): Promise<void> {
    const device = await this.getDevice();
    device.qimei = q16;
    device.qimei36 = q36;
    device.qimeiSaveTime = Math.floor(Date.now() / 1000);
    await this.saveDevice();
  }
}
