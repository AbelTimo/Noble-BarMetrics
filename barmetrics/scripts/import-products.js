const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function importProducts() {
  const workbook = XLSX.readFile('/Users/abeltaye/Downloads/Noble_Liquor_Price (1) (1).xlsx');
  const sheet = workbook.Sheets['Liquor_Price'];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Skip non-liquor items
  const skipItems = ['ambo water', 'water', 'soft drink', 'redbull', 'heineken', 'habesha', 'betters'];

  // Category mapping based on product names
  const categoryMap = {
    'patron': 'TEQUILA', 'cuervo': 'TEQUILA', 'camino': 'TEQUILA', 'sierra': 'TEQUILA',
    'corralejo': 'TEQUILA', 'casamigos': 'TEQUILA', 'donjulio': 'TEQUILA', 'gila': 'TEQUILA',
    'absolute': 'VODKA', 'stolichnaya': 'VODKA', 'maraton vodka': 'VODKA',
    'bacardi': 'RUM', 'havana': 'RUM', 'malibu': 'RUM',
    'jack daniel': 'WHISKEY', 'jameson': 'WHISKEY', 'chivas': 'WHISKEY', 'grant': 'WHISKEY',
    'hankey': 'WHISKEY', 'king roberts': 'WHISKEY', 'maker': 'WHISKEY', 'hennesy': 'COGNAC',
    'blue label': 'SCOTCH', 'black label': 'SCOTCH', 'gold label': 'SCOTCH', 'red label': 'SCOTCH',
    'double black': 'SCOTCH', 'glenfiddich': 'SCOTCH', 'black valvent': 'WHISKEY',
    'gordon': 'GIN', 'beefeater': 'GIN', 'bombay': 'GIN', 'maraton gin': 'GIN',
    'bailys': 'LIQUEUR', 'amarula': 'LIQUEUR', 'kahlua': 'LIQUEUR', 'jagermeister': 'LIQUEUR',
    'bols': 'LIQUEUR', 'aperol': 'LIQUEUR', 'campari': 'LIQUEUR', 'fernet': 'LIQUEUR',
    'luxardo': 'LIQUEUR', 'pimms': 'LIQUEUR', 'carpano': 'LIQUEUR',
    'martini': 'LIQUEUR', 'arada': 'OTHER',
    'acacia': 'OTHER', 'rift valley': 'OTHER', 'kemila': 'OTHER', 'sarjento': 'OTHER'
  };

  // Default ABV by category
  const abvMap = {
    'VODKA': 40, 'GIN': 40, 'WHISKEY': 40, 'RUM': 40, 'TEQUILA': 40,
    'SCOTCH': 40, 'COGNAC': 40, 'LIQUEUR': 20, 'BRANDY': 40, 'MEZCAL': 40,
    'BOURBON': 40, 'OTHER': 12
  };

  const products = [];
  const seen = new Set();

  for (const row of data.slice(1)) {
    const item = (row[0] || '').toString().trim();
    if (!item || item === 'Items') continue;

    const lower = item.toLowerCase();

    // Skip non-liquor
    if (skipItems.some(s => lower.includes(s))) continue;

    // Skip glass/shot size variations - we want bottle products
    if (lower.endsWith(' shot') || lower.endsWith(' glass') || lower.includes('galss')) continue;

    // Determine size
    let size = 750;
    if (lower.includes('1l') || lower.includes('1 l')) size = 1000;
    else if (lower.includes('500ml') || lower.includes('500 ml')) size = 500;
    else if (lower.includes('375ml')) size = 375;

    // Clean product name (remove size info)
    let name = item.replace(/\s*(1L|1 L|500ml|500 ml|375ml|750ml)\s*/gi, ' ').trim();

    // Create unique key
    const key = name.toLowerCase() + '_' + size;
    if (seen.has(key)) continue;
    seen.add(key);

    // Find category
    let category = 'OTHER';
    for (const [keyword, cat] of Object.entries(categoryMap)) {
      if (lower.includes(keyword)) {
        category = cat;
        break;
      }
    }

    // Extract brand (first word or two)
    const words = name.split(' ');
    let brand = words[0];
    if (words.length > 1 && words[0].length < 4) {
      brand = words.slice(0, 2).join(' ');
    }

    products.push({
      brand,
      productName: name,
      category,
      abvPercent: abvMap[category] || 40,
      nominalVolumeMl: size,
      defaultDensity: 0.95,
      isActive: true
    });
  }

  console.log(`Found ${products.length} unique products to import:\n`);
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.brand} - ${p.productName} (${p.category}, ${p.nominalVolumeMl}ml, ${p.abvPercent}%)`);
  });

  console.log('\nImporting to database...');

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    try {
      // Check if product already exists
      const existing = await prisma.product.findFirst({
        where: {
          brand: product.brand,
          productName: product.productName,
          nominalVolumeMl: product.nominalVolumeMl
        }
      });

      if (existing) {
        console.log(`  Skipped (exists): ${product.productName}`);
        skipped++;
        continue;
      }

      await prisma.product.create({ data: product });
      console.log(`  Created: ${product.productName}`);
      created++;
    } catch (error) {
      console.error(`  Error creating ${product.productName}:`, error.message);
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);

  await prisma.$disconnect();
}

importProducts().catch(console.error);
