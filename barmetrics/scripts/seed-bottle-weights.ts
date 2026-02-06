#!/usr/bin/env node

/**
 * Seed the bottle weight database with common liquor bottles
 * Run with: node --loader ts-node/esm scripts/seed-bottle-weights.ts
 * Or: npm run seed:bottles
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Calculate full weight from tare and ABV
function calculateFullWeight(tareG, sizeMl, abvPercent) {
  const alcoholDensity = 0.789;
  const waterDensity = 1.0;
  const liquidDensity = (alcoholDensity * abvPercent / 100) + (waterDensity * (1 - abvPercent / 100));
  const liquidWeightG = sizeMl * liquidDensity;
  return Math.round((tareG + liquidWeightG) * 10) / 10;
}

// Bottle weights data
const BOTTLE_WEIGHTS = [
  // VODKA
  { brand: 'Grey Goose', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 520, abvPercent: 40 },
  { brand: 'Grey Goose', productName: 'Vodka', category: 'VODKA', sizeMl: 1000, tareWeightG: 650, abvPercent: 40 },
  { brand: 'Belvedere', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 680, abvPercent: 40 },
  { brand: 'Belvedere', productName: 'Vodka', category: 'VODKA', sizeMl: 1750, tareWeightG: 950, abvPercent: 40 },
  { brand: 'Tito\'s', productName: 'Handmade Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 480, abvPercent: 40 },
  { brand: 'Tito\'s', productName: 'Handmade Vodka', category: 'VODKA', sizeMl: 1750, tareWeightG: 820, abvPercent: 40 },
  { brand: 'Absolut', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 550, abvPercent: 40 },
  { brand: 'Ketel One', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 510, abvPercent: 40 },
  { brand: 'Ciroc', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 720, abvPercent: 40 },
  { brand: 'Smirnoff', productName: 'No. 21 Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 450, abvPercent: 40 },
  // GIN
  { brand: 'Tanqueray', productName: 'London Dry Gin', category: 'GIN', sizeMl: 750, tareWeightG: 540, abvPercent: 47.3 },
  { brand: 'Bombay Sapphire', productName: 'Gin', category: 'GIN', sizeMl: 750, tareWeightG: 620, abvPercent: 47 },
  { brand: 'Hendrick\'s', productName: 'Gin', category: 'GIN', sizeMl: 750, tareWeightG: 580, abvPercent: 44 },
  // Add more as needed - keeping it shorter for now
];

const BOTTLE_WEIGHTS_WITH_FULL = BOTTLE_WEIGHTS.map(bottle => ({
  ...bottle,
  fullWeightG: calculateFullWeight(bottle.tareWeightG, bottle.sizeMl, bottle.abvPercent),
  source: 'system',
  verified: false,
}));

async function main() {
  console.log('🍾 Seeding bottle weight database...');
  console.log(`📦 Total bottles to seed: ${BOTTLE_WEIGHTS_WITH_FULL.length}`);

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const bottle of BOTTLE_WEIGHTS_WITH_FULL) {
    try {
      // Try to upsert (create or update)
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
          fullWeightG: bottle.fullWeightG,
          abvPercent: bottle.abvPercent,
          category: bottle.category,
        },
        create: {
          brand: bottle.brand,
          productName: bottle.productName,
          category: bottle.category,
          sizeMl: bottle.sizeMl,
          tareWeightG: bottle.tareWeightG,
          fullWeightG: bottle.fullWeightG,
          abvPercent: bottle.abvPercent,
          source: bottle.source,
          verified: bottle.verified,
        },
      });

      if (result.createdAt === result.updatedAt) {
        created++;
      } else {
        updated++;
      }

      if ((created + updated + skipped) % 20 === 0) {
        console.log(`  ✅ Progress: ${created + updated + skipped}/${BOTTLE_WEIGHTS_WITH_FULL.length}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error with ${bottle.brand} ${bottle.productName} ${bottle.sizeMl}ml:`, error.message);
      skipped++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Created: ${created}`);
  console.log(`  🔄 Updated: ${updated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📦 Total: ${created + updated + skipped}`);

  // Show some stats
  const stats = await prisma.bottleWeightDatabase.groupBy({
    by: ['category'],
    _count: true,
  });

  console.log('\n📈 Bottles by category:');
  stats.forEach(stat => {
    console.log(`  ${stat.category}: ${stat._count}`);
  });

  const totalBottles = await prisma.bottleWeightDatabase.count();
  console.log(`\n🎉 Total bottles in database: ${totalBottles}`);
}

main()
  .catch((error) => {
    console.error('Error seeding bottle weights:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
