import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';

const client = createClient({
  url: `file:${process.cwd()}/prisma/dev.db`,
});

const adapter = new PrismaLibSQL(client);
const prisma = new PrismaClient({ adapter });

const sampleProducts = [
  // Vodka
  {
    brand: "Tito's",
    productName: "Handmade Vodka",
    category: "VODKA",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 485,
  },
  {
    brand: "Grey Goose",
    productName: "Original Vodka",
    category: "VODKA",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 520,
  },
  {
    brand: "Absolut",
    productName: "Original Vodka",
    category: "VODKA",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 490,
  },
  {
    brand: "Ketel One",
    productName: "Vodka",
    category: "VODKA",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 495,
  },
  // Whiskey
  {
    brand: "Jack Daniel's",
    productName: "Old No. 7",
    category: "WHISKEY",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 530,
  },
  {
    brand: "Jameson",
    productName: "Irish Whiskey",
    category: "WHISKEY",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 510,
  },
  {
    brand: "Maker's Mark",
    productName: "Bourbon",
    category: "BOURBON",
    abvPercent: 45,
    nominalVolumeMl: 750,
    defaultTareG: 540,
  },
  {
    brand: "Crown Royal",
    productName: "Canadian Whisky",
    category: "WHISKEY",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 520,
  },
  // Tequila
  {
    brand: "Patrón",
    productName: "Silver",
    category: "TEQUILA",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 610,
  },
  {
    brand: "Don Julio",
    productName: "Blanco",
    category: "TEQUILA",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 580,
  },
  {
    brand: "Jose Cuervo",
    productName: "Especial Gold",
    category: "TEQUILA",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 475,
  },
  // Rum
  {
    brand: "Bacardi",
    productName: "Superior White Rum",
    category: "RUM",
    abvPercent: 40,
    nominalVolumeMl: 1000,
    defaultTareG: 560,
  },
  {
    brand: "Captain Morgan",
    productName: "Original Spiced Rum",
    category: "RUM",
    abvPercent: 35,
    nominalVolumeMl: 750,
    defaultTareG: 485,
  },
  {
    brand: "Malibu",
    productName: "Coconut Rum",
    category: "RUM",
    abvPercent: 21,
    nominalVolumeMl: 750,
    defaultTareG: 470,
  },
  // Gin
  {
    brand: "Tanqueray",
    productName: "London Dry Gin",
    category: "GIN",
    abvPercent: 47.3,
    nominalVolumeMl: 750,
    defaultTareG: 495,
  },
  {
    brand: "Hendrick's",
    productName: "Gin",
    category: "GIN",
    abvPercent: 44,
    nominalVolumeMl: 750,
    defaultTareG: 550,
  },
  {
    brand: "Bombay Sapphire",
    productName: "Gin",
    category: "GIN",
    abvPercent: 47,
    nominalVolumeMl: 750,
    defaultTareG: 510,
  },
  // Brandy/Cognac
  {
    brand: "Hennessy",
    productName: "VS Cognac",
    category: "COGNAC",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 560,
  },
  {
    brand: "Rémy Martin",
    productName: "VSOP",
    category: "COGNAC",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 575,
  },
  // Liqueurs
  {
    brand: "Kahlúa",
    productName: "Coffee Liqueur",
    category: "LIQUEUR",
    abvPercent: 20,
    nominalVolumeMl: 750,
    defaultTareG: 510,
  },
  {
    brand: "Baileys",
    productName: "Irish Cream",
    category: "LIQUEUR",
    abvPercent: 17,
    nominalVolumeMl: 750,
    defaultTareG: 490,
  },
  {
    brand: "Grand Marnier",
    productName: "Cordon Rouge",
    category: "LIQUEUR",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 585,
  },
  {
    brand: "Cointreau",
    productName: "Triple Sec",
    category: "LIQUEUR",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 530,
  },
  // Scotch
  {
    brand: "Johnnie Walker",
    productName: "Black Label",
    category: "SCOTCH",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 515,
  },
  {
    brand: "Glenlivet",
    productName: "12 Year",
    category: "SCOTCH",
    abvPercent: 40,
    nominalVolumeMl: 750,
    defaultTareG: 540,
  },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.bottleMeasurement.deleteMany();
  await prisma.bottleCalibration.deleteMany();
  await prisma.measurementSession.deleteMany();
  await prisma.product.deleteMany();

  // Create products
  for (const product of sampleProducts) {
    const created = await prisma.product.create({
      data: {
        ...product,
        defaultDensity: 0.95,
        isActive: true,
      },
    });

    // Create a default calibration for each product
    if (product.defaultTareG) {
      await prisma.bottleCalibration.create({
        data: {
          productId: created.id,
          tareWeightG: product.defaultTareG,
          calibrationMethod: 'ESTIMATED',
          notes: 'Default estimated tare weight',
        },
      });
    }

    console.log(`Created: ${product.brand} ${product.productName}`);
  }

  // Create a sample measurement session
  const session = await prisma.measurementSession.create({
    data: {
      name: 'Sample Inventory Session',
      location: 'Main Bar',
    },
  });
  console.log(`Created sample session: ${session.name}`);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
