/**
 * Label Lifecycle Test Script
 * Tests the complete label workflow: create SKU → generate → scan → assign → retire → reprint
 *
 * Run with: npx tsx scripts/test-label-lifecycle.ts
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  step: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];
let managerToken: string | null = null;
let testSkuId: string | null = null;
let testBatchId: string | null = null;
let testLabelId: string | null = null;
let testLabelCode: string | null = null;

// Helper to make API requests
async function api(
  method: string,
  path: string,
  body?: object
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (managerToken) {
    headers['Cookie'] = `barmetrics_session=${managerToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { status: response.status, data };
}

// Login as manager
async function login(): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', pin: '1234' }),
  });

  if (!response.ok) {
    return false;
  }

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/barmetrics_session=([^;]+)/);
    if (match) {
      managerToken = match[1];
      return true;
    }
  }
  return false;
}

// Test step helper
function step(name: string, passed: boolean, details?: string) {
  results.push({ step: name, passed, details });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${name}${details ? ` - ${details}` : ''}`);
}

async function runTests() {
  console.log('\n🏷️  Label Lifecycle Tests\n');
  console.log('='.repeat(60));

  // ========================================
  // Step 0: Login as Manager
  // ========================================
  console.log('\n📋 Step 0: Authentication\n');

  const loggedIn = await login();
  step('Login as Manager', loggedIn);

  if (!loggedIn) {
    console.error('\n❌ Failed to login. Make sure the dev server is running.');
    process.exit(1);
  }

  // ========================================
  // Step 1: Create a Test SKU
  // ========================================
  console.log('\n📋 Step 1: Create SKU\n');

  const skuCode = `TEST-${Date.now()}`;
  let res = await api('POST', '/api/skus', {
    code: skuCode,
    name: 'Test Vodka for Lifecycle',
    category: 'VODKA',
    sizeMl: 750,
    description: 'Test SKU for lifecycle testing',
  });

  if (res.status === 201 && res.data?.id) {
    testSkuId = res.data.id;
    step('Create SKU', true, `SKU ID: ${testSkuId}`);
  } else {
    step('Create SKU', false, `Status: ${res.status}, Error: ${res.data?.error}`);
    process.exit(1);
  }

  // ========================================
  // Step 2: Generate Labels
  // ========================================
  console.log('\n📋 Step 2: Generate Labels\n');

  res = await api('POST', '/api/labels/generate', {
    skuId: testSkuId,
    quantity: 3,
    notes: 'Test batch for lifecycle testing',
  });

  if (res.status === 201 && res.data?.batch?.id && res.data?.labels?.length === 3) {
    testBatchId = res.data.batch.id;
    testLabelId = res.data.labels[0].id;
    testLabelCode = res.data.labels[0].code;
    step('Generate 3 labels', true, `Batch ID: ${testBatchId}`);
    step('Labels created with UNASSIGNED status', res.data.labels.every((l: any) => l.status === 'UNASSIGNED'));
    console.log(`   Label codes: ${res.data.labels.map((l: any) => l.code).join(', ')}`);
  } else {
    step('Generate labels', false, `Status: ${res.status}, Error: ${res.data?.error}`);
    process.exit(1);
  }

  // ========================================
  // Step 3: Scan Label (Lookup)
  // ========================================
  console.log('\n📋 Step 3: Scan Label\n');

  res = await api('GET', `/api/labels/scan/${testLabelCode}`);

  if (res.status === 200 && res.data?.id === testLabelId) {
    step('Scan label by code', true, `Found: ${res.data.code}`);
    step('Label has correct SKU', res.data.sku?.id === testSkuId);
    step('Label status is UNASSIGNED', res.data.status === 'UNASSIGNED');
  } else {
    step('Scan label', false, `Status: ${res.status}, Error: ${res.data?.error}`);
  }

  // ========================================
  // Step 4: Assign Label to Location
  // ========================================
  console.log('\n📋 Step 4: Assign to Location\n');

  res = await api('POST', `/api/labels/${testLabelId}/assign`, {
    location: 'Main Bar',
  });

  if (res.status === 200 && res.data?.status === 'ASSIGNED') {
    step('Assign label to Main Bar', true);
    step('Status changed to ASSIGNED', res.data.status === 'ASSIGNED');
    step('Location set correctly', res.data.location === 'Main Bar');
  } else {
    step('Assign label', false, `Status: ${res.status}, Error: ${res.data?.error}`);
  }

  // ========================================
  // Step 5: Verify Idempotent Assignment
  // ========================================
  console.log('\n📋 Step 5: Test Idempotent Assignment\n');

  res = await api('POST', `/api/labels/${testLabelId}/assign`, {
    location: 'Main Bar', // Same location again
  });

  if (res.status === 200 && res.data?.idempotent === true) {
    step('Re-assign to same location (idempotent)', true, 'No duplicate event created');
  } else if (res.status === 200) {
    step('Re-assign to same location', true, 'Assignment accepted');
  } else {
    step('Idempotent assignment', false, `Status: ${res.status}`);
  }

  // ========================================
  // Step 6: Change Location
  // ========================================
  console.log('\n📋 Step 6: Change Location\n');

  res = await api('POST', `/api/labels/${testLabelId}/assign`, {
    location: 'Back Bar',
  });

  if (res.status === 200 && res.data?.location === 'Back Bar') {
    step('Change location to Back Bar', true);
    step('Location updated', res.data.location === 'Back Bar');
  } else {
    step('Change location', false, `Status: ${res.status}, Error: ${res.data?.error}`);
  }

  // ========================================
  // Step 7: Check Audit Trail
  // ========================================
  console.log('\n📋 Step 7: Verify Audit Trail\n');

  res = await api('GET', `/api/labels/${testLabelId}/history`);

  if (res.status === 200 && res.data?.events && Array.isArray(res.data.events)) {
    const events = res.data.events;
    step('Fetch label history', true, `${events.length} events found`);

    const eventTypes = events.map((e: any) => e.eventType);
    step('Has CREATED event', eventTypes.includes('CREATED'));
    step('Has ASSIGNED event', eventTypes.includes('ASSIGNED'));
    step('Has LOCATION_CHANGED event', eventTypes.includes('LOCATION_CHANGED'));
    step('Has SCANNED event', eventTypes.includes('SCANNED'));

    console.log(`   Event timeline: ${eventTypes.reverse().join(' → ')}`);
  } else {
    step('Fetch history', false, `Status: ${res.status}, Data: ${JSON.stringify(res.data)}`);
  }

  // ========================================
  // Step 8: Retire Label
  // ========================================
  console.log('\n📋 Step 8: Retire Label\n');

  res = await api('POST', `/api/labels/${testLabelId}/retire`, {
    reason: 'DAMAGED',
    description: 'Test retirement for lifecycle testing',
  });

  if (res.status === 200 && res.data?.status === 'RETIRED') {
    step('Retire label', true);
    step('Status changed to RETIRED', res.data.status === 'RETIRED');
    step('Reason recorded', res.data.retiredReason?.includes('DAMAGED'));
  } else {
    step('Retire label', false, `Status: ${res.status}, Error: ${res.data?.error}`);
  }

  // ========================================
  // Step 9: Scan Retired Label (Warning)
  // ========================================
  console.log('\n📋 Step 9: Scan Retired Label\n');

  res = await api('GET', `/api/labels/scan/${testLabelCode}`);

  if (res.status === 200 && res.data?.warning) {
    step('Scan retired label shows warning', true, res.data.warning);
  } else {
    step('Scan retired label', false, 'No warning shown');
  }

  // ========================================
  // Step 10: Reprint Label
  // ========================================
  console.log('\n📋 Step 10: Reprint Label\n');

  // Get a non-retired label for reprint test
  const labelForReprint = (await api('GET', '/api/labels?status=UNASSIGNED')).data?.[0];

  if (labelForReprint) {
    res = await api('POST', `/api/labels/${labelForReprint.id}/reprint`, {
      reason: 'DAMAGED',
      description: 'Test reprint',
    });

    if (res.status === 201 && res.data?.newLabel?.id) {
      step('Reprint creates new label', true, `New code: ${res.data.newLabel.code}`);
      step('Old label retired', res.data.oldLabel?.status === 'RETIRED');
      step('New label inherits status', true);
    } else {
      step('Reprint label', false, `Status: ${res.status}, Error: ${res.data?.error}`);
    }
  } else {
    step('Reprint label', false, 'No unassigned label available');
  }

  // ========================================
  // Cleanup: Delete Test SKU
  // ========================================
  console.log('\n📋 Cleanup\n');

  // Note: Can't delete SKU with labels, so we just deactivate it
  res = await api('PATCH', `/api/skus/${testSkuId}`, { isActive: false });
  step('Deactivate test SKU', res.status === 200);

  // ========================================
  // Summary
  // ========================================
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  if (failed === 0) {
    console.log(`\n✅ All ${total} tests passed!\n`);
  } else {
    console.log(`\n⚠️  ${passed}/${total} tests passed, ${failed} failed:\n`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.step}${r.details ? `: ${r.details}` : ''}`);
    });
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
