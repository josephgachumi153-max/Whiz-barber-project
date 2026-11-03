import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function runtimeDatabaseUrl() {
  const raw = process.env.POSTGRES_PRISMA_URL;
  if (!raw) return raw;

  try {
    const url = new URL(raw);
    // Supabase transaction pooling needs a small per-runtime Prisma pool on Vercel.
    if (url.hostname.includes("pooler.supabase.com")) {
      url.searchParams.set("pgbouncer", "true");
      url.searchParams.set("connection_limit", "1");
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: runtimeDatabaseUrl() } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

// Vercel reuses warm serverless runtimes. Keep one client per runtime so
// repeated requests do not create a new database pool and exhaust Supabase.
globalForPrisma.prisma = prisma;
