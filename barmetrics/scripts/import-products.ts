#!/usr/bin/env tsx
/**
 * Import products from the formatted JSON file into the database
 * Usage: npx tsx scripts/import-products.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

interface ProductData {
  brand: string;
  productName: string;
  category: string;
  abvPercent: number;
  nominalVolumeMl: number;
  defaultDensity: number;
  defaultTareG: number;
  price?: number;
}

async function importProducts() {
  console.log('🔄 Starting product import...\n');

  // Read the JSON file
  const jsonPath = path.join(__dirname, '../data/products_formatted.json');

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Error: products_formatted.json not found at:', jsonPath);
    console.log('Please make sure the file exists in the data directory.');
    process.exit(1);
  }

  const fileContent = fs.readFileSync(jsonPath, 'utf-8');
  const products: ProductData[] = JSON.parse(fileContent);

  console.log(`📦 Found ${products.length} products to import\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const product of products) {
    try {
      // Check if product already exists
      const existing = await prisma.product.findFirst({
        where: {
          brand: product.brand,
          productName: product.productName,
          category: product.category,
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping (exists): ${product.brand} - ${product.productName}`);
        skipped++;
        continue;
      }

      // Create the product
      await prisma.product.create({
        data: {
          brand: product.brand,
          productName: product.productName,
          category: product.category,
          abvPercent: product.abvPercent,
          nominalVolumeMl: product.nominalVolumeMl,
          defaultDensity: product.defaultDensity,
          defaultTareG: product.defaultTareG,
          isActive: true,
        },
      });

      console.log(`✅ Imported: ${product.brand} - ${product.productName} (${product.category})`);
      imported++;
    } catch (error: any) {
      console.error(`❌ Error importing ${product.brand} - ${product.productName}:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Successfully imported: ${imported}`);
  console.log(`   ⏭️  Skipped (already exist): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total processed: ${products.length}`);
  console.log('='.repeat(80) + '\n');
}

importProducts()
  .catch((error) => {
    console.error('❌ Fatal error during import:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
