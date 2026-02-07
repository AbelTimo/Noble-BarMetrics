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

// Comprehensive bottle weights database
const bottles = [
  // VODKA - Premium Brands
  { brand: 'Grey Goose', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 520, abvPercent: 40 },
  { brand: 'Grey Goose', productName: 'Vodka', category: 'VODKA', sizeMl: 1000, tareWeightG: 650, abvPercent: 40 },
  { brand: 'Belvedere', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 680, abvPercent: 40 },
  { brand: 'Belvedere', productName: 'Vodka', category: 'VODKA', sizeMl: 1750, tareWeightG: 950, abvPercent: 40 },
  { brand: 'Tito\'s', productName: 'Handmade Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 480, abvPercent: 40 },
  { brand: 'Tito\'s', productName: 'Handmade Vodka', category: 'VODKA', sizeMl: 1750, tareWeightG: 820, abvPercent: 40 },
  { brand: 'Absolut', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 550, abvPercent: 40 },
  { brand: 'Absolut', productName: 'Vodka', category: 'VODKA', sizeMl: 1000, tareWeightG: 680, abvPercent: 40 },
  { brand: 'Ketel One', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 510, abvPercent: 40 },
  { brand: 'Ketel One', productName: 'Vodka', category: 'VODKA', sizeMl: 1750, tareWeightG: 880, abvPercent: 40 },
  { brand: 'Ciroc', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 720, abvPercent: 40 },
  { brand: 'Ciroc', productName: 'Vodka', category: 'VODKA', sizeMl: 1750, tareWeightG: 1050, abvPercent: 40 },
  { brand: 'Smirnoff', productName: 'No. 21 Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 450, abvPercent: 40 },
  { brand: 'Smirnoff', productName: 'No. 21 Vodka', category: 'VODKA', sizeMl: 1750, tareWeightG: 780, abvPercent: 40 },
  { brand: 'Stolichnaya', productName: 'Vodka', category: 'VODKA', sizeMl: 750, tareWeightG: 490, abvPercent: 40 },

  // GIN - Premium Brands
  { brand: 'Tanqueray', productName: 'London Dry Gin', category: 'GIN', sizeMl: 750, tareWeightG: 540, abvPercent: 47.3 },
  { brand: 'Tanqueray', productName: 'London Dry Gin', category: 'GIN', sizeMl: 1750, tareWeightG: 890, abvPercent: 47.3 },
  { brand: 'Bombay Sapphire', productName: 'Gin', category: 'GIN', sizeMl: 750, tareWeightG: 620, abvPercent: 47 },
  { brand: 'Bombay Sapphire', productName: 'Gin', category: 'GIN', sizeMl: 1750, tareWeightG: 980, abvPercent: 47 },
  { brand: 'Hendrick\'s', productName: 'Gin', category: 'GIN', sizeMl: 750, tareWeightG: 580, abvPercent: 44 },
  { brand: 'Beefeater', productName: 'London Dry Gin', category: 'GIN', sizeMl: 750, tareWeightG: 480, abvPercent: 47 },
  { brand: 'Beefeater', productName: 'London Dry Gin', category: 'GIN', sizeMl: 1750, tareWeightG: 820, abvPercent: 47 },
  { brand: 'The Botanist', productName: 'Islay Dry Gin', category: 'GIN', sizeMl: 750, tareWeightG: 650, abvPercent: 46 },
  { brand: 'Aviation', productName: 'American Gin', category: 'GIN', sizeMl: 750, tareWeightG: 520, abvPercent: 42 },

  // WHISKEY - Bourbon
  { brand: 'Maker\'s Mark', productName: 'Bourbon', category: 'BOURBON', sizeMl: 750, tareWeightG: 580, abvPercent: 45 },
  { brand: 'Maker\'s Mark', productName: 'Bourbon', category: 'BOURBON', sizeMl: 1750, tareWeightG: 920, abvPercent: 45 },
  { brand: 'Jim Beam', productName: 'Bourbon', category: 'BOURBON', sizeMl: 750, tareWeightG: 460, abvPercent: 40 },
  { brand: 'Jim Beam', productName: 'Bourbon', category: 'BOURBON', sizeMl: 1750, tareWeightG: 800, abvPercent: 40 },
  { brand: 'Woodford Reserve', productName: 'Bourbon', category: 'BOURBON', sizeMl: 750, tareWeightG: 720, abvPercent: 45.2 },
  { brand: 'Buffalo Trace', productName: 'Bourbon', category: 'BOURBON', sizeMl: 750, tareWeightG: 510, abvPercent: 45 },
  { brand: 'Bulleit', productName: 'Bourbon', category: 'BOURBON', sizeMl: 750, tareWeightG: 680, abvPercent: 45 },
  { brand: 'Bulleit', productName: 'Bourbon', category: 'BOURBON', sizeMl: 1750, tareWeightG: 980, abvPercent: 45 },
  { brand: 'Wild Turkey', productName: '101 Bourbon', category: 'BOURBON', sizeMl: 750, tareWeightG: 490, abvPercent: 50.5 },
  { brand: 'Wild Turkey', productName: '101 Bourbon', category: 'BOURBON', sizeMl: 1750, tareWeightG: 840, abvPercent: 50.5 },
  { brand: 'Knob Creek', productName: 'Bourbon', category: 'BOURBON', sizeMl: 750, tareWeightG: 650, abvPercent: 50 },

  // WHISKEY - Scotch
  { brand: 'Johnnie Walker', productName: 'Black Label', category: 'SCOTCH', sizeMl: 750, tareWeightG: 620, abvPercent: 40 },
  { brand: 'Johnnie Walker', productName: 'Black Label', category: 'SCOTCH', sizeMl: 1750, tareWeightG: 950, abvPercent: 40 },
  { brand: 'Johnnie Walker', productName: 'Red Label', category: 'SCOTCH', sizeMl: 750, tareWeightG: 580, abvPercent: 40 },
  { brand: 'Glenlivet', productName: '12 Year', category: 'SCOTCH', sizeMl: 750, tareWeightG: 670, abvPercent: 40 },
  { brand: 'Glenfiddich', productName: '12 Year', category: 'SCOTCH', sizeMl: 750, tareWeightG: 690, abvPercent: 40 },
  { brand: 'Macallan', productName: '12 Year Double Cask', category: 'SCOTCH', sizeMl: 750, tareWeightG: 750, abvPercent: 43 },
  { brand: 'Chivas Regal', productName: '12 Year', category: 'SCOTCH', sizeMl: 750, tareWeightG: 600, abvPercent: 40 },
  { brand: 'Dewars', productName: 'White Label', category: 'SCOTCH', sizeMl: 750, tareWeightG: 520, abvPercent: 40 },
  { brand: 'Dewars', productName: 'White Label', category: 'SCOTCH', sizeMl: 1750, tareWeightG: 860, abvPercent: 40 },

  // WHISKEY - Irish
  { brand: 'Jameson', productName: 'Irish Whiskey', category: 'WHISKEY', sizeMl: 750, tareWeightG: 540, abvPercent: 40 },
  { brand: 'Jameson', productName: 'Irish Whiskey', category: 'WHISKEY', sizeMl: 1750, tareWeightG: 880, abvPercent: 40 },
  { brand: 'Bushmills', productName: 'Original', category: 'WHISKEY', sizeMl: 750, tareWeightG: 510, abvPercent: 40 },
  { brand: 'Tullamore Dew', productName: 'Irish Whiskey', category: 'WHISKEY', sizeMl: 750, tareWeightG: 490, abvPercent: 40 },

  // WHISKEY - Rye
  { brand: 'Bulleit', productName: 'Rye', category: 'WHISKEY', sizeMl: 750, tareWeightG: 680, abvPercent: 45 },
  { brand: 'Sazerac', productName: 'Rye', category: 'WHISKEY', sizeMl: 750, tareWeightG: 520, abvPercent: 45 },
  { brand: 'Rittenhouse', productName: 'Rye', category: 'WHISKEY', sizeMl: 750, tareWeightG: 480, abvPercent: 50 },

  // RUM - White/Silver
  { brand: 'Bacardi', productName: 'Superior', category: 'RUM', sizeMl: 750, tareWeightG: 440, abvPercent: 40 },
  { brand: 'Bacardi', productName: 'Superior', category: 'RUM', sizeMl: 1750, tareWeightG: 760, abvPercent: 40 },
  { brand: 'Captain Morgan', productName: 'White Rum', category: 'RUM', sizeMl: 750, tareWeightG: 520, abvPercent: 40 },
  { brand: 'Malibu', productName: 'Coconut Rum', category: 'RUM', sizeMl: 750, tareWeightG: 480, abvPercent: 21 },
  { brand: 'Malibu', productName: 'Coconut Rum', category: 'RUM', sizeMl: 1750, tareWeightG: 800, abvPercent: 21 },

  // RUM - Dark/Aged
  { brand: 'Captain Morgan', productName: 'Spiced Rum', category: 'RUM', sizeMl: 750, tareWeightG: 540, abvPercent: 35 },
  { brand: 'Captain Morgan', productName: 'Spiced Rum', category: 'RUM', sizeMl: 1750, tareWeightG: 870, abvPercent: 35 },
  { brand: 'Kraken', productName: 'Black Spiced Rum', category: 'RUM', sizeMl: 750, tareWeightG: 780, abvPercent: 47 },
  { brand: 'Mount Gay', productName: 'Eclipse', category: 'RUM', sizeMl: 750, tareWeightG: 510, abvPercent: 40 },
  { brand: 'Appleton Estate', productName: 'Signature Blend', category: 'RUM', sizeMl: 750, tareWeightG: 530, abvPercent: 40 },

  // TEQUILA - Blanco/Silver
  { brand: 'Patron', productName: 'Silver', category: 'TEQUILA', sizeMl: 750, tareWeightG: 850, abvPercent: 40 },
  { brand: 'Don Julio', productName: 'Blanco', category: 'TEQUILA', sizeMl: 750, tareWeightG: 920, abvPercent: 40 },
  { brand: 'Casamigos', productName: 'Blanco', category: 'TEQUILA', sizeMl: 750, tareWeightG: 780, abvPercent: 40 },
  { brand: 'Espolon', productName: 'Blanco', category: 'TEQUILA', sizeMl: 750, tareWeightG: 620, abvPercent: 40 },
  { brand: 'Jose Cuervo', productName: 'Especial Silver', category: 'TEQUILA', sizeMl: 750, tareWeightG: 480, abvPercent: 40 },
  { brand: 'Jose Cuervo', productName: 'Especial Silver', category: 'TEQUILA', sizeMl: 1750, tareWeightG: 810, abvPercent: 40 },
  { brand: 'Herradura', productName: 'Silver', category: 'TEQUILA', sizeMl: 750, tareWeightG: 880, abvPercent: 40 },
  { brand: '1800', productName: 'Silver', category: 'TEQUILA', sizeMl: 750, tareWeightG: 690, abvPercent: 40 },

  // TEQUILA - Reposado
  { brand: 'Patron', productName: 'Reposado', category: 'TEQUILA', sizeMl: 750, tareWeightG: 850, abvPercent: 40 },
  { brand: 'Don Julio', productName: 'Reposado', category: 'TEQUILA', sizeMl: 750, tareWeightG: 920, abvPercent: 40 },
  { brand: 'Casamigos', productName: 'Reposado', category: 'TEQUILA', sizeMl: 750, tareWeightG: 780, abvPercent: 40 },
  { brand: 'Jose Cuervo', productName: 'Tradicional Reposado', category: 'TEQUILA', sizeMl: 750, tareWeightG: 560, abvPercent: 40 },

  // TEQUILA - Añejo
  { brand: 'Patron', productName: 'Añejo', category: 'TEQUILA', sizeMl: 750, tareWeightG: 850, abvPercent: 40 },
  { brand: 'Don Julio', productName: 'Añejo', category: 'TEQUILA', sizeMl: 750, tareWeightG: 920, abvPercent: 40 },
  { brand: 'Casamigos', productName: 'Añejo', category: 'TEQUILA', sizeMl: 750, tareWeightG: 780, abvPercent: 40 },

  // MEZCAL
  { brand: 'Del Maguey', productName: 'Vida', category: 'MEZCAL', sizeMl: 750, tareWeightG: 580, abvPercent: 42 },
  { brand: 'Ilegal', productName: 'Joven', category: 'MEZCAL', sizeMl: 750, tareWeightG: 620, abvPercent: 40 },
  { brand: 'Montelobos', productName: 'Mezcal', category: 'MEZCAL', sizeMl: 750, tareWeightG: 680, abvPercent: 43.2 },

  // BRANDY & COGNAC
  { brand: 'Hennessy', productName: 'VS', category: 'COGNAC', sizeMl: 750, tareWeightG: 720, abvPercent: 40 },
  { brand: 'Hennessy', productName: 'VS', category: 'COGNAC', sizeMl: 1000, tareWeightG: 850, abvPercent: 40 },
  { brand: 'Remy Martin', productName: 'VSOP', category: 'COGNAC', sizeMl: 750, tareWeightG: 780, abvPercent: 40 },
  { brand: 'Courvoisier', productName: 'VS', category: 'COGNAC', sizeMl: 750, tareWeightG: 690, abvPercent: 40 },
  { brand: 'E&J', productName: 'VSOP Brandy', category: 'BRANDY', sizeMl: 750, tareWeightG: 450, abvPercent: 40 },
  { brand: 'E&J', productName: 'VSOP Brandy', category: 'BRANDY', sizeMl: 1750, tareWeightG: 780, abvPercent: 40 },

  // LIQUEURS - Coffee
  { brand: 'Kahlua', productName: 'Coffee Liqueur', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 560, abvPercent: 20 },
  { brand: 'Kahlua', productName: 'Coffee Liqueur', category: 'LIQUEUR', sizeMl: 1750, tareWeightG: 890, abvPercent: 20 },
  { brand: 'Baileys', productName: 'Irish Cream', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 610, abvPercent: 17 },
  { brand: 'Baileys', productName: 'Irish Cream', category: 'LIQUEUR', sizeMl: 1000, tareWeightG: 740, abvPercent: 17 },

  // LIQUEURS - Orange
  { brand: 'Cointreau', productName: 'Liqueur', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 650, abvPercent: 40 },
  { brand: 'Grand Marnier', productName: 'Cordon Rouge', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 720, abvPercent: 40 },
  { brand: 'Triple Sec', productName: 'Generic', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 450, abvPercent: 40 },

  // LIQUEURS - Herbal/Bitter
  { brand: 'Jägermeister', productName: 'Herbal Liqueur', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 680, abvPercent: 35 },
  { brand: 'Jägermeister', productName: 'Herbal Liqueur', category: 'LIQUEUR', sizeMl: 1000, tareWeightG: 820, abvPercent: 35 },
  { brand: 'Campari', productName: 'Bitter', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 580, abvPercent: 25 },
  { brand: 'Aperol', productName: 'Aperitif', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 560, abvPercent: 11 },
  { brand: 'Fernet-Branca', productName: 'Amaro', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 620, abvPercent: 39 },
  { brand: 'St-Germain', productName: 'Elderflower Liqueur', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 880, abvPercent: 20 },

  // LIQUEURS - Other
  { brand: 'Chambord', productName: 'Raspberry Liqueur', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 820, abvPercent: 16.5 },
  { brand: 'Midori', productName: 'Melon Liqueur', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 530, abvPercent: 20 },
  { brand: 'Disaronno', productName: 'Amaretto', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 620, abvPercent: 28 },
  { brand: 'Drambuie', productName: 'Scotch Liqueur', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 680, abvPercent: 40 },
  { brand: 'Frangelico', productName: 'Hazelnut Liqueur', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 710, abvPercent: 20 },

  // ABSINTHE
  { brand: 'Pernod', productName: 'Absinthe', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 620, abvPercent: 68 },
  { brand: 'St. George', productName: 'Absinthe Verte', category: 'LIQUEUR', sizeMl: 750, tareWeightG: 680, abvPercent: 60 },

  // VERMOUTH
  { brand: 'Martini & Rossi', productName: 'Rosso', category: 'OTHER', sizeMl: 750, tareWeightG: 580, abvPercent: 15 },
  { brand: 'Martini & Rossi', productName: 'Extra Dry', category: 'OTHER', sizeMl: 750, tareWeightG: 580, abvPercent: 15 },
  { brand: 'Dolin', productName: 'Dry Vermouth', category: 'OTHER', sizeMl: 750, tareWeightG: 510, abvPercent: 17.5 },
  { brand: 'Carpano', productName: 'Antica Formula', category: 'OTHER', sizeMl: 1000, tareWeightG: 720, abvPercent: 16.5 },
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
