/** Web API 响应模型 */

import type { FastifyReply } from "fastify";

export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T | null;
}

export function successResponse<T>(data: T, msg: string = "ok"): ApiResponse<T> {
  return { code: 0, msg, data };
}

export function errorResponse(statusCode: number, msg: string) {
  return {
    statusCode,
    body: { code: -1, msg, data: null } satisfies ApiResponse,
    headers: {},
  };
}

export function cachedResponse(reply: FastifyReply, data: unknown, ttl: number) {
  return reply
    .header("Cache-Control", `public, max-age=${ttl}`)
    .header("ETag", `"${Date.now().toString(36)}"`)
    .send(successResponse(data));
}
