#!/usr/bin/env tsx
/**
 * Test script for QR Label System
 * Tests all 6 user stories end-to-end
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  story: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];
let authToken = '';

async function makeRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers || {}) as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return response;
}

async function testLogin(): Promise<boolean> {
  console.log('\n🔐 Testing Authentication...');

  try {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: 'admin',
        pin: '1234',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Login failed: ${error}`);
    }

    const data = await response.json();
    authToken = data.token || '';

    // Extract token from Set-Cookie if not in body
    if (!authToken) {
      const cookies = response.headers.get('set-cookie');
      if (cookies) {
        const match = cookies.match(/barmetrics_session=([^;]+)/);
        if (match) {
          authToken = match[1];
        }
      }
    }

    console.log('✅ Login successful');
    console.log(`   User: ${data.user.displayName} (${data.user.role})`);

    results.push({
      story: 'Authentication',
      passed: true,
      details: data.user,
    });

    return true;
  } catch (error) {
    console.error('❌ Login failed:', error);
    results.push({
      story: 'Authentication',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function testCreateSKU(): Promise<string | null> {
  console.log('\n📦 Testing US-QR-01: Create SKU...');

  try {
    const skuData = {
      code: `TEST-${Date.now()}`,
      name: 'Test Vodka 750ml',
      category: 'VODKA',
      sizeMl: 750,
      unit: 'ml',
      description: 'Test SKU for QR system validation',
    };

    const response = await makeRequest('/api/skus', {
      method: 'POST',
      body: JSON.stringify(skuData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SKU creation failed: ${error}`);
    }

    const sku = await response.json();
    console.log('✅ SKU created successfully');
    console.log(`   ID: ${sku.id}`);
    console.log(`   Code: ${sku.code}`);

    results.push({
      story: 'US-QR-01: Create SKU',
      passed: true,
      details: sku,
    });

    return sku.id;
  } catch (error) {
    console.error('❌ SKU creation failed:', error);
    results.push({
      story: 'US-QR-01: Create SKU',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function testGenerateLabels(skuId: string): Promise<string | null> {
  console.log('\n🏷️  Testing US-QR-02: Generate Labels...');

  try {
    const response = await makeRequest('/api/labels/generate', {
      method: 'POST',
      body: JSON.stringify({
        skuId,
        quantity: 5,
        notes: 'Test batch for QR system validation',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Label generation failed: ${error}`);
    }

    const batch = await response.json();
    console.log('✅ Labels generated successfully');
    console.log(`   Batch ID: ${batch.id}`);
    console.log(`   Generated: ${batch.labels.length} labels`);
    console.log(`   First label code: ${batch.labels[0].code}`);

    results.push({
      story: 'US-QR-02: Generate Labels',
      passed: true,
      details: {
        batchId: batch.id,
        labelCount: batch.labels.length,
        firstLabelCode: batch.labels[0].code,
      },
    });

    return batch.labels[0].code;
  } catch (error) {
    console.error('❌ Label generation failed:', error);
    results.push({
      story: 'US-QR-02: Generate Labels',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function testScanLabel(labelCode: string): Promise<string | null> {
  console.log('\n📱 Testing US-QR-04: Scan Label...');

  try {
    const response = await makeRequest(`/api/labels/scan/${labelCode}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Label scan failed: ${error}`);
    }

    const label = await response.json();
    console.log('✅ Label scanned successfully');
    console.log(`   Label: ${label.code}`);
    console.log(`   Status: ${label.status}`);
    console.log(`   SKU: ${label.sku.name}`);

    results.push({
      story: 'US-QR-04: Scan Label',
      passed: true,
      details: {
        labelCode: label.code,
        status: label.status,
        skuName: label.sku.name,
      },
    });

    return label.id;
  } catch (error) {
    console.error('❌ Label scan failed:', error);
    results.push({
      story: 'US-QR-04: Scan Label',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function testAssignLabel(labelId: string): Promise<boolean> {
  console.log('\n📍 Testing US-QR-03: Assign Label...');

  try {
    // Assign the label to Main Bar location
    const response = await makeRequest(`/api/labels/${labelId}/assign`, {
      method: 'POST',
      body: JSON.stringify({
        location: 'Main Bar',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Label assignment failed: ${error}`);
    }

    const label = await response.json();
    console.log('✅ Label assigned successfully');
    console.log(`   Location: ${label.location}`);
    console.log(`   Status: ${label.status}`);

    results.push({
      story: 'US-QR-03: Assign Label',
      passed: true,
      details: {
        location: label.location,
        status: label.status,
      },
    });

    return true;
  } catch (error) {
    console.error('❌ Label assignment failed:', error);
    results.push({
      story: 'US-QR-03: Assign Label',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function testReprintLabel(labelId: string): Promise<boolean> {
  console.log('\n🖨️  Testing US-QR-05: Reprint Label...');

  try {
    const response = await makeRequest(`/api/labels/${labelId}/reprint`, {
      method: 'POST',
      body: JSON.stringify({
        reason: 'DAMAGED',
        description: 'Test reprint for QR system validation',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Label reprint failed: ${error}`);
    }

    const data = await response.json();
    console.log('✅ Label reprinted successfully');
    console.log(`   Old label: ${data.oldLabel.code} (${data.oldLabel.status})`);
    console.log(`   New label: ${data.newLabel.code} (${data.newLabel.status})`);

    results.push({
      story: 'US-QR-05: Reprint Label',
      passed: true,
      details: {
        oldLabelCode: data.oldLabel.code,
        oldLabelStatus: data.oldLabel.status,
        newLabelCode: data.newLabel.code,
        newLabelStatus: data.newLabel.status,
      },
    });

    return true;
  } catch (error) {
    console.error('❌ Label reprint failed:', error);
    results.push({
      story: 'US-QR-05: Reprint Label',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function testAuditHistory(labelId: string): Promise<boolean> {
  console.log('\n📊 Testing US-QR-06: Audit History...');

  try {
    const response = await makeRequest(`/api/labels/${labelId}/history`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Audit history fetch failed: ${error}`);
    }

    const data = await response.json();
    const events = data.events || [];
    console.log('✅ Audit history retrieved successfully');
    console.log(`   Events found: ${events.length}`);

    if (events.length > 0) {
      console.log('   Event types:', events.map((e: any) => e.eventType).join(', '));
    }

    results.push({
      story: 'US-QR-06: Audit History',
      passed: true,
      details: {
        eventCount: events.length,
        eventTypes: events.map((e: any) => e.eventType),
      },
    });

    return true;
  } catch (error) {
    console.error('❌ Audit history fetch failed:', error);
    results.push({
      story: 'US-QR-06: Audit History',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting QR Label System Tests\n');
  console.log('='.repeat(50));

  // Test authentication first
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.error('\n❌ Cannot proceed without authentication');
    printResults();
    return;
  }

  // Run all user story tests
  const skuId = await testCreateSKU();
  if (!skuId) {
    console.error('\n❌ Cannot proceed without SKU');
    printResults();
    return;
  }

  const labelCode = await testGenerateLabels(skuId);
  if (!labelCode) {
    console.error('\n❌ Cannot proceed without labels');
    printResults();
    return;
  }

  const labelId = await testScanLabel(labelCode);
  if (!labelId) {
    console.error('\n❌ Cannot proceed without label ID');
    printResults();
    return;
  }

  await testAssignLabel(labelId);
  await testReprintLabel(labelId);
  await testAuditHistory(labelId);

  printResults();
}

function printResults() {
  console.log('\n' + '='.repeat(50));
  console.log('📋 TEST RESULTS SUMMARY\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.story}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(
    `Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`
  );
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n🎉 All tests passed! QR Label System is working correctly.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
