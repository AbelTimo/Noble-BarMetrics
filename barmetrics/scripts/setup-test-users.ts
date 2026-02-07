#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function setupTestUsers() {
  console.log('🔄 Checking users in database...\n');

  const users = await prisma.user.findMany({
    select: {
      username: true,
      displayName: true,
      role: true,
      isActive: true,
    },
  });

  console.log(`📋 Found ${users.length} users:\n`);

  if (users.length === 0) {
    console.log('Creating test users...\n');

    await prisma.user.create({
      data: {
        username: 'bartender',
        pin: '1234',
        role: 'BARTENDER',
        displayName: 'Test Bartender',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        username: 'storekeeper',
        pin: '1234',
        role: 'STOREKEEPER',
        displayName: 'Test Storekeeper',
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        username: 'manager',
        pin: '1234',
        role: 'MANAGER',
        displayName: 'Test Manager',
        isActive: true,
      },
    });

    console.log('✅ Created 3 test users:\n');
    console.log('   👤 bartender (PIN: 1234) - BARTENDER role');
    console.log('   👤 storekeeper (PIN: 1234) - STOREKEEPER role');
    console.log('   👤 manager (PIN: 1234) - MANAGER role\n');
  } else {
    users.forEach(user => {
      const status = user.isActive ? '✅' : '❌';
      console.log(`   ${status} ${user.username} - ${user.role} - ${user.displayName}`);
    });
    console.log();
  }
}

setupTestUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
