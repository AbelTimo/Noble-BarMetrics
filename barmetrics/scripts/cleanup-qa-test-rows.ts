#!/usr/bin/env tsx
/**
 * One-off cleanup for QA-test rows accidentally created against production
 * during a 2026-05-21 stress-test session:
 *
 *   - Product brand="StressTest" (single row, "QA Vodka A")
 *   - SKU code="QA-TEST-SKU-001"
 *   - Recipe name="QA Vodka Soda" (and its ingredient links)
 *   - Sale dated 2026-05-21 with notes="QA stress test"
 *
 * Dry-run by default. Pass --apply to actually delete.
 *
 * Uses the same TURSO-preferred DB resolution as src/lib/db.ts so it targets
 * the running app's database.
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

async function main() {
  const prisma = createPrismaClient();
  console.log(APPLY ? '🟢 APPLY mode — rows will be deleted' : '🔵 DRY-RUN — nothing will be deleted\n');

  try {
    // Find candidates
    const products = await prisma.product.findMany({
      where: { brand: 'StressTest' },
      select: { id: true, brand: true, productName: true },
    });
    const skus = await prisma.sKU.findMany({
      where: { code: 'QA-TEST-SKU-001' },
      select: { id: true, code: true, name: true },
    });
    const recipes = await prisma.recipe.findMany({
      where: { name: 'QA Vodka Soda' },
      select: { id: true, name: true },
    });
    const sales = await prisma.sale.findMany({
      where: { notes: 'QA stress test' },
      select: { id: true, date: true, notes: true },
    });

    console.log(`Products (brand="StressTest"): ${products.length}`);
    for (const p of products) console.log(`  ${p.id}  ${p.brand} ${p.productName}`);
    console.log(`\nSKUs (code="QA-TEST-SKU-001"): ${skus.length}`);
    for (const s of skus) console.log(`  ${s.id}  ${s.code}  ${s.name}`);
    console.log(`\nRecipes (name="QA Vodka Soda"): ${recipes.length}`);
    for (const r of recipes) console.log(`  ${r.id}  ${r.name}`);
    console.log(`\nSales (notes="QA stress test"): ${sales.length}`);
    for (const s of sales) console.log(`  ${s.id}  ${s.date}  ${s.notes}`);

    if (!APPLY) {
      console.log('\n(Dry-run complete. Re-run with --apply to delete.)');
      return;
    }

    // Order: child cascades happen via Prisma onDelete: Cascade for SaleItem & RecipeIngredient.
    // Sales first (independent), then Recipes (parent of RecipeIngredient), then SKUs and ProductSKU links, then Products.
    const result = await prisma.$transaction(async (tx) => {
      const salesDeleted = await tx.sale.deleteMany({ where: { notes: 'QA stress test' } });
      const recipesDeleted = await tx.recipe.deleteMany({ where: { name: 'QA Vodka Soda' } });

      // Remove ProductSKU links pointing at the test product or sku, then the SKUs, then the Products.
      const productIds = products.map((p) => p.id);
      const skuIds = skus.map((s) => s.id);
      const linksDeleted = await tx.productSKU.deleteMany({
        where: { OR: [{ productId: { in: productIds } }, { skuId: { in: skuIds } }] },
      });
      const skusDeleted = await tx.sKU.deleteMany({ where: { code: 'QA-TEST-SKU-001' } });
      const productsDeleted = await tx.product.deleteMany({ where: { brand: 'StressTest' } });

      return {
        sales: salesDeleted.count,
        recipes: recipesDeleted.count,
        productSkuLinks: linksDeleted.count,
        skus: skusDeleted.count,
        products: productsDeleted.count,
      };
    });
    console.log('\n✅ Deleted:');
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
