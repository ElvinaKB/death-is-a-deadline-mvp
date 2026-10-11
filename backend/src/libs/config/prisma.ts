import { PrismaClient } from "@prisma/client";

declare global {
  // Prevent multiple instances of Prisma Client in development
  var prisma: PrismaClient | undefined;
}

/**
 * Supabase's transaction pooler (port 6543) needs Prisma's pgbouncer mode
 * (no prepared statements) and a small per-instance pool on serverless —
 * otherwise each Vercel function instance can hold many connections, the
 * pooler runs out, and requests intermittently hang or 500 (seen as hotel
 * pages flashing "Place not found"). Only adds the params when missing.
 */
function databaseUrl(): string | undefined {
  const raw = process.env.SUPABASE_CONNECTION_STRING;
  // Plain string append (no URL parsing) so passwords with special
  // characters are never re-encoded.
  if (!raw || !raw.includes(":6543/")) return raw;
  const extra = [
    !raw.includes("pgbouncer=") && "pgbouncer=true",
    !raw.includes("connection_limit=") && "connection_limit=3",
    !raw.includes("pool_timeout=") && "pool_timeout=20",
  ].filter(Boolean);
  if (extra.length === 0) return raw;
  return `${raw}${raw.includes("?") ? "&" : "?"}${extra.join("&")}`;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: { db: { url: databaseUrl() } },
    log:
      process.env.NODE_ENV === "production"
        ? []
        : ["query", "info", "warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
