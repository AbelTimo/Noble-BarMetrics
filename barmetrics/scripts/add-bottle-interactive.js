#!/usr/bin/env node

/**
 * Interactive script to add a bottle to the database
 * Run with: node scripts/add-bottle-interactive.js
 */

const readline = require('readline');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Calculate full weight from tare and ABV
function calculateFullWeight(tareG, sizeMl, abvPercent) {
  const alcoholDensity = 0.789;
  const waterDensity = 1.0;
  const liquidDensity = (alcoholDensity * abvPercent / 100) + (waterDensity * (1 - abvPercent / 100));
  const liquidWeightG = sizeMl * liquidDensity;
  return Math.round((tareG + liquidWeightG) * 10) / 10;
}

async function main() {
  console.log('\n🍾 Add Bottle Weight to Database\n');
  console.log('Categories: VODKA, GIN, WHISKEY, BOURBON, SCOTCH, RUM, TEQUILA, MEZCAL,');
  console.log('           COGNAC, BRANDY, LIQUEUR, OTHER\n');

  try {
    const brand = await question('Brand name: ');
    const productName = await question('Product name: ');
    const category = await question('Category (e.g., VODKA): ');
    const sizeMl = parseInt(await question('Size in ml (e.g., 750): '));
    const tareWeightG = parseFloat(await question('Tare weight in grams (empty bottle, e.g., 520): '));
    const abvPercent = parseFloat(await question('ABV percent (e.g., 40): '));
    const bottleType = await question('Bottle type (optional, e.g., "Heavy Bottom"): ');
    const notes = await question('Notes (optional): ');

    // Calculate full weight
    const fullWeightG = calculateFullWeight(tareWeightG, sizeMl, abvPercent);

    console.log('\n📊 Summary:');
    console.log(`  Brand: ${brand}`);
    console.log(`  Product: ${productName}`);
    console.log(`  Category: ${category}`);
    console.log(`  Size: ${sizeMl}ml`);
    console.log(`  Tare Weight: ${tareWeightG}g`);
    console.log(`  Full Weight: ${fullWeightG}g (calculated)`);
    console.log(`  ABV: ${abvPercent}%`);
    if (bottleType) console.log(`  Bottle Type: ${bottleType}`);
    if (notes) console.log(`  Notes: ${notes}`);

    const confirm = await question('\nAdd this bottle? (y/n): ');

    if (confirm.toLowerCase() === 'y') {
      const bottle = await prisma.bottleWeightDatabase.create({
        data: {
          brand,
          productName,
          category: category.toUpperCase(),
          sizeMl,
          tareWeightG,
          fullWeightG,
          abvPercent,
          bottleType: bottleType || null,
          notes: notes || null,
          source: 'user',
          verified: false,
        },
      });

      console.log('\n✅ Bottle added successfully!');
      console.log(`   ID: ${bottle.id}`);
      console.log(`\nYou can now search for "${brand}" in the bottle database.\n`);
    } else {
      console.log('\n❌ Cancelled.\n');
    }
  } catch (error) {
    if (error.code === 'P2002') {
      console.error('\n❌ Error: This bottle already exists in the database.');
      console.error('   (Same brand, product name, and size)\n');
    } else {
      console.error('\n❌ Error:', error.message, '\n');
    }
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
