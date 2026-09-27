// TODO(setup): Generate FLAGS_SECRET (32 random bytes, base64url). README.md → "Feature flags".
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      FLAGS_SECRET: z.string().optional(),
    },
    runtimeEnv: {
      FLAGS_SECRET: process.env.FLAGS_SECRET,
    },
  });
