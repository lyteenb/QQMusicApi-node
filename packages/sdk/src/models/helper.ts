/** COS 上传辅助模型 */
import { z } from "zod";
import { baseModel } from "./request.js";

export const UploadBucketInfo = baseModel({
  bucket: z.string().default(""), region: z.string().default(""), appid: z.string().default(""),
});

export const UploadFileInfo = baseModel({
  sha1: z.string().default(""), key: z.string().default(""),
  cos_path: z.string().default(""), upload_url: z.string().default(""),
});

export const UploadAuthInfo = baseModel({
  SecretID: z.string().default(""), SecretKey: z.string().default(""),
  Token: z.string().default(""), StartTime: z.string().default(""), ExpiredTime: z.string().default(""),
});

export const InitUploadResponse = baseModel({
  bucket: UploadBucketInfo.default({}), files: z.array(UploadFileInfo).default([]), auth: UploadAuthInfo.default({}),
});

export const UploadStorage = baseModel({
  storage_id: z.string().default(""), bucket: z.string().default(""), region: z.string().default(""),
});

export const UploadUrlInfo = baseModel({
  file_id: z.string().default(""), URL: z.string().default(""),
  CDNURL: z.string().default(""), PresignedURL: z.string().default(""), InternalURL: z.string().default(""),
});

export const UploadObjectInfo = baseModel({
  url: UploadUrlInfo.default({}), file_id: z.string().default(""),
});

export const FinishUploadResponse = baseModel({
  results: z.array(z.unknown()).default([]),
});
