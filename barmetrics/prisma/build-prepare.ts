/**
 * Build-time database preparation.
 *
 * - Local (file: URL or no URL): runs `prisma db push` to sync schema.
 * - Turso/libsql (libsql:// URL): skips `prisma db push` because the Prisma CLI
 *   targets local SQLite — schema must be pushed to Turso once manually:
 *
 *     DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npx prisma db push
 *
 *   On the Vercel build it then just runs the idempotent admin seed.
 */
import { spawnSync } from 'child_process';

const LIBSQL_SCHEMES = ['libsql://', 'https://', 'http://', 'wss://', 'ws://'];

function run(cmd: string, args: string[]): number {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(`Failed to run ${cmd}:`, result.error);
    return 1;
  }
  return result.status ?? 1;
}

const url = process.env.DATABASE_URL;
const isLibSql = !!url && LIBSQL_SCHEMES.some((s) => url.startsWith(s));

if (isLibSql) {
  console.log('[build-prepare] Detected libsql/Turso DATABASE_URL — skipping `prisma db push`.');
  console.log('[build-prepare] Make sure you have run `prisma db push` against Turso once.');
} else {
  console.log('[build-prepare] Running `prisma db push` against local datasource…');
  const code = run('npx', ['prisma', 'db', 'push']);
  if (code !== 0) process.exit(code);
}

console.log('[build-prepare] Running admin seed…');
const seedCode = run('npx', ['tsx', 'prisma/ensure-default-user.ts']);
process.exit(seedCode);
