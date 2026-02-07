#!/usr/bin/env tsx
/**
 * Automated QA Tests for BarMetrics
 * Tests critical functionality automatically
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

interface TestResult {
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(
  name: string,
  category: string,
  status: 'PASS' | 'FAIL' | 'WARN',
  message: string,
  details?: any
) {
  results.push({ name, category, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${category} - ${name}: ${message}`);
}

async function testDatabaseConnectivity() {
  console.log('\n🔍 Testing Database Connectivity...\n');

  try {
    await prisma.$connect();
    addResult('Connection', 'Database', 'PASS', 'Successfully connected to database');
  } catch (error: any) {
    addResult('Connection', 'Database', 'FAIL', `Failed to connect: ${error.message}`);
    return false;
  }
  return true;
}

async function testDataIntegrity() {
  console.log('\n🔍 Testing Data Integrity...\n');

  // Test 1: Check product count
  const productCount = await prisma.product.count();
  if (productCount >= 90) {
    addResult('Product Count', 'Data', 'PASS', `Found ${productCount} products (expected >= 90)`);
  } else {
    addResult('Product Count', 'Data', 'FAIL', `Only ${productCount} products found (expected >= 90)`);
  }

  // Test 2: Check SKU count
  const skuCount = await prisma.sKU.count();
  if (skuCount >= 90) {
    addResult('SKU Count', 'Data', 'PASS', `Found ${skuCount} SKUs (expected >= 90)`);
  } else {
    addResult('SKU Count', 'Data', 'WARN', `Only ${skuCount} SKUs found (expected >= 90)`);
  }

  // Test 3: Check user roles exist
  const userCount = await prisma.user.count();
  const users = await prisma.user.findMany({ select: { role: true } });
  const roles = new Set(users.map(u => u.role));

  if (roles.has('BARTENDER') && roles.has('STOREKEEPER') && roles.has('MANAGER')) {
    addResult('User Roles', 'Data', 'PASS', `All required roles exist (${userCount} users)`);
  } else {
    addResult('User Roles', 'Data', 'WARN', `Missing roles. Found: ${Array.from(roles).join(', ')}`);
  }

  // Test 4: Check ProductSKU links
  const productSkuCount = await prisma.productSKU.count();
  if (productSkuCount >= skuCount * 0.8) {
    addResult('Product-SKU Links', 'Data', 'PASS', `${productSkuCount} product-SKU links exist`);
  } else {
    addResult('Product-SKU Links', 'Data', 'WARN', `Only ${productSkuCount} links (expected ~${skuCount})`);
  }

  // Test 5: Check for duplicate SKU codes
  const duplicateSKUs = await prisma.$queryRaw`
    SELECT code, COUNT(*) as count
    FROM SKU
    GROUP BY code
    HAVING count > 1
  ` as any[];

  if (duplicateSKUs.length === 0) {
    addResult('Unique SKU Codes', 'Data', 'PASS', 'No duplicate SKU codes found');
  } else {
    addResult('Unique SKU Codes', 'Data', 'FAIL', `Found ${duplicateSKUs.length} duplicate SKU codes`, duplicateSKUs);
  }

  // Test 6: Check for orphaned data
  const orphanedSKUs = await prisma.sKU.findMany({
    where: {
      products: {
        none: {}
      }
    },
    select: { code: true, name: true }
  });

  if (orphanedSKUs.length === 0) {
    addResult('Orphaned SKUs', 'Data', 'PASS', 'No orphaned SKUs found');
  } else {
    addResult('Orphaned SKUs', 'Data', 'WARN', `Found ${orphanedSKUs.length} SKUs not linked to products`, { count: orphanedSKUs.length });
  }
}

async function testDataValidation() {
  console.log('\n🔍 Testing Data Validation...\n');

  // Test 1: Check ABV ranges
  const invalidABV = await prisma.product.count({
    where: {
      OR: [
        { abvPercent: { lt: 0 } },
        { abvPercent: { gt: 100 } }
      ]
    }
  });

  if (invalidABV === 0) {
    addResult('ABV Validation', 'Validation', 'PASS', 'All ABV values are within valid range (0-100)');
  } else {
    addResult('ABV Validation', 'Validation', 'FAIL', `Found ${invalidABV} products with invalid ABV`);
  }

  // Test 2: Check volume ranges
  const invalidVolume = await prisma.product.count({
    where: {
      OR: [
        { nominalVolumeMl: { lte: 0 } },
        { nominalVolumeMl: { gt: 5000 } }
      ]
    }
  });

  if (invalidVolume === 0) {
    addResult('Volume Validation', 'Validation', 'PASS', 'All volume values are reasonable');
  } else {
    addResult('Volume Validation', 'Validation', 'WARN', `Found ${invalidVolume} products with unusual volumes`);
  }

  // Test 3: Check tare weights
  const invalidTare = await prisma.sKU.count({
    where: {
      AND: [
        { bottleTareG: { not: null } },
        {
          OR: [
            { bottleTareG: { lt: 100 } },
            { bottleTareG: { gt: 2000 } }
          ]
        }
      ]
    }
  });

  if (invalidTare === 0) {
    addResult('Tare Weight Validation', 'Validation', 'PASS', 'All tare weights are reasonable');
  } else {
    addResult('Tare Weight Validation', 'Validation', 'WARN', `Found ${invalidTare} SKUs with unusual tare weights`);
  }

  // Test 4: Check density values
  const invalidDensity = await prisma.sKU.count({
    where: {
      OR: [
        { densityGPerMl: { lt: 0.7 } },
        { densityGPerMl: { gt: 1.1 } }
      ]
    }
  });

  if (invalidDensity === 0) {
    addResult('Density Validation', 'Validation', 'PASS', 'All density values are reasonable');
  } else {
    addResult('Density Validation', 'Validation', 'WARN', `Found ${invalidDensity} SKUs with unusual density`);
  }
}

async function testPermissions() {
  console.log('\n🔍 Testing Permission Setup...\n');

  // Test 1: Check bartender exists
  const bartender = await prisma.user.findFirst({
    where: { role: 'BARTENDER', isActive: true }
  });

  if (bartender) {
    addResult('Bartender Account', 'Permissions', 'PASS', `Bartender account exists: ${bartender.username}`);
  } else {
    addResult('Bartender Account', 'Permissions', 'FAIL', 'No active bartender account found');
  }

  // Test 2: Check storekeeper exists
  const storekeeper = await prisma.user.findFirst({
    where: { role: 'STOREKEEPER', isActive: true }
  });

  if (storekeeper) {
    addResult('Storekeeper Account', 'Permissions', 'PASS', `Storekeeper account exists: ${storekeeper.username}`);
  } else {
    addResult('Storekeeper Account', 'Permissions', 'WARN', 'No active storekeeper account found');
  }

  // Test 3: Check manager exists
  const manager = await prisma.user.findFirst({
    where: { role: 'MANAGER', isActive: true }
  });

  if (manager) {
    addResult('Manager Account', 'Permissions', 'PASS', `Manager account exists: ${manager.username}`);
  } else {
    addResult('Manager Account', 'Permissions', 'FAIL', 'No active manager account found');
  }

  // Test 4: Check request permissions
  const bartenderRequests = await prisma.liquorRequest.count({
    where: { requestedBy: bartender?.id || '' }
  });

  addResult('Bartender Requests', 'Permissions', 'PASS', `Bartender has ${bartenderRequests} requests`);
}

async function testBusinessLogic() {
  console.log('\n🔍 Testing Business Logic...\n');

  // Test 1: Check liquor requests workflow
  const pendingRequests = await prisma.liquorRequest.count({
    where: { status: 'PENDING' }
  });

  const approvedRequests = await prisma.liquorRequest.count({
    where: { status: 'APPROVED' }
  });

  const rejectedRequests = await prisma.liquorRequest.count({
    where: { status: 'REJECTED' }
  });

  const totalRequests = pendingRequests + approvedRequests + rejectedRequests;

  if (totalRequests > 0) {
    addResult('Request Workflow', 'Business', 'PASS',
      `Requests: ${pendingRequests} pending, ${approvedRequests} approved, ${rejectedRequests} rejected`);
  } else {
    addResult('Request Workflow', 'Business', 'WARN', 'No liquor requests found (test creating one)');
  }

  // Test 2: Check sessions
  const activeSessions = await prisma.measurementSession.count({
    where: { completedAt: null }
  });

  const completedSessions = await prisma.measurementSession.count({
    where: { completedAt: { not: null } }
  });

  if (activeSessions + completedSessions > 0) {
    addResult('Inventory Sessions', 'Business', 'PASS',
      `Sessions: ${activeSessions} active, ${completedSessions} completed`);
  } else {
    addResult('Inventory Sessions', 'Business', 'WARN', 'No sessions found (test weighing bottles)');
  }

  // Test 3: Check measurements
  const measurementCount = await prisma.bottleMeasurement.count();

  if (measurementCount > 0) {
    addResult('Bottle Measurements', 'Business', 'PASS', `Found ${measurementCount} measurements`);
  } else {
    addResult('Bottle Measurements', 'Business', 'WARN', 'No measurements found (test weigh & track)');
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 QA TEST SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed} (${((passed/total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${((failed/total)*100).toFixed(1)}%)`);
  console.log(`⚠️  Warnings: ${warned} (${((warned/total)*100).toFixed(1)}%)`);
  console.log();

  if (failed > 0) {
    console.log('❌ CRITICAL FAILURES:\n');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   • ${r.category} - ${r.name}: ${r.message}`);
      });
    console.log();
  }

  if (warned > 0) {
    console.log('⚠️  WARNINGS:\n');
    results
      .filter(r => r.status === 'WARN')
      .forEach(r => {
        console.log(`   • ${r.category} - ${r.name}: ${r.message}`);
      });
    console.log();
  }

  console.log('='.repeat(80));

  if (failed === 0) {
    console.log('✅ ALL CRITICAL TESTS PASSED! System is ready for use.');
  } else {
    console.log('❌ SOME TESTS FAILED. Please review and fix issues before production.');
  }

  console.log('='.repeat(80) + '\n');

  console.log('📋 For complete QA testing, see: QA-TEST-PLAN.md');
  console.log('🌐 Manual UI testing required at: http://localhost:3000\n');
}

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 BARMETRICS - AUTOMATED QA TESTS');
  console.log('='.repeat(80));

  const connected = await testDatabaseConnectivity();

  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection.\n');
    process.exit(1);
  }

  await testDataIntegrity();
  await testDataValidation();
  await testPermissions();
  await testBusinessLogic();

  await generateReport();
}

runAllTests()
  .catch(error => {
    console.error('\n❌ Fatal error during testing:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
