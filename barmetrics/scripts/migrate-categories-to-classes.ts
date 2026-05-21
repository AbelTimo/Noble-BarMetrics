#!/usr/bin/env tsx
/**
 * Migrates legacy product/SKU categories to the TTB-aligned LIQUOR_CLASSES model.
 *
 *   BOURBON → category=WHISKEY, subClass=BOURBON
 *   SCOTCH  → category=WHISKEY, subClass=SCOTCH_BLENDED   (safe default; refine by hand)
 *   COGNAC  → category=BRANDY,  subClass=COGNAC
 *
 * Tables: Product (has subClass), SKU (category only), BottleWeightDatabase (has subClass).
 * Idempotent — rows already on a LIQUOR_CLASSES value are skipped, and an existing
 * non-empty subClass is never overwritten.
 *
 * Dry-run by default. Pass --apply to write.
 * Run with: npx tsx --env-file=.env.local --env-file=.env scripts/migrate-categories-to-classes.ts
 */

import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const APPLY = process.argv.includes('--apply');

const LIBSQL_SCHEMES = ['libsql://', 'https://', 'http://', 'wss://', 'ws://'];
function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoIsLibsql = !!tursoUrl && LIBSQL_SCHEMES.some((s) => tursoUrl.startsWith(s));
  const url = tursoIsLibsql ? tursoUrl : process.env.DATABASE_URL ?? tursoUrl;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && LIBSQL_SCHEMES.some((s) => url.startsWith(s))) {
    return new PrismaClient({ adapter: new PrismaLibSql({ url, authToken }) });
  }
  const filePath =
    url && url.startsWith('file:')
      ? path.resolve(process.cwd(), url.slice('file:'.length))
      : path.join(process.cwd(), 'prisma', 'dev.db');
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: filePath }) });
}

/** legacy category → { class, subClass } */
const REMAP: Record<string, { category: string; subClass: string }> = {
  BOURBON: { category: 'WHISKEY', subClass: 'BOURBON' },
  SCOTCH: { category: 'WHISKEY', subClass: 'SCOTCH_BLENDED' },
  COGNAC: { category: 'BRANDY', subClass: 'COGNAC' },
};

async function main() {
  const prisma = createPrismaClient();
  console.log(APPLY ? '🟢 APPLY mode — rows will be updated\n' : '🔵 DRY-RUN — no writes\n');

  try {
    const legacy = Object.keys(REMAP);

    // ---- Products (category + subClass) ----
    const products = await prisma.product.findMany({
      where: { category: { in: legacy } },
      select: { id: true, brand: true, productName: true, category: true, subClass: true },
    });
    console.log(`Products to migrate: ${products.length}`);
    for (const p of products) {
      const to = REMAP[p.category];
      const keepSub = p.subClass && p.subClass.trim() !== '';
      console.log(
        `  ${p.brand} ${p.productName}: ${p.category} → ${to.category}` +
          ` / subClass ${keepSub ? `kept "${p.subClass}"` : `set "${to.subClass}"`}`,
      );
    }

    // ---- SKUs (category only) ----
    const skus = await prisma.sKU.findMany({
      where: { category: { in: legacy } },
      select: { id: true, code: true, category: true },
    });
    console.log(`\nSKUs to migrate: ${skus.length}`);
    const skuByCat = new Map<string, number>();
    for (const s of skus) skuByCat.set(s.category, (skuByCat.get(s.category) ?? 0) + 1);
    for (const [c, n] of skuByCat) console.log(`  ${c} → ${REMAP[c].category}: ${n}`);

    // ---- BottleWeightDatabase (category + subClass) ----
    const bwd = await prisma.bottleWeightDatabase.findMany({
      where: { category: { in: legacy } },
      select: { id: true, category: true, subClass: true },
    });
    console.log(`\nBottleWeightDatabase rows to migrate: ${bwd.length}`);

    if (!APPLY) {
      console.log('\n(Dry-run complete. Re-run with --apply to write.)');
      return;
    }

    let pCount = 0, sCount = 0, bCount = 0;
    for (const p of products) {
      const to = REMAP[p.category];
      const keepSub = p.subClass && p.subClass.trim() !== '';
      await prisma.product.update({
        where: { id: p.id },
        data: { category: to.category, subClass: keepSub ? p.subClass : to.subClass },
      });
      pCount++;
    }
    for (const s of skus) {
      await prisma.sKU.update({
        where: { id: s.id },
        data: { category: REMAP[s.category].category },
      });
      sCount++;
    }
    for (const b of bwd) {
      const to = REMAP[b.category];
      const keepSub = b.subClass && b.subClass.trim() !== '';
      await prisma.bottleWeightDatabase.update({
        where: { id: b.id },
        data: { category: to.category, subClass: keepSub ? b.subClass : to.subClass },
      });
      bCount++;
    }
    console.log(`\n✅ Migrated ${pCount} products, ${sCount} SKUs, ${bCount} catalog rows.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
