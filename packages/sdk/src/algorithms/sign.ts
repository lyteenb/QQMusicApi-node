/** zzc 签名算法实现 */

import crypto from "node:crypto";

const PART_1_INDEXES = [23, 14, 6, 36, 16, 7, 19];
const PART_2_INDEXES = [16, 1, 32, 12, 19, 27, 8, 5];
const SCRAMBLE_VALUES = [
  89, 39, 179, 150, 218, 82, 58, 252, 177, 52,
  186, 123, 120, 64, 242, 133, 143, 161, 121, 179,
];

/**
 * 计算 QQ 音乐客户端请求的 zzc 签名
 */
export function zzcSign(payload: string | Buffer): string {
  const payloadBytes = typeof payload === "string" ? Buffer.from(payload, "utf-8") : payload;
  const hashHex = crypto.createHash("sha1").update(payloadBytes).digest("hex").toUpperCase();

  const part1 = PART_1_INDEXES.map((i) => hashHex[i]).join("");
  const part2 = PART_2_INDEXES.map((i) => hashHex[i]).join("");

  const part3 = Buffer.alloc(20);
  for (let i = 0; i < SCRAMBLE_VALUES.length; i++) {
    const value = SCRAMBLE_VALUES[i] ^ parseInt(hashHex.substring(i * 2, i * 2 + 2), 16);
    part3[i] = value;
  }

  const b64Part = part3.toString("base64").replace(/[\\\/+=]/g, "");
  return `zzc${part1}${b64Part}${part2}`.toLowerCase();
}
