/**
 * Configure Weight-Based Inventory for SKUs
 *
 * This script helps set up SKUs with tare weights and density values
 * for weight-based inventory counting.
 *
 * Usage:
 *   npx tsx scripts/configure-weight-inventory.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Common bottle tare weights by size (grams)
 * These are typical values - measure actual bottles for accuracy
 */
const STANDARD_TARE_WEIGHTS: Record<number, number> = {
  50: 100,    // 50ml miniature
  200: 300,   // 200ml flask
  375: 425,   // 375ml half bottle
  500: 500,   // 500ml
  700: 600,   // 700ml (common in Europe)
  750: 600,   // 750ml standard bottle
  1000: 725,  // 1L
  1750: 1000, // 1.75L handle
};

/**
 * Calculate liquid density from ABV percentage
 */
function calculateDensityFromABV(abvPercent: number): number {
  const alcoholDensity = 0.789; // g/ml
  const waterDensity = 1.0;     // g/ml

  const alcoholFraction = abvPercent / 100;
  const waterFraction = 1 - alcoholFraction;

  return (alcoholDensity * alcoholFraction) + (waterDensity * waterFraction);
}

/**
 * Get estimated tare weight for bottle size
 */
function getEstimatedTareWeight(sizeMl: number): number {
  // Find closest standard size
  const standardSizes = Object.keys(STANDARD_TARE_WEIGHTS)
    .map(Number)
    .sort((a, b) => Math.abs(a - sizeMl) - Math.abs(b - sizeMl));

  const closestSize = standardSizes[0];
  const baseWeight = STANDARD_TARE_WEIGHTS[closestSize];

  // Interpolate if needed
  if (sizeMl !== closestSize) {
    const ratio = sizeMl / closestSize;
    return Math.round(baseWeight * ratio);
  }

  return baseWeight;
}

async function main() {
  console.log('🔧 Configuring Weight-Based Inventory for SKUs\n');

  // Fetch all active SKUs
  const skus = await prisma.sKU.findMany({
    where: { isActive: true },
    include: {
      products: {
        include: {
          product: true,
        },
        where: { isPrimary: true },
      },
    },
  });

  console.log(`Found ${skus.length} active SKUs\n`);

  let configuredCount = 0;
  let skippedCount = 0;

  for (const sku of skus) {
    const primaryProduct = sku.products[0]?.product;

    // Skip if already configured at SKU level
    if (sku.bottleTareG && sku.bottleTareG > 0) {
      console.log(`⏭️  ${sku.code}: Already configured (${sku.bottleTareG}g)`);
      skippedCount++;
      continue;
    }

    // Skip if configured at Product level
    if (primaryProduct?.defaultTareG && primaryProduct.defaultTareG > 0) {
      console.log(`⏭️  ${sku.code}: Using product tare weight (${primaryProduct.defaultTareG}g)`);
      skippedCount++;
      continue;
    }

    // Estimate tare weight based on bottle size
    const estimatedTareG = getEstimatedTareWeight(sku.sizeMl);

    // Get ABV from product if available
    let abvPercent: number | null = null;
    let densityGPerMl: number | null = null;

    if (primaryProduct?.abvPercent) {
      abvPercent = primaryProduct.abvPercent;
      densityGPerMl = calculateDensityFromABV(abvPercent);
    }

    // Update SKU
    await prisma.sKU.update({
      where: { id: sku.id },
      data: {
        bottleTareG: estimatedTareG,
        densityGPerMl,
        abvPercent,
      },
    });

    console.log(
      `✅ ${sku.code} (${sku.sizeMl}ml): ` +
      `Tare=${estimatedTareG}g, ` +
      `Density=${densityGPerMl?.toFixed(3) || 'default'} g/ml` +
      (abvPercent ? ` (${abvPercent}% ABV)` : '')
    );

    configuredCount++;
  }

  console.log('\n📊 Summary:');
  console.log(`   Configured: ${configuredCount}`);
  console.log(`   Skipped: ${skippedCount} (already configured)`);
  console.log(`   Total: ${skus.length}`);

  console.log('\n⚠️  Important Notes:');
  console.log('   - Tare weights are ESTIMATES based on standard bottles');
  console.log('   - For accuracy, weigh actual empty bottles and update SKUs');
  console.log('   - Density calculated from Product ABV if available');
  console.log('   - Default density (0.95 g/ml) used if ABV not set');

  console.log('\n📝 Next Steps:');
  console.log('   1. Verify tare weights by weighing actual bottles');
  console.log('   2. Update SKUs with measured values if needed');
  console.log('   3. Test weight-based counting on /scan page');
  console.log('   4. Generate labels and assign to bottles');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
