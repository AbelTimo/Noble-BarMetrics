const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });

const BASE_URL = 'http://localhost:3000';

let passed = 0;
let failed = 0;

function log(test, status, details) {
  const icon = status === 'PASS' ? '✓' : '✗';
  const color = status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
  const msg = details ? test + ' - ' + details : test;
  console.log(color + icon + '\x1b[0m ' + msg);
  if (status === 'PASS') passed++;
  else failed++;
}

async function testAPI(method, endpoint, body) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(BASE_URL + endpoint, options);
    const data = await response.json().catch(() => null);

    return { status: response.status, data, ok: response.ok };
  } catch (error) {
    return { status: 0, data: null, ok: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('   QA TEST SUITE - BarMetrics');
  console.log('========================================\n');

  // ============ PRODUCTS API TESTS ============
  console.log('\n--- PRODUCTS API ---\n');

  // Test: GET all products
  let res = await testAPI('GET', '/api/products');
  if (res.ok && Array.isArray(res.data)) {
    log('GET /api/products', 'PASS', res.data.length + ' products returned');
  } else {
    log('GET /api/products', 'FAIL', res.error || 'Invalid response');
  }

  // Test: GET products with category filter
  res = await testAPI('GET', '/api/products?category=VODKA');
  if (res.ok && Array.isArray(res.data)) {
    const allVodka = res.data.every(p => p.category === 'VODKA');
    log('GET /api/products?category=VODKA', allVodka ? 'PASS' : 'FAIL', res.data.length + ' vodka products');
  } else {
    log('GET /api/products?category=VODKA', 'FAIL');
  }

  // Test: GET products with search
  res = await testAPI('GET', '/api/products?search=jack');
  if (res.ok && Array.isArray(res.data)) {
    log('GET /api/products?search=jack', 'PASS', res.data.length + ' results');
  } else {
    log('GET /api/products?search=jack', 'FAIL');
  }

  // Test: POST create product
  const testProduct = {
    brand: 'Test Brand',
    productName: 'Test Product',
    category: 'VODKA',
    abvPercent: 40,
    nominalVolumeMl: 750,
  };
  res = await testAPI('POST', '/api/products', testProduct);
  let testProductId = null;
  if (res.status === 201 && res.data && res.data.id) {
    testProductId = res.data.id;
    log('POST /api/products', 'PASS', 'Created ID: ' + testProductId);
  } else {
    log('POST /api/products', 'FAIL', res.error || JSON.stringify(res.data));
  }

  // Test: GET single product
  if (testProductId) {
    res = await testAPI('GET', '/api/products/' + testProductId);
    if (res.ok && res.data && res.data.brand === 'Test Brand') {
      log('GET /api/products/:id', 'PASS');
    } else {
      log('GET /api/products/:id', 'FAIL');
    }
  }

  // Test: PUT update product
  if (testProductId) {
    res = await testAPI('PUT', '/api/products/' + testProductId, { abvPercent: 45 });
    if (res.ok && res.data && res.data.abvPercent === 45) {
      log('PUT /api/products/:id', 'PASS', 'ABV updated to 45%');
    } else {
      log('PUT /api/products/:id', 'FAIL');
    }
  }

  // ============ SESSIONS API TESTS ============
  console.log('\n--- SESSIONS API ---\n');

  // Test: POST create standard session
  res = await testAPI('POST', '/api/sessions', {
    name: 'QA Test Session',
    location: 'Test Bar',
    mode: 'standard',
  });
  let testSessionId = null;
  if (res.status === 201 && res.data && res.data.id) {
    testSessionId = res.data.id;
    log('POST /api/sessions (standard)', 'PASS', 'Created ID: ' + testSessionId);
  } else {
    log('POST /api/sessions (standard)', 'FAIL', JSON.stringify(res.data));
  }

  // Test: GET all sessions
  res = await testAPI('GET', '/api/sessions');
  if (res.ok && Array.isArray(res.data)) {
    log('GET /api/sessions', 'PASS', res.data.length + ' sessions');
  } else {
    log('GET /api/sessions', 'FAIL');
  }

  // Test: GET single session
  if (testSessionId) {
    res = await testAPI('GET', '/api/sessions/' + testSessionId);
    if (res.ok && res.data && res.data.name === 'QA Test Session') {
      log('GET /api/sessions/:id', 'PASS');
    } else {
      log('GET /api/sessions/:id', 'FAIL');
    }
  }

  // ============ MEASUREMENTS API TESTS ============
  console.log('\n--- MEASUREMENTS API ---\n');

  // Get a real product for measurement tests
  const products = await prisma.product.findMany({ take: 1 });
  const realProduct = products[0];

  if (testSessionId && realProduct) {
    // Test: POST create measurement
    res = await testAPI('POST', '/api/sessions/' + testSessionId + '/measurements', {
      productId: realProduct.id,
      grossWeightG: 1200,
      tareWeightG: 480,
    });
    let testMeasurementId = null;
    if (res.status === 201 && res.data && res.data.id) {
      testMeasurementId = res.data.id;
      log('POST /api/sessions/:id/measurements', 'PASS', 'Volume: ' + res.data.volumeMl + 'ml');
    } else {
      log('POST /api/sessions/:id/measurements', 'FAIL', JSON.stringify(res.data));
    }

    // Test: Verify measurement calculations
    if (res.data) {
      const m = res.data;
      const netMassCorrect = m.netMassG === 1200 - 480;
      const hasVolume = m.volumeMl > 0;
      const hasPercent = m.percentFull !== null;
      log('Measurement calculations', netMassCorrect && hasVolume && hasPercent ? 'PASS' : 'FAIL',
        'Net: ' + m.netMassG + 'g, Vol: ' + m.volumeMl + 'ml, Full: ' + m.percentFull + '%');
    }

    // Test: DELETE measurement
    if (testMeasurementId) {
      res = await testAPI('DELETE', '/api/measurements/' + testMeasurementId);
      log('DELETE /api/measurements/:id', res.ok ? 'PASS' : 'FAIL');
    }
  }

  // ============ QUICK COUNT MODE TESTS ============
  console.log('\n--- QUICK COUNT MODE ---\n');

  // First, create a completed session with measurements for template
  let sourceSessionId = null;
  res = await testAPI('POST', '/api/sessions', {
    name: 'Source Session for Quick Count',
    mode: 'standard',
  });
  if (res.status === 201) {
    sourceSessionId = res.data.id;

    // Add measurements to source session
    if (realProduct) {
      await testAPI('POST', '/api/sessions/' + sourceSessionId + '/measurements', {
        productId: realProduct.id,
        grossWeightG: 1000,
        tareWeightG: 480,
      });
    }

    // Complete the session
    await testAPI('PUT', '/api/sessions/' + sourceSessionId, {
      completedAt: new Date().toISOString(),
    });

    log('Setup source session', 'PASS', sourceSessionId);
  }

  // Test: GET session template
  if (sourceSessionId) {
    res = await testAPI('GET', '/api/sessions/' + sourceSessionId + '/template');
    if (res.ok && res.data && res.data.products) {
      log('GET /api/sessions/:id/template', 'PASS', res.data.totalProducts + ' products in template');
    } else {
      log('GET /api/sessions/:id/template', 'FAIL');
    }
  }

  // Test: Create quick count session
  let quickCountSessionId = null;
  if (sourceSessionId) {
    res = await testAPI('POST', '/api/sessions', {
      name: 'Quick Count Test',
      mode: 'quick_count',
      sourceSessionId: sourceSessionId,
      defaultPourMl: 30,
    });
    if (res.status === 201 && res.data && res.data.mode === 'quick_count') {
      quickCountSessionId = res.data.id;
      log('POST /api/sessions (quick_count)', 'PASS');
    } else {
      log('POST /api/sessions (quick_count)', 'FAIL', JSON.stringify(res.data));
    }
  }

  // Test: Bulk measurements
  if (quickCountSessionId && realProduct) {
    res = await testAPI('POST', '/api/sessions/' + quickCountSessionId + '/measurements/bulk', {
      measurements: [
        { productId: realProduct.id, grossWeightG: 900 },
      ],
      standardPourMl: 30,
    });
    if (res.status === 201 && res.data && res.data.created > 0) {
      log('POST /api/sessions/:id/measurements/bulk', 'PASS', 'Created ' + res.data.created + ' measurements');
    } else {
      log('POST /api/sessions/:id/measurements/bulk', 'FAIL', JSON.stringify(res.data));
    }
  }

  // ============ ANOMALY DETECTION TESTS ============
  console.log('\n--- ANOMALY DETECTION ---\n');

  // Test anomaly API
  if (quickCountSessionId) {
    res = await testAPI('GET', '/api/sessions/' + quickCountSessionId + '/anomalies');
    if (res.ok && res.data && res.data.summary) {
      log('GET /api/sessions/:id/anomalies', 'PASS',
        res.data.summary.measurementsWithAnomalies + ' anomalies found');
    } else {
      log('GET /api/sessions/:id/anomalies', 'FAIL');
    }
  }

  // Test: Over capacity detection (simulate >105% full)
  const anomalyTestSession = await prisma.measurementSession.create({
    data: { name: 'Anomaly Test', mode: 'standard' }
  });

  if (realProduct) {
    // Create measurement with >105% capacity (very high weight)
    const fullWeight = realProduct.nominalVolumeMl * 0.938 + 480; // ~full bottle
    const overWeight = fullWeight + 100; // Over capacity

    res = await testAPI('POST', '/api/sessions/' + anomalyTestSession.id + '/measurements', {
      productId: realProduct.id,
      grossWeightG: overWeight,
      tareWeightG: 480,
    });

    if (res.data && res.data.percentFull > 100) {
      log('Over capacity detection', 'PASS', res.data.percentFull + '% full detected');
    } else {
      log('Over capacity detection', 'FAIL', 'Got ' + (res.data ? res.data.percentFull : 'null') + '%');
    }
  }

  // ============ VALIDATION TESTS ============
  console.log('\n--- VALIDATION TESTS ---\n');

  // Test: Invalid product creation (missing required fields)
  res = await testAPI('POST', '/api/products', { brand: 'Only Brand' });
  if (res.status === 400) {
    log('Validation: missing required fields', 'PASS', 'Rejected invalid product');
  } else {
    log('Validation: missing required fields', 'FAIL', 'Status: ' + res.status);
  }

  // Test: Invalid ABV (>100%)
  res = await testAPI('POST', '/api/products', {
    brand: 'Test',
    productName: 'Invalid',
    category: 'VODKA',
    abvPercent: 150,
    nominalVolumeMl: 750,
  });
  if (res.status === 400) {
    log('Validation: ABV > 100%', 'PASS', 'Rejected invalid ABV');
  } else {
    log('Validation: ABV > 100%', 'FAIL');
  }

  // Test: Invalid category
  res = await testAPI('POST', '/api/products', {
    brand: 'Test',
    productName: 'Invalid',
    category: 'INVALID_CATEGORY',
    abvPercent: 40,
    nominalVolumeMl: 750,
  });
  if (res.status === 400) {
    log('Validation: invalid category', 'PASS', 'Rejected invalid category');
  } else {
    log('Validation: invalid category', 'FAIL');
  }

  // ============ EDGE CASES ============
  console.log('\n--- EDGE CASES ---\n');

  // Test: Non-existent product
  res = await testAPI('GET', '/api/products/non-existent-id');
  if (res.status === 404) {
    log('Non-existent product returns 404', 'PASS');
  } else {
    log('Non-existent product returns 404', 'FAIL', 'Status: ' + res.status);
  }

  // Test: Non-existent session
  res = await testAPI('GET', '/api/sessions/non-existent-id');
  if (res.status === 404) {
    log('Non-existent session returns 404', 'PASS');
  } else {
    log('Non-existent session returns 404', 'FAIL', 'Status: ' + res.status);
  }

  // ============ CLEANUP ============
  console.log('\n--- CLEANUP ---\n');

  // Delete test data
  if (testProductId) {
    res = await testAPI('DELETE', '/api/products/' + testProductId);
    log('Cleanup: delete test product', res.ok ? 'PASS' : 'FAIL');
  }

  if (testSessionId) {
    res = await testAPI('DELETE', '/api/sessions/' + testSessionId);
    log('Cleanup: delete test session', res.ok ? 'PASS' : 'FAIL');
  }

  if (sourceSessionId) {
    await testAPI('DELETE', '/api/sessions/' + sourceSessionId);
  }

  if (quickCountSessionId) {
    await testAPI('DELETE', '/api/sessions/' + quickCountSessionId);
  }

  await prisma.measurementSession.delete({ where: { id: anomalyTestSession.id } }).catch(() => {});

  // ============ SUMMARY ============
  console.log('\n========================================');
  console.log('   TEST SUMMARY');
  console.log('========================================');
  console.log('\n  \x1b[32m✓ Passed: ' + passed + '\x1b[0m');
  console.log('  \x1b[31m✗ Failed: ' + failed + '\x1b[0m');
  console.log('  Total:   ' + (passed + failed));
  console.log('\n  Success Rate: ' + ((passed / (passed + failed)) * 100).toFixed(1) + '%\n');

  await prisma.$disconnect();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
