const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function fix() {
  const products = await prisma.product.findMany();

  let fixed = 0;
  for (const p of products) {
    let newBrand = p.brand;
    let newProductName = p.productName;

    // If productName equals brand, use productName as brand and clear productName
    if (p.productName === p.brand) {
      newProductName = '';
    }
    // If productName starts with brand, use full productName as brand
    else if (p.productName.toLowerCase().startsWith(p.brand.toLowerCase() + ' ')) {
      newBrand = p.productName;
      newProductName = '';
    }
    // If productName contains more info than brand
    else if (p.productName.length > p.brand.length && p.productName.includes(p.brand)) {
      newBrand = p.productName;
      newProductName = '';
    }

    if (newBrand !== p.brand || newProductName !== p.productName) {
      await prisma.product.update({
        where: { id: p.id },
        data: { brand: newBrand, productName: newProductName }
      });
      console.log(`Fixed: [${p.brand}] ${p.productName} -> [${newBrand}] ${newProductName || '(empty)'}`);
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} products`);

  // Show final list
  const updated = await prisma.product.findMany({
    orderBy: [{ category: 'asc' }, { brand: 'asc' }]
  });

  console.log('\nUpdated product list:');
  updated.forEach((p, i) => {
    const display = p.productName ? `${p.brand} ${p.productName}` : p.brand;
    console.log(`${i + 1}. ${display} (${p.nominalVolumeMl}ml) - ${p.category}`);
  });

  await prisma.$disconnect();
}

fix().catch(console.error);
