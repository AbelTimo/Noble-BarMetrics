#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function seedLocations() {
  console.log('📍 Checking locations in database...\n');

  const count = await prisma.location.count();

  if (count > 0) {
    console.log(`✅ Found ${count} existing locations:\n`);
    const locations = await prisma.location.findMany();
    locations.forEach(loc => {
      const badge = loc.isDefault ? '⭐' : '  ';
      console.log(`   ${badge} ${loc.name}`);
    });
  } else {
    console.log('Creating default locations...\n');
    const locations = [
      { name: 'Bar', isDefault: true },
      { name: 'Back Bar', isDefault: false },
      { name: 'Storage Room', isDefault: false },
      { name: 'Cellar', isDefault: false },
      { name: 'Kitchen', isDefault: false },
      { name: 'VIP Area', isDefault: false },
    ];

    for (const location of locations) {
      await prisma.location.create({ data: location });
      const badge = location.isDefault ? '⭐' : '✅';
      console.log(`   ${badge} Created: ${location.name}`);
    }
    console.log('\n✅ Default locations created successfully!');
  }

  await prisma.$disconnect();
}

seedLocations().catch(console.error);
