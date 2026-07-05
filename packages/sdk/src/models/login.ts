/** 登录状态模型 */

import type { Credential } from "./request.js";

export enum QRCodeLoginEvents {
  DONE = 0,
  SCAN = 66,
  CONF = 67,
  TIMEOUT = 65,
  REFUSE = 68,
}

export enum PhoneLoginEvents {
  SEND = 0,
  CAPTCHA = 20276,
  FREQUENCY = 100001,
}

export type QRLoginType = "qq" | "wx" | "mobile";

export class QR {
  data: Uint8Array;
  qrType: QRLoginType;
  mimetype: string;
  identifier: string;

  constructor(data: Uint8Array, qrType: QRLoginType, mimetype: string, identifier: string) {
    this.data = data;
    this.qrType = qrType;
    this.mimetype = mimetype;
    this.identifier = identifier;
  }
}

export class QRLoginResult {
  event: QRCodeLoginEvents;
  credential: Credential | null;
  message: string;

  constructor(event: QRCodeLoginEvents, credential: Credential | null = null, message: string = "") {
    this.event = event;
    this.credential = credential;
    this.message = message;
  }

  get done(): boolean {
    return this.event === QRCodeLoginEvents.DONE && this.credential !== null;
  }
}

export class PhoneAuthCodeResult {
  event: PhoneLoginEvents;
  info: string | null;

  constructor(event: PhoneLoginEvents, info: string | null = null) {
    this.event = event;
    this.info = info;
  }
}

export type QRLoginStream = AsyncGenerator<QRLoginResult, void, undefined>;
