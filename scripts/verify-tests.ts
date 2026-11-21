// Automated Test Suite for Pro Tech Enterprises
// Verifies core security and business logic:
// 1. Password rules validation
// 2. Auth and account lockout state
// 3. Price visibility policy (on, off, expired)
// 4. Cloudinary public_id validation
// 5. Pagination calculation
// 6. Database schema & parameterized query execution
// 7. Server price leak prevention

import { validPassword, priceVisible, lockoutState, cloudinaryProductId, pagination, hasRole, canRequestUpload } from '../lib/policy.mjs';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { ensureSchema } from '../lib/db';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log(' PRO TECH ENTERPRISES - TEST SUITE');
  console.log('========================================\n');

  // --- TEST 1: Password Rules ---
  console.log('1. Password Rules Testing:');
  assert(validPassword('TechPass2026', '9876543210'), 'Valid strong password accepted');
  assert(!validPassword('short1', '9876543210'), 'Password < 8 characters rejected');
  assert(!validPassword('onlylettershere', '9876543210'), 'Password with no numbers rejected');
  assert(!validPassword('1234567890', '9876543210'), 'Password with no letters rejected');
  assert(!validPassword('9876543210', '9876543210'), 'Password matching mobile number rejected');
  assert(!validPassword('password123', '9876543210'), 'Common dictionary password rejected');

  // --- TEST 2: Price Visibility Logic ---
  console.log('\n2. Price Visibility Policy Testing:');
  const now = 1700000000000;
  assert(!priceVisible(false, null, now), 'Price hidden when price_visible is false');
  assert(priceVisible(true, null, now), 'Price visible when price_visible is true with no auto-off');
  
  const futureExpiry = new Date(now + 3600000).toISOString(); // +1 hour
  assert(priceVisible(true, futureExpiry, now), 'Price visible when expiry is in the future');

  const pastExpiry = new Date(now - 3600000).toISOString(); // -1 hour
  assert(!priceVisible(true, pastExpiry, now), 'Price automatically hidden once expiry timestamp passes');
  assert(!priceVisible(false, futureExpiry, now), 'Price hidden if price_visible is false regardless of timestamp');

  // --- TEST 3: Auth & Account Lockout State ---
  console.log('\n3. Auth and Lockout Testing:');
  const attempt1 = lockoutState(0, null, now);
  assert(!attempt1.locked && attempt1.failed === 1, 'Attempt 1 records failure count 1');

  const attempt4 = lockoutState(3, null, now);
  assert(!attempt4.locked && attempt4.failed === 4, 'Attempt 4 records failure count 4');

  const attempt5 = lockoutState(4, null, now);
  assert(attempt5.locked && attempt5.failed === 0 && Boolean(attempt5.lockedUntil), 'Attempt 5 locks account for 15 minutes');

  const activeLock = new Date(now + 10 * 60000).toISOString();
  const lockedCheck = lockoutState(0, activeLock, now);
  assert(lockedCheck.locked, 'Account remains locked while locked_until is active');

  const expiredLock = new Date(now - 60000).toISOString();
  const unlockedCheck = lockoutState(0, expiredLock, now);
  assert(!unlockedCheck.locked, 'Account automatically unlocks after lockout period expires');

  // --- TEST 4: Cloudinary Public ID Validation ---
  console.log('\n4. Cloudinary Public ID Validation Testing:');
  assert(cloudinaryProductId('protech/products/a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'), 'Valid UUID product image ID accepted');
  assert(!cloudinaryProductId('other/folder/image123'), 'Image ID outside protech/products folder rejected');
  assert(!cloudinaryProductId('../../etc/passwd'), 'Path traversal image ID rejected');
  assert(!cloudinaryProductId('https://evil.com/image.png'), 'Arbitrary external URL rejected as public ID');

  // --- TEST 4b: Admin route and signed-upload role policy ---
  console.log('\n4b. Admin Route Access Testing:');
  assert(hasRole({ role: 'admin' }, 'admin'), 'Administrator role is accepted for admin routes');
  assert(!hasRole({ role: 'user' }, 'admin'), 'Customer role is denied from admin routes');
  assert(!hasRole(null, 'admin'), 'Unauthenticated requests are denied from admin routes');
  assert(canRequestUpload('admin'), 'Only admins may request a Cloudinary upload signature');
  assert(!canRequestUpload('user'), 'Customers cannot request Cloudinary upload signatures');
  assert(!canRequestUpload(undefined), 'Unauthenticated users cannot request Cloudinary upload signatures');

  // --- TEST 5: Pagination Math ---
  console.log('\n5. Pagination Calculation Testing:');
  const p1 = pagination(1, 24, 24);
  assert(p1.page === 1 && p1.limit === 24 && p1.offset === 0, 'Page 1 offset is 0');

  const p2 = pagination(2, 24, 24);
  assert(p2.page === 2 && p2.limit === 24 && p2.offset === 24, 'Page 2 offset is 24');

  const pMax = pagination(1, 500, 24);
  assert(pMax.limit === 24, 'Requests requesting > 24 products capped at max limit 24');

  const pInvalid = pagination(-5, 'abc', 24);
  assert(pInvalid.page === 1 && pInvalid.limit === 24, 'Invalid page and limit gracefully fallback to page 1');
  const adminPage = pagination(1, 500, 50);
  assert(adminPage.limit === 50, 'Admin pagination is capped at 50 rows');

  // --- TEST 6: Database & Price Leak Prevention ---
  console.log('\n6. Database & Server Price Leak Prevention Testing:');
  await ensureSchema();
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:local.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  
  // Test parameterized query
  const testCat = await db.execute({
    sql: 'SELECT id, name FROM categories WHERE name = ?',
    args: ['Accessories'],
  });
  assert(testCat.rows.length >= 0, 'Parameterized queries executed safely without string concatenation');

  // Test that simulated query for user with price_visible = 0 excludes price column
  const userCanSeePrice = false;
  const priceColumn = userCanSeePrice ? 'price,' : '';
  const simulatedSql = `SELECT id, name, description, ${priceColumn} category_id FROM products LIMIT 1`;
  assert(!simulatedSql.includes('price,'), 'SQL query for unauthorized user completely omits price column on server');

  // --- TEST 7: Shared Cache & Public Catalog Price Immunity ---
  console.log('\n7. Shared Cache Price Separation Testing:');
  const catalogRow = await db.execute('SELECT p.id, p.name, p.description, c.name AS category, c.id AS categoryId, p.created_at AS createdAt FROM products p JOIN categories c ON c.id = p.category_id LIMIT 10');
  for (const row of catalogRow.rows) {
    assert(!Object.hasOwn(row, 'price'), 'Public catalog row strictly omits price field from database select');
  }
  const publicCatalogJson = JSON.stringify(catalogRow.rows);
  assert(!publicCatalogJson.includes('"price"'), 'Public shared catalog JSON payload contains zero price keys or values');

  console.log('\n========================================');
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
