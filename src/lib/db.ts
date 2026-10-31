import { PrismaClient } from "@prisma/client";
import { EMBEDDED_SCHEMA_SQL } from "./embedded-schema";

/**
 * With DATABASE_URL set (Supabase), this is a normal Prisma client.
 * Without it, the app starts an embedded in-memory Postgres (PGlite) inside the server process, so it works
 * with zero config. That data resets on restart and isn't shared between serverless instances.
 */
export const isEmbeddedDb = !process.env.DATABASE_URL;

const EMBEDDED_PORT = Number(process.env.EMBEDDED_DB_PORT || 54331);

async function startEmbedded() {
  const { PGlite } = await import("@electric-sql/pglite");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");
  const pglite = await PGlite.create();
  await pglite.exec(EMBEDDED_SCHEMA_SQL);
  const server = new PGLiteSocketServer({ db: pglite, port: EMBEDDED_PORT, host: "127.0.0.1", maxConnections: 10 });
  await server.start();
}

function createClient(): PrismaClient {
  if (!isEmbeddedDb) return new PrismaClient();

  // Started on the first query, not on import, so `next build` workers don't each try to open the port.
  let ready: Promise<void> | null = null;
  // pgbouncer=true: PGlite shares one session across connections, so Prisma must not cache prepared statements.
  const base = new PrismaClient({
    datasourceUrl: `postgresql://postgres:postgres@127.0.0.1:${EMBEDDED_PORT}/postgres?sslmode=disable&connection_limit=5&pgbouncer=true`,
  });
  // Hold every query until the embedded database is up and has its tables.
  return base.$extends({
    query: {
      async $allOperations({ args, query }) {
        await (ready ??= startEmbedded());
        return query(args);
      },
    },
  }) as unknown as PrismaClient;
}

// Reuse one client across hot reloads in dev.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
