#!/usr/bin/env tsx
/**
 * Fixes products imported from the COGS spreadsheet where the source had a
 * single-word name, so the importer set productName == brand (showing as
 * "Beefeater Beefeater" in the UI).
 *
 * Replaces productName with a category-derived descriptor:
 *   VODKA → "Vodka", GIN → "Gin", ... so "Beefeater" displays as "Beefeater Gin".
 * Also rewrites the matching SKU.name values.
 *
 * Dry-run by default. Pass --apply to write.
 * Run with: npx tsx --env-file=.env.local --env-file=.env scripts/fix-duplicated-product-names.ts
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

const CATEGORY_NOUN: Record<string, string> = {
  VODKA: 'Vodka',
  GIN: 'Gin',
  WHISKEY: 'Whiskey',
  BOURBON: 'Bourbon',
  SCOTCH: 'Scotch',
  COGNAC: 'Cognac',
  RUM: 'Rum',
  TEQUILA: 'Tequila',
  MEZCAL: 'Mezcal',
  BRANDY: 'Brandy',
  LIQUEUR: 'Liqueur',
};

/** Title-case a brand token ("champion" → "Champion", "casamigos" → "Casamigos"). */
function titleCaseBrand(brand: string): string {
  return brand
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

/**
 * Pick a productName descriptor for a single-word product.
 *  - Recipe-ingredient stubs (nominalVolumeMl === 1) → "" (the brand IS the name).
 *  - Spirits → category noun.
 *  - OTHER (beer/water/etc.) → keyword-derived noun.
 */
function descriptorFor(brand: string, category: string, nominalVolumeMl: number): string {
  if (nominalVolumeMl === 1) return ''; // stub: just the brand
  const known = CATEGORY_NOUN[category];
  if (known) return known;
  const b = brand.toLowerCase();
  if (/arada|habesha|heineken|kegna|harar|walia|castel|st\.?\s*george/.test(b)) return 'Beer';
  if (/wine|acacia|rift/.test(b)) return 'Wine';
  if (/soda|ambo|water/.test(b)) return 'Water';
  if (/redbull|red\s*bull/.test(b)) return 'Energy Drink';
  if (/better|bitter/.test(b)) return 'Bitters';
  return 'Beverage';
}

async function main() {
  const prisma = createPrismaClient();
  console.log(APPLY ? '🟢 APPLY mode — rows will be updated\n' : '🔵 DRY-RUN — no writes\n');

  try {
    // Single-word artifacts: productName equals brand exactly.
    const all = await prisma.product.findMany({
      select: { id: true, brand: true, productName: true, category: true, nominalVolumeMl: true },
    });
    const dupes = all.filter((p) => p.brand.trim() === p.productName.trim());

    console.log(`Products with productName == brand: ${dupes.length}\n`);
    const plan = dupes.map((p) => ({
      ...p,
      newBrand: titleCaseBrand(p.brand),
      newName: descriptorFor(p.brand, p.category, p.nominalVolumeMl),
    }));
    for (const p of plan) {
      const before = `${p.brand} ${p.productName}`;
      const after = `${p.newBrand}${p.newName ? ' ' + p.newName : ''}`;
      console.log(`  [${p.category.padEnd(8)}] "${before}" → "${after}"`);
    }

    if (!APPLY) {
      console.log('\n(Dry-run complete. Re-run with --apply to write.)');
      return;
    }

    let productsUpdated = 0;
    let skusUpdated = 0;
    for (const p of plan) {
      await prisma.product.update({
        where: { id: p.id },
        data: { brand: p.newBrand, productName: p.newName },
      });
      productsUpdated++;

      // Rewrite SKU names linked to this product.
      const links = await prisma.productSKU.findMany({
        where: { productId: p.id },
        select: { sku: { select: { id: true, sizeMl: true } } },
      });
      for (const { sku } of links) {
        const skuName = `${p.newBrand}${p.newName ? ' ' + p.newName : ''} ${sku.sizeMl}ml`;
        await prisma.sKU.update({ where: { id: sku.id }, data: { name: skuName } });
        skusUpdated++;
      }
    }
    console.log(`\n✅ Updated ${productsUpdated} products and ${skusUpdated} SKU names.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
