/** Pydantic 验证器等价 Zod transforms */

import { z } from "zod";

export const NoneToEmptyList = z.preprocess(
  (val) => val ?? [],
  z.array(z.unknown()),
);

export const NoneToEmptyDict = z.preprocess(
  (val) => val ?? {},
  z.record(z.string(), z.unknown()),
);

export const NoneToZero = z.preprocess(
  (val) => (val === null || val === undefined ? 0 : val),
  z.number(),
);
