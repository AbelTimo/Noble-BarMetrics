import Database from 'better-sqlite3';

const dbPath = `${process.cwd()}/prisma/dev.db`;
const db = new Database(dbPath);

function generateCuid(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `c${timestamp}${randomPart}`;
}

const sampleProducts = [
  // Vodka
  { brand: "Tito's", productName: "Handmade Vodka", category: "VODKA", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 485 },
  { brand: "Grey Goose", productName: "Original Vodka", category: "VODKA", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 520 },
  { brand: "Absolut", productName: "Original Vodka", category: "VODKA", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 490 },
  { brand: "Ketel One", productName: "Vodka", category: "VODKA", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 495 },
  // Whiskey
  { brand: "Jack Daniel's", productName: "Old No. 7", category: "WHISKEY", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 530 },
  { brand: "Jameson", productName: "Irish Whiskey", category: "WHISKEY", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 510 },
  { brand: "Maker's Mark", productName: "Bourbon", category: "BOURBON", abvPercent: 45, nominalVolumeMl: 750, defaultTareG: 540 },
  { brand: "Crown Royal", productName: "Canadian Whisky", category: "WHISKEY", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 520 },
  // Tequila
  { brand: "Patrón", productName: "Silver", category: "TEQUILA", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 610 },
  { brand: "Don Julio", productName: "Blanco", category: "TEQUILA", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 580 },
  { brand: "Jose Cuervo", productName: "Especial Gold", category: "TEQUILA", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 475 },
  // Rum
  { brand: "Bacardi", productName: "Superior White Rum", category: "RUM", abvPercent: 40, nominalVolumeMl: 1000, defaultTareG: 560 },
  { brand: "Captain Morgan", productName: "Original Spiced Rum", category: "RUM", abvPercent: 35, nominalVolumeMl: 750, defaultTareG: 485 },
  { brand: "Malibu", productName: "Coconut Rum", category: "RUM", abvPercent: 21, nominalVolumeMl: 750, defaultTareG: 470 },
  // Gin
  { brand: "Tanqueray", productName: "London Dry Gin", category: "GIN", abvPercent: 47.3, nominalVolumeMl: 750, defaultTareG: 495 },
  { brand: "Hendrick's", productName: "Gin", category: "GIN", abvPercent: 44, nominalVolumeMl: 750, defaultTareG: 550 },
  { brand: "Bombay Sapphire", productName: "Gin", category: "GIN", abvPercent: 47, nominalVolumeMl: 750, defaultTareG: 510 },
  // Brandy/Cognac
  { brand: "Hennessy", productName: "VS Cognac", category: "COGNAC", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 560 },
  { brand: "Rémy Martin", productName: "VSOP", category: "COGNAC", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 575 },
  // Liqueurs
  { brand: "Kahlúa", productName: "Coffee Liqueur", category: "LIQUEUR", abvPercent: 20, nominalVolumeMl: 750, defaultTareG: 510 },
  { brand: "Baileys", productName: "Irish Cream", category: "LIQUEUR", abvPercent: 17, nominalVolumeMl: 750, defaultTareG: 490 },
  { brand: "Grand Marnier", productName: "Cordon Rouge", category: "LIQUEUR", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 585 },
  { brand: "Cointreau", productName: "Triple Sec", category: "LIQUEUR", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 530 },
  // Scotch
  { brand: "Johnnie Walker", productName: "Black Label", category: "SCOTCH", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 515 },
  { brand: "Glenlivet", productName: "12 Year", category: "SCOTCH", abvPercent: 40, nominalVolumeMl: 750, defaultTareG: 540 },
];

function seed() {
  console.log('Seeding database...');
  const now = new Date().toISOString();

  // Clear existing data
  db.exec('DELETE FROM BottleMeasurement');
  db.exec('DELETE FROM BottleCalibration');
  db.exec('DELETE FROM MeasurementSession');
  db.exec('DELETE FROM Product');

  // Prepare statements
  const insertProduct = db.prepare(`
    INSERT INTO Product (id, brand, productName, category, abvPercent, nominalVolumeMl, defaultDensity, defaultTareG, isActive, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCalibration = db.prepare(`
    INSERT INTO BottleCalibration (id, productId, tareWeightG, fullBottleWeightG, calibrationMethod, notes, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSession = db.prepare(`
    INSERT INTO MeasurementSession (id, name, location, startedAt, completedAt)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Insert products with calibrations
  for (const product of sampleProducts) {
    const productId = generateCuid();

    insertProduct.run(
      productId,
      product.brand,
      product.productName,
      product.category,
      product.abvPercent,
      product.nominalVolumeMl,
      0.95,
      product.defaultTareG,
      1, // isActive = true
      now,
      now
    );

    // Create default calibration
    if (product.defaultTareG) {
      insertCalibration.run(
        generateCuid(),
        productId,
        product.defaultTareG,
        null, // fullBottleWeightG
        'ESTIMATED',
        'Default estimated tare weight',
        now,
        now
      );
    }

    console.log(`Created: ${product.brand} ${product.productName}`);
  }

  // Create sample session
  const sessionId = generateCuid();
  insertSession.run(
    sessionId,
    'Sample Inventory Session',
    'Main Bar',
    now,
    null
  );
  console.log('Created sample session: Sample Inventory Session');

  console.log('Seeding complete!');
}

seed();
db.close();
