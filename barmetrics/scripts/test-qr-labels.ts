#!/usr/bin/env tsx
/**
 * Test QR Label System
 * Verifies all components of the label system are working
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

async function testQRLabelSystem() {
  console.log('\n🏷️  TESTING QR LABEL SYSTEM\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Check database tables exist
    console.log('\n📋 Test 1: Verify database tables...');
    const labelCount = await prisma.label.count();
    const locationCount = await prisma.location.count();
    const skuCount = await prisma.sKU.count();
    const batchCount = await prisma.labelBatch.count();

    console.log(`   ✅ Labels table: ${labelCount} labels`);
    console.log(`   ✅ Locations table: ${locationCount} locations`);
    console.log(`   ✅ SKUs table: ${skuCount} SKUs`);
    console.log(`   ✅ Label batches table: ${batchCount} batches`);

    // Test 2: Check if we have SKUs to work with
    console.log('\n🏷️  Test 2: Check SKU availability...');
    const sampleSKU = await prisma.sKU.findFirst({
      where: { isActive: true },
      include: { products: { include: { product: true } } }
    });

    if (sampleSKU) {
      console.log(`   ✅ Found active SKU: ${sampleSKU.code} - ${sampleSKU.name}`);
      if (sampleSKU.products.length > 0) {
        console.log(`   ✅ SKU linked to ${sampleSKU.products.length} product(s)`);
      }
    } else {
      console.log('   ⚠️  No active SKUs found - labels cannot be generated');
    }

    // Test 3: Check locations
    console.log('\n📍 Test 3: Check locations...');
    const locations = await prisma.location.findMany({
      where: { isActive: true }
    });

    if (locations.length > 0) {
      console.log(`   ✅ Found ${locations.length} active locations:`);
      locations.slice(0, 5).forEach(loc => {
        const badge = loc.isDefault ? '⭐' : '  ';
        console.log(`      ${badge} ${loc.name}`);
      });
    } else {
      console.log('   ❌ No locations found - run seed-locations.ts');
    }

    // Test 4: Check existing labels
    console.log('\n🏷️  Test 4: Check existing labels...');
    const labels = await prisma.label.findMany({
      take: 5,
      include: { sku: true, locationRef: true },
      orderBy: { createdAt: 'desc' }
    });

    if (labels.length > 0) {
      console.log(`   ✅ Found ${labelCount} total labels (showing 5 most recent):\n`);
      labels.forEach(label => {
        console.log(`      • ${label.code} - ${label.sku.name}`);
        console.log(`        Status: ${label.status}, Location: ${label.locationRef?.name || 'None'}`);
      });
    } else {
      console.log('   📝 No labels exist yet - ready to generate first batch');
    }

    // Test 5: Check label events (audit trail)
    console.log('\n📊 Test 5: Check label event tracking...');
    const eventCount = await prisma.labelEvent.count();
    const recentEvents = await prisma.labelEvent.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { label: { include: { sku: true } } }
    });

    console.log(`   ✅ Total events logged: ${eventCount}`);
    if (recentEvents.length > 0) {
      console.log('   Recent events:');
      recentEvents.forEach(event => {
        console.log(`      • ${event.eventType} - ${event.label.code} (${event.label.sku.name})`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY\n');

    const checks = [
      { name: 'Database tables created', passed: true },
      { name: 'Locations available', passed: locationCount > 0 },
      { name: 'SKUs available', passed: skuCount > 0 },
      { name: 'System ready for label generation', passed: locationCount > 0 && skuCount > 0 }
    ];

    checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      console.log(`${icon} ${check.name}`);
    });

    const allPassed = checks.every(c => c.passed);

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ QR LABEL SYSTEM IS READY!\n');
      console.log('Next steps:');
      console.log('1. Visit http://localhost:3000/labels to view labels');
      console.log('2. Visit http://localhost:3000/labels/generate to create labels');
      console.log('3. Visit http://localhost:3000/scan to scan QR codes');
      console.log('4. Visit http://localhost:3000/skus to manage SKUs\n');
    } else {
      console.log('⚠️  QR LABEL SYSTEM NEEDS SETUP\n');
      console.log('Run: npx tsx scripts/seed-locations.ts');
      console.log('Run: npx tsx scripts/create-skus-from-products.ts\n');
    }

  } catch (error) {
    console.error('\n❌ Error testing QR label system:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testQRLabelSystem();
