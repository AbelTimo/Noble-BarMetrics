#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

function calculateFullWeight(tareG, sizeMl, abvPercent) {
  const alcoholDensity = 0.789;
  const waterDensity = 1.0;
  const liquidDensity = (alcoholDensity * abvPercent / 100) + (waterDensity * (1 - abvPercent / 100));
  const liquidWeightG = sizeMl * liquidDensity;
  return Math.round((tareG + liquidWeightG) * 10) / 10;
}

// Import all bottle data from the TypeScript file
const bottleData = require('../prisma/bottle-weights-seed.ts');

async function main() {
  console.log('🍾 Seeding comprehensive bottle weight database...\n');
  console.log('📦 This may take a moment...\n');

  let created = 0;
  let updated = 0;

  // Use the BOTTLE_WEIGHTS array directly
  const BOTTLE_WEIGHTS = bottleData.BOTTLE_WEIGHTS || [];

  for (const bottle of BOTTLE_WEIGHTS) {
    try {
      const result = await prisma.bottleWeightDatabase.upsert({
        where: {
          brand_productName_sizeMl: {
            brand: bottle.brand,
            productName: bottle.productName,
            sizeMl: bottle.sizeMl,
          },
        },
        update: {
          tareWeightG: bottle.tareWeightG,
          category: bottle.category,
          abvPercent: bottle.abvPercent,
        },
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

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }

      if ((created + updated) % 20 === 0) {
        console.log(`  ✅ Progress: ${created + updated}/${BOTTLE_WEIGHTS.length}`);
      }
    } catch (error) {
      console.error(`  ❌ ${bottle.brand} ${bottle.productName}: ${error.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  ✅ Created: ${created}`);
  console.log(`  🔄 Updated: ${updated}`);
  
  const stats = await prisma.bottleWeightDatabase.groupBy({
    by: ['category'],
    _count: true,
  });

  console.log(`\n📈 Bottles by category:`);
  stats.forEach(stat => {
    console.log(`  ${stat.category}: ${stat._count}`);
  });

  const total = await prisma.bottleWeightDatabase.count();
  console.log(`\n🎉 Total bottles in database: ${total}\n`);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
