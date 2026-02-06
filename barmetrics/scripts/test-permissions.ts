/**
 * API Permission Test Script
 * Tests that role-based permissions are properly enforced
 *
 * Run with: npx tsx scripts/test-permissions.ts
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  test: string;
  expected: number;
  actual: number;
  passed: boolean;
}

const results: TestResult[] = [];

// Helper to make API requests
async function api(
  method: string,
  path: string,
  token?: string,
  body?: object
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Cookie'] = `barmetrics_session=${token}`;
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

// Login and get session token
async function login(username: string, pin: string): Promise<string | null> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });

  if (!response.ok) {
    console.error(`Login failed for ${username}`);
    return null;
  }

  // Extract token from Set-Cookie header
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    const match = setCookie.match(/barmetrics_session=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

// Test helper
function test(name: string, expected: number, actual: number) {
  const passed = expected === actual;
  results.push({ test: name, expected, actual, passed });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${name} (expected ${expected}, got ${actual})`);
}

async function runTests() {
  console.log('\n🔐 API Permission Tests\n');
  console.log('='.repeat(60));

  // ========================================
  // 1. Unauthenticated Access (should be 401)
  // ========================================
  console.log('\n📋 Testing Unauthenticated Access (expect 401)\n');

  let res = await api('GET', '/api/labels');
  test('GET /api/labels without auth', 401, res.status);

  res = await api('GET', '/api/skus');
  test('GET /api/skus without auth', 401, res.status);

  res = await api('GET', '/api/users');
  test('GET /api/users without auth', 401, res.status);

  res = await api('GET', '/api/audit/labels');
  test('GET /api/audit/labels without auth', 401, res.status);

  res = await api('POST', '/api/labels/generate', undefined, { skuId: 'test', quantity: 1 });
  test('POST /api/labels/generate without auth', 401, res.status);

  // ========================================
  // 2. Login as each role
  // ========================================
  console.log('\n📋 Logging in as each role\n');

  const bartenderToken = await login('bar', '1234');
  console.log(`Bartender login: ${bartenderToken ? '✓' : '✗'}`);

  const storekeeperToken = await login('store', '1234');
  console.log(`Storekeeper login: ${storekeeperToken ? '✓' : '✗'}`);

  const managerToken = await login('admin', '1234');
  console.log(`Manager login: ${managerToken ? '✓' : '✗'}`);

  if (!bartenderToken || !storekeeperToken || !managerToken) {
    console.error('\n❌ Failed to login. Make sure the dev server is running and users are seeded.');
    process.exit(1);
  }

  // ========================================
  // 3. Bartender Access Tests
  // ========================================
  console.log('\n📋 Testing Bartender Access\n');

  // Should have access (200)
  res = await api('GET', '/api/labels', bartenderToken);
  test('Bartender: GET /api/labels', 200, res.status);

  res = await api('GET', '/api/skus', bartenderToken);
  test('Bartender: GET /api/skus', 200, res.status);

  res = await api('GET', '/api/locations', bartenderToken);
  test('Bartender: GET /api/locations', 200, res.status);

  // Should NOT have access (403)
  res = await api('POST', '/api/labels/generate', bartenderToken, { skuId: 'test', quantity: 1 });
  test('Bartender: POST /api/labels/generate (should be 403)', 403, res.status);

  res = await api('POST', '/api/skus', bartenderToken, { code: 'TEST', name: 'Test', category: 'VODKA', sizeMl: 750 });
  test('Bartender: POST /api/skus (should be 403)', 403, res.status);

  res = await api('GET', '/api/users', bartenderToken);
  test('Bartender: GET /api/users (should be 403)', 403, res.status);

  res = await api('GET', '/api/audit/labels', bartenderToken);
  test('Bartender: GET /api/audit/labels (should be 403)', 403, res.status);

  // ========================================
  // 4. Storekeeper Access Tests
  // ========================================
  console.log('\n📋 Testing Storekeeper Access\n');

  // Should have access (200)
  res = await api('GET', '/api/labels', storekeeperToken);
  test('Storekeeper: GET /api/labels', 200, res.status);

  res = await api('GET', '/api/skus', storekeeperToken);
  test('Storekeeper: GET /api/skus', 200, res.status);

  res = await api('GET', '/api/audit/labels', storekeeperToken);
  test('Storekeeper: GET /api/audit/labels', 200, res.status);

  res = await api('GET', '/api/locations', storekeeperToken);
  test('Storekeeper: GET /api/locations', 200, res.status);

  // Should NOT have access (403)
  res = await api('GET', '/api/users', storekeeperToken);
  test('Storekeeper: GET /api/users (should be 403)', 403, res.status);

  res = await api('POST', '/api/skus', storekeeperToken, { code: 'TEST', name: 'Test', category: 'VODKA', sizeMl: 750 });
  test('Storekeeper: POST /api/skus (should be 403)', 403, res.status);

  // ========================================
  // 5. Manager Access Tests
  // ========================================
  console.log('\n📋 Testing Manager Access\n');

  // Should have access to everything (200)
  res = await api('GET', '/api/labels', managerToken);
  test('Manager: GET /api/labels', 200, res.status);

  res = await api('GET', '/api/skus', managerToken);
  test('Manager: GET /api/skus', 200, res.status);

  res = await api('GET', '/api/users', managerToken);
  test('Manager: GET /api/users', 200, res.status);

  res = await api('GET', '/api/audit/labels', managerToken);
  test('Manager: GET /api/audit/labels', 200, res.status);

  res = await api('GET', '/api/locations', managerToken);
  test('Manager: GET /api/locations', 200, res.status);

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
    console.log(`\n❌ ${failed}/${total} tests failed:\n`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.test}: expected ${r.expected}, got ${r.actual}`);
    });
    console.log();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
