#!/usr/bin/env tsx
/**
 * Create SKUs for all products in the database
 * Each product will get one primary SKU with proper code and specifications
 * Usage: npx tsx scripts/create-skus-from-products.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

/**
 * Generate a clean SKU code from brand and product name
 * Example: "Absolut Vodka 750ml" -> "ABSOLUT-VODKA-750"
 */
function generateSkuCode(brand: string, productName: string, sizeMl: number): string {
  // Clean and uppercase
  const cleanBrand = brand
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 10); // Max 10 chars for brand

  const cleanProduct = productName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 15); // Max 15 chars for product

  return `${cleanBrand}-${cleanProduct}-${sizeMl}`;
}

/**
 * Generate a display name for the SKU
 */
function generateSkuName(brand: string, productName: string, sizeMl: number, unit: string): string {
  if (brand === 'House') {
    return `${productName} (${sizeMl}${unit})`;
  }
  return `${brand} ${productName} (${sizeMl}${unit})`;
}

/**
 * Determine the unit based on category
 */
function getUnit(category: string): string {
  if (category === 'Cocktail') {
    return 'ml'; // Cocktails are served, measured in ml
  }
  return 'ml'; // Bottles measured in ml
}

async function createSkus() {
  console.log('🔄 Starting SKU creation for all products...\n');

  // Fetch all products
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      category: 'asc',
    },
  });

  console.log(`📦 Found ${products.length} products\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    try {
      const unit = getUnit(product.category);
      const skuCode = generateSkuCode(
        product.brand,
        product.productName,
        product.nominalVolumeMl
      );
      const skuName = generateSkuName(
        product.brand,
        product.productName,
        product.nominalVolumeMl,
        unit
      );

      // Check if SKU already exists
      const existingSku = await prisma.sKU.findFirst({
        where: {
          code: skuCode,
        },
      });

      if (existingSku) {
        console.log(`⏭️  SKU exists: ${skuCode}`);
        skipped++;
        continue;
      }

      // Create the SKU
      const sku = await prisma.sKU.create({
        data: {
          code: skuCode,
          name: skuName,
          category: product.category,
          sizeMl: product.nominalVolumeMl,
          unit: unit,
          abvPercent: product.abvPercent,
          bottleTareG: product.defaultTareG || null,
          densityGPerMl: product.defaultDensity,
          isActive: true,
        },
      });

      // Link SKU to Product (primary SKU)
      await prisma.productSKU.create({
        data: {
          productId: product.id,
          skuId: sku.id,
          isPrimary: true,
        },
      });

      console.log(`✅ Created SKU: ${skuCode} -> ${skuName}`);
      created++;
    } catch (error: any) {
      console.error(
        `❌ Error creating SKU for ${product.brand} - ${product.productName}:`,
        error.message
      );
      errors++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SKU Creation Summary:');
  console.log(`   ✅ Successfully created: ${created} SKUs`);
  console.log(`   ⏭️  Skipped (already exist): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total products processed: ${products.length}`);
  console.log('='.repeat(80) + '\n');

  // Show some examples
  if (created > 0) {
    console.log('📋 Sample SKUs created:');
    const sampleSkus = await prisma.sKU.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        products: {
          include: {
            product: {
              select: {
                brand: true,
                productName: true,
              },
            },
          },
        },
      },
    });

    sampleSkus.forEach((sku) => {
      const product = sku.products[0]?.product;
      if (product) {
        console.log(
          `   ${sku.code} - ${product.brand} ${product.productName} (${sku.sizeMl}ml)`
        );
      }
    });
  }
}

createSkus()
  .catch((error) => {
    console.error('❌ Fatal error during SKU creation:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
