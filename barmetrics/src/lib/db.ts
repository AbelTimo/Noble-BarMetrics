import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const LIBSQL_SCHEMES = ['libsql://', 'https://', 'http://', 'wss://', 'ws://'];

function createPrismaClient() {
  // Prefer Turso/libsql whenever it is configured so a stray file: DATABASE_URL
  // (e.g. from a bundled .env that Next.js auto-loads) cannot hijack production
  // onto a read-only SQLite file on the serverless filesystem.
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoIsLibsql =
    !!tursoUrl && LIBSQL_SCHEMES.some((scheme) => tursoUrl.startsWith(scheme));
  const url = tursoIsLibsql ? tursoUrl : process.env.DATABASE_URL ?? tursoUrl;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && LIBSQL_SCHEMES.some((scheme) => url.startsWith(scheme))) {
    const adapter = new PrismaLibSql({ url, authToken });
    return new PrismaClient({ adapter });
  }

  const filePath =
    url && url.startsWith('file:')
      ? path.resolve(process.cwd(), url.slice('file:'.length))
      : path.join(process.cwd(), 'prisma', 'dev.db');
  const adapter = new PrismaBetterSqlite3({ url: filePath });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
