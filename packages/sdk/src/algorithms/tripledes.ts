/**
 * QRC 解密模块中的 Triple-DES 自定义实现
 *
 * 该模块包含了一个与标准 Triple-DES 密钥扩展略有不同的自定义加密/解密实现，
 * 用于兼容 QQ 音乐 QRC 歌词解密中所使用的特定 3DES 变体。
 *
 * 逐行移植自 Python: qqmusic_api/algorithms/tripledes.py
 */

// ─── Constants ─────────────────────────────────────────────

const ENCRYPT = 1;
const DECRYPT = 0;

// 8 S-boxes, each 64 entries
const sbox: number[][] = [
  // sbox1
  [
    14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10,
    6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12,
    8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13,
  ],
  // sbox2
  [
    15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 15, 12,
    0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8,
    10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9,
  ],
  // sbox3
  [
    10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8,
    5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13,
    0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12,
  ],
  // sbox4
  [
    7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7,
    2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0,
    6, 10, 10, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14,
  ],
  // sbox5
  [
    2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5,
    0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8,
    12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3,
  ],
  // sbox6
  [
    12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6,
    1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2,
    12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13,
  ],
  // sbox7
  [
    4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14,
    3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11,
    13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12,
  ],
  // sbox8
  [
    13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12,
    5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14,
    7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11,
  ],
];

// ─── DES Primitives ────────────────────────────────────────

/** 对输入整数进行位运算，重新组合位 */
function sboxBit(a: number): number {
  return (((a & 32) | ((a & 31) >> 1) | ((a & 1) << 4)) >>> 0);
}

/** 初始置换 */
function initialPermutation(inputData: Uint8Array): [number, number] {
  const v0 = (inputData[0] | (inputData[1] << 8) | (inputData[2] << 16) | (inputData[3] << 24)) >>> 0;
  const v1 = (inputData[4] | (inputData[5] << 8) | (inputData[6] << 16) | (inputData[7] << 24)) >>> 0;

  const s0 = (
    ((v1 >> 6) & 1) << 31 |
    ((v1 >> 14) & 1) << 30 |
    ((v1 >> 22) & 1) << 29 |
    ((v1 >> 30) & 1) << 28 |
    ((v0 >> 6) & 1) << 27 |
    ((v0 >> 14) & 1) << 26 |
    ((v0 >> 22) & 1) << 25 |
    ((v0 >> 30) & 1) << 24 |
    ((v1 >> 4) & 1) << 23 |
    ((v1 >> 12) & 1) << 22 |
    ((v1 >> 20) & 1) << 21 |
    ((v1 >> 28) & 1) << 20 |
    ((v0 >> 4) & 1) << 19 |
    ((v0 >> 12) & 1) << 18 |
    ((v0 >> 20) & 1) << 17 |
    ((v0 >> 28) & 1) << 16 |
    ((v1 >> 2) & 1) << 15 |
    ((v1 >> 10) & 1) << 14 |
    ((v1 >> 18) & 1) << 13 |
    ((v1 >> 26) & 1) << 12 |
    ((v0 >> 2) & 1) << 11 |
    ((v0 >> 10) & 1) << 10 |
    ((v0 >> 18) & 1) << 9 |
    ((v0 >> 26) & 1) << 8 |
    ((v1 >> 0) & 1) << 7 |
    ((v1 >> 8) & 1) << 6 |
    ((v1 >> 16) & 1) << 5 |
    ((v1 >> 24) & 1) << 4 |
    ((v0 >> 0) & 1) << 3 |
    ((v0 >> 8) & 1) << 2 |
    ((v0 >> 16) & 1) << 1 |
    ((v0 >> 24) & 1)
  ) >>> 0;

  const s1 = (
    ((v1 >> 7) & 1) << 31 |
    ((v1 >> 15) & 1) << 30 |
    ((v1 >> 23) & 1) << 29 |
    ((v1 >> 31) & 1) << 28 |
    ((v0 >> 7) & 1) << 27 |
    ((v0 >> 15) & 1) << 26 |
    ((v0 >> 23) & 1) << 25 |
    ((v0 >> 31) & 1) << 24 |
    ((v1 >> 5) & 1) << 23 |
    ((v1 >> 13) & 1) << 22 |
    ((v1 >> 21) & 1) << 21 |
    ((v1 >> 29) & 1) << 20 |
    ((v0 >> 5) & 1) << 19 |
    ((v0 >> 13) & 1) << 18 |
    ((v0 >> 21) & 1) << 17 |
    ((v0 >> 29) & 1) << 16 |
    ((v1 >> 3) & 1) << 15 |
    ((v1 >> 11) & 1) << 14 |
    ((v1 >> 19) & 1) << 13 |
    ((v1 >> 27) & 1) << 12 |
    ((v0 >> 3) & 1) << 11 |
    ((v0 >> 11) & 1) << 10 |
    ((v0 >> 19) & 1) << 9 |
    ((v0 >> 27) & 1) << 8 |
    ((v1 >> 1) & 1) << 7 |
    ((v1 >> 9) & 1) << 6 |
    ((v1 >> 17) & 1) << 5 |
    ((v1 >> 25) & 1) << 4 |
    ((v0 >> 1) & 1) << 3 |
    ((v0 >> 9) & 1) << 2 |
    ((v0 >> 17) & 1) << 1 |
    ((v0 >> 25) & 1)
  ) >>> 0;

  return [s0, s1];
}

/** 逆初始置换 */
function inversePermutation(s0: number, s1: number): Uint8Array {
  const data = new Uint8Array(8);
  data[3] = (((s1 >> 24) & 1) << 7 | ((s0 >> 24) & 1) << 6 | ((s1 >> 16) & 1) << 5 | ((s0 >> 16) & 1) << 4 | ((s1 >> 8) & 1) << 3 | ((s0 >> 8) & 1) << 2 | ((s1 >> 0) & 1) << 1 | ((s0 >> 0) & 1));
  data[2] = (((s1 >> 25) & 1) << 7 | ((s0 >> 25) & 1) << 6 | ((s1 >> 17) & 1) << 5 | ((s0 >> 17) & 1) << 4 | ((s1 >> 9) & 1) << 3 | ((s0 >> 9) & 1) << 2 | ((s1 >> 1) & 1) << 1 | ((s0 >> 1) & 1));
  data[1] = (((s1 >> 26) & 1) << 7 | ((s0 >> 26) & 1) << 6 | ((s1 >> 18) & 1) << 5 | ((s0 >> 18) & 1) << 4 | ((s1 >> 10) & 1) << 3 | ((s0 >> 10) & 1) << 2 | ((s1 >> 2) & 1) << 1 | ((s0 >> 2) & 1));
  data[0] = (((s1 >> 27) & 1) << 7 | ((s0 >> 27) & 1) << 6 | ((s1 >> 19) & 1) << 5 | ((s0 >> 19) & 1) << 4 | ((s1 >> 11) & 1) << 3 | ((s0 >> 11) & 1) << 2 | ((s1 >> 3) & 1) << 1 | ((s0 >> 3) & 1));
  data[7] = (((s1 >> 28) & 1) << 7 | ((s0 >> 28) & 1) << 6 | ((s1 >> 20) & 1) << 5 | ((s0 >> 20) & 1) << 4 | ((s1 >> 12) & 1) << 3 | ((s0 >> 12) & 1) << 2 | ((s1 >> 4) & 1) << 1 | ((s0 >> 4) & 1));
  data[6] = (((s1 >> 29) & 1) << 7 | ((s0 >> 29) & 1) << 6 | ((s1 >> 21) & 1) << 5 | ((s0 >> 21) & 1) << 4 | ((s1 >> 13) & 1) << 3 | ((s0 >> 13) & 1) << 2 | ((s1 >> 5) & 1) << 1 | ((s0 >> 5) & 1));
  data[5] = (((s1 >> 30) & 1) << 7 | ((s0 >> 30) & 1) << 6 | ((s1 >> 22) & 1) << 5 | ((s0 >> 22) & 1) << 4 | ((s1 >> 14) & 1) << 3 | ((s0 >> 14) & 1) << 2 | ((s1 >> 6) & 1) << 1 | ((s0 >> 6) & 1));
  data[4] = (((s1 >> 31) & 1) << 7 | ((s0 >> 31) & 1) << 6 | ((s1 >> 23) & 1) << 5 | ((s0 >> 23) & 1) << 4 | ((s1 >> 15) & 1) << 3 | ((s0 >> 15) & 1) << 2 | ((s1 >> 7) & 1) << 1 | ((s0 >> 7) & 1));
  return data;
}

/** Triple-DES F函数 */
function f(state: number, key: number[]): number {
  const t1 = (
    ((state & 1) << 31) |
    ((state & 0xF8000000) >>> 1) |
    ((state & 0x1F800000) >>> 3) |
    ((state & 0x01F80000) >>> 5) |
    ((state & 0x001F8000) >>> 7)
  ) >>> 0;

  const t2 = (
    ((state & 0x0001F800) << 15) |
    ((state & 0x00001F80) << 13) |
    ((state & 0x000001F8) << 11) |
    ((state & 0x0000001F) << 9) |
    ((state & 0x80000000) >>> 23)
  ) >>> 0;

  const k0 = ((t1 >>> 24) & 0xFF) ^ key[0];
  const k1 = ((t1 >>> 16) & 0xFF) ^ key[1];
  const k2 = ((t1 >>> 8) & 0xFF) ^ key[2];
  const k3 = ((t2 >>> 24) & 0xFF) ^ key[3];
  const k4 = ((t2 >>> 16) & 0xFF) ^ key[4];
  const k5 = ((t2 >>> 8) & 0xFF) ^ key[5];

  let newState = (
    (sbox[0][sboxBit(k0 >>> 2)] << 28) |
    (sbox[1][sboxBit(((k0 & 0x03) << 4) | (k1 >>> 4))] << 24) |
    (sbox[2][sboxBit(((k1 & 0x0F) << 2) | (k2 >>> 6))] << 20) |
    (sbox[3][sboxBit(k2 & 0x3F)] << 16) |
    (sbox[4][sboxBit(k3 >>> 2)] << 12) |
    (sbox[5][sboxBit(((k3 & 0x03) << 4) | (k4 >>> 4))] << 8) |
    (sbox[6][sboxBit(((k4 & 0x0F) << 2) | (k5 >>> 6))] << 4) |
    sbox[7][sboxBit(k5 & 0x3F)]
  ) >>> 0;

  return (
    ((newState >>> 16) & 1) << 31 |
    ((newState >>> 25) & 1) << 30 |
    ((newState >>> 12) & 1) << 29 |
    ((newState >>> 11) & 1) << 28 |
    ((newState >>> 3) & 1) << 27 |
    ((newState >>> 20) & 1) << 26 |
    ((newState >>> 4) & 1) << 25 |
    ((newState >>> 15) & 1) << 24 |
    ((newState >>> 31) & 1) << 23 |
    ((newState >>> 17) & 1) << 22 |
    ((newState >>> 9) & 1) << 21 |
    ((newState >>> 6) & 1) << 20 |
    ((newState >>> 27) & 1) << 19 |
    ((newState >>> 14) & 1) << 18 |
    ((newState >>> 1) & 1) << 17 |
    ((newState >>> 22) & 1) << 16 |
    ((newState >>> 30) & 1) << 15 |
    ((newState >>> 24) & 1) << 14 |
    ((newState >>> 8) & 1) << 13 |
    ((newState >>> 18) & 1) << 12 |
    ((newState >>> 0) & 1) << 11 |
    ((newState >>> 5) & 1) << 10 |
    ((newState >>> 29) & 1) << 9 |
    ((newState >>> 23) & 1) << 8 |
    ((newState >>> 13) & 1) << 7 |
    ((newState >>> 19) & 1) << 6 |
    ((newState >>> 2) & 1) << 5 |
    ((newState >>> 26) & 1) << 4 |
    ((newState >>> 10) & 1) << 3 |
    ((newState >>> 21) & 1) << 2 |
    ((newState >>> 28) & 1) << 1 |
    ((newState >>> 7) & 1)
  ) >>> 0;
}

/** DES加密/解密块操作 */
function crypt(inputData: Uint8Array, key: number[][]): Uint8Array {
  let [s0, s1] = initialPermutation(inputData);

  for (let idx = 0; idx < 15; idx++) {
    const previousS1 = s1;
    s1 = (f(s1, key[idx]) ^ s0) >>> 0;
    s0 = previousS1;
  }
  s0 = (f(s1, key[15]) ^ s0) >>> 0;

  return inversePermutation(s0, s1);
}

/** DES密钥扩展算法（包含自定义的 PC-2 偏移量 Bug） */
function keySchedule(key: Uint8Array, mode: number): number[][] {
  const schedule: number[][] = Array.from({ length: 16 }, () => [0, 0, 0, 0, 0, 0]);
  const keyRndShift = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
  const keyPermC = [
    56, 48, 40, 32, 24, 16, 8, 0, 57, 49, 41, 33, 25, 17,
    9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35,
  ];
  const keyPermD = [
    62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21,
    13, 5, 60, 52, 44, 36, 28, 20, 12, 4, 27, 19, 11, 3,
  ];
  const keyCompression = [
    13, 16, 10, 23, 0, 4, 2, 27, 14, 5, 20, 9, 22, 18, 11, 3,
    25, 7, 15, 6, 26, 19, 12, 1, 40, 51, 30, 36, 46, 54, 29, 39,
    50, 44, 32, 47, 43, 48, 38, 55, 33, 52, 45, 41, 49, 35, 28, 31,
  ];

  let v0 = (key[0] | (key[1] << 8) | (key[2] << 16) | (key[3] << 24)) >>> 0;
  let v1 = (key[4] | (key[5] << 8) | (key[6] << 16) | (key[7] << 24)) >>> 0;

  // Build c - PC-1 left half
  let c = 0;
  for (let i = 0; i < keyPermC.length; i++) {
    const b = keyPermC[i];
    const bit = b < 32 ? ((v0 >>> (31 - b)) & 1) : ((v1 >>> (63 - b)) & 1);
    c |= bit << (31 - i);
  }
  c = c >>> 0;

  // Build d - PC-1 right half
  let d = 0;
  for (let i = 0; i < keyPermD.length; i++) {
    const b = keyPermD[i];
    const bit = b < 32 ? ((v0 >>> (31 - b)) & 1) : ((v1 >>> (63 - b)) & 1);
    d |= bit << (31 - i);
  }
  d = d >>> 0;

  for (let i = 0; i < 16; i++) {
    c = ((c << keyRndShift[i]) | (c >>> (28 - keyRndShift[i]))) & 0xFFFFFFF0;
    d = ((d << keyRndShift[i]) | (d >>> (28 - keyRndShift[i]))) & 0xFFFFFFF0;

    const togen = mode === DECRYPT ? (15 - i) : i;

    for (let j = 0; j < 6; j++) {
      schedule[togen][j] = 0;
    }

    for (let j = 0; j < 24; j++) {
      const bit = (c >>> (31 - keyCompression[j])) & 1;
      schedule[togen][Math.floor(j / 8)] |= bit << (7 - (j % 8));
    }

    // CRITICAL: PC-2 offset bug — subtracts 27 from index for D half
    for (let j = 24; j < 48; j++) {
      const bit = (d >>> (31 - (keyCompression[j] - 27))) & 1;
      schedule[togen][Math.floor(j / 8)] |= bit << (7 - (j % 8));
    }
  }

  return schedule;
}

/** TripleDES密钥设置 */
function tripledesKeySetup(key: Uint8Array, mode: number): number[][][] {
  if (mode === ENCRYPT) {
    return [
      keySchedule(key.slice(0, 8), ENCRYPT),
      keySchedule(key.slice(8, 16), DECRYPT),
      keySchedule(key.slice(16, 24), ENCRYPT),
    ];
  }
  return [
    keySchedule(key.slice(16, 24), DECRYPT),
    keySchedule(key.slice(8, 16), ENCRYPT),
    keySchedule(key.slice(0, 8), DECRYPT),
  ];
}

/** TripleDES加密/解密算法（单块 8 字节） */
export function tripledesCrypt(data: Uint8Array, key: number[][][]): Uint8Array {
  let result = new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  for (let i = 0; i < 3; i++) {
    result = crypt(result, key[i]);
  }
  return result;
}

/**
 * QRC 歌词解密 — 完整流程
 * 使用内置的 qrc_key + 3DES 解密 + zlib 解压
 */
import zlib from "node:zlib";

const QRC_KEY = Buffer.from("!@#)(*$%123ZXC!@!@#)(NHL", "utf-8");

/**
 * 解密 QRC 加密的歌词数据
 * @param encryptedQrc - 加密数据 (hex 字符串, Buffer, 或 Uint8Array)
 * @returns 解密后的 UTF-8 歌词文本
 */
export function qrcDecrypt(encryptedQrc: string | Buffer | Uint8Array): string {
  let rawBytes: Uint8Array;

  if (typeof encryptedQrc === "string") {
    rawBytes = new Uint8Array(Buffer.from(encryptedQrc, "hex"));
  } else if (Buffer.isBuffer(encryptedQrc)) {
    rawBytes = new Uint8Array(encryptedQrc);
  } else {
    rawBytes = encryptedQrc;
  }

  // Setup 3DES key schedule for DED (decrypt) mode
  const keys = tripledesKeySetup(new Uint8Array(QRC_KEY), DECRYPT);

  // Decrypt in 8-byte blocks
  const decryptedBlocks: Buffer[] = [];
  for (let i = 0; i < rawBytes.length; i += 8) {
    const block = rawBytes.slice(i, i + 8);
    if (block.length < 8) {
      // Pad last block with zeros
      const padded = new Uint8Array(8);
      padded.set(block);
      const result = tripledesCrypt(padded, keys);
      decryptedBlocks.push(Buffer.from(result.slice(0, block.length)));
    } else {
      const result = tripledesCrypt(block, keys);
      decryptedBlocks.push(Buffer.from(result));
    }
  }

  const decrypted = Buffer.concat(decryptedBlocks);

  // zlib decompress
  return zlib.inflateSync(decrypted).toString("utf-8");
}
