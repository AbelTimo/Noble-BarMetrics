#!/usr/bin/env node

/**
 * Seed the bottle weight database with common liquor bottles
 * Run with: node scripts/seed-bottles.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

// Calculate full weight from tare and ABV
function calculateFullWeight(tareG, sizeMl, abvPercent) {
  const alcoholDensity = 0.789;
  const waterDensity = 1.0;
  const liquidDensity = (alcoholDensity * abvPercent / 100) + (waterDensity * (1 - abvPercent / 100));
  const liquidWeightG = sizeMl * liquidDensity;
  return Math.round((tareG + liquidWeightG) * 10) / 10;
}

// Sample bottle weights - can be expanded
const bottles = [
  // VODKA
  { brand: 'Grey Goose', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 520, abvPercent: 40 },
  { brand: 'Tito\'s', productName: 'Handmade Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 480, abvPercent: 40 },
  { brand: 'Absolut', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 550, abvPercent: 40 },
  // Add more bottles here...
];

async function main() {
  console.log('🍾 Seeding bottle weight database...\n');

  let created = 0;

  for (const bottle of bottles) {
    try {
      await prisma.bottleWeightDatabase.upsert({
        where: {
          brand_productName_sizeMl: {
            brand: bottle.brand,
            productName: bottle.productName,
            sizeMl: bottle.sizeMl,
          },
        },
        update: {},
        create: {
          brand: bottle.brand,
          productName: bottle.productName,
          category: bottle.category,
          sizeMl: bottle.sizeMl,
          tareWeightG: bottle.tareWeightG,
          fullWeightG: calculateFullWeight(bottle.tareWeightG, bottle.sizeMl, bottle.abvPercent),
          abvPercent: bottle.abvPercent,
          source: 'system',
          verified: false,
        },
      });
      console.log(`  ✅ ${bottle.brand} ${bottle.productName} ${bottle.sizeMl}ml`);
      created++;
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n🎉 Done! Created/Updated ${created} bottles`);

  const total = await prisma.bottleWeightDatabase.count();
  console.log(`📦 Total bottles in database: ${total}\n`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
