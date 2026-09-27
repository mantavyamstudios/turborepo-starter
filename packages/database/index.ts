import "server-only";

import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import ws from "ws";
import { PrismaClient } from "./generated/client";
import { keys } from "./keys";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

neonConfig.webSocketConstructor = ws;

// Local Postgres has no Neon websocket proxy, so localhost URLs use the pg
// adapter. Any other URL (Neon) goes through PrismaNeon.
// TODO(setup): Use a Neon URL in staging/production. README.md → "Database".
const connectionString = keys().DATABASE_URL;
const adapter = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString)
  ? new PrismaPg({ connectionString })
  : new PrismaNeon({ connectionString });

export const database = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = database;
}

export * from "./generated/client";
