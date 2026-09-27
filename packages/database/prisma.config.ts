import { join } from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env. Load this package's .env explicitly so the
// CLI works from any cwd (e.g. apps/studio runs it with --config).
config({ path: join(import.meta.dirname, ".env"), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
