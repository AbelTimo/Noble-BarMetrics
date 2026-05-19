import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

const LIBSQL_SCHEMES = ['libsql://', 'https://', 'http://', 'wss://', 'ws://'];

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
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

const prisma = createPrismaClient();

function hashPin(pin: string): string {
  return Buffer.from(pin).toString('base64');
}

async function main() {
  const username = (process.env.DEFAULT_ADMIN_USERNAME ?? 'admin').toLowerCase();
  const displayName = process.env.DEFAULT_ADMIN_DISPLAY_NAME ?? 'Admin Manager';
  const pin = process.env.DEFAULT_ADMIN_PIN ?? '1234';

  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    console.log(`✓ Default admin user already exists: ${username}`);
    return;
  }

  await prisma.user.create({
    data: {
      username,
      displayName,
      role: 'MANAGER',
      pin: hashPin(pin),
      isActive: true,
    },
  });

  console.log(`✓ Seeded default admin user: ${username} / ${pin}`);
  console.log('  Set DEFAULT_ADMIN_PIN env var to override the default PIN on next deploy.');
}

main()
  .catch((e) => {
    console.error('Failed to ensure default admin user:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
