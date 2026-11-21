import { chromium } from 'playwright';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const PORT = 6791;
const BASE_URL = `http://localhost:${PORT}`;
const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function run() {
  console.log('--- STARTING ADMIN DELETE USER VERIFICATION ---');

  // 1. Ensure test user exists in DB to be deleted
  const testMobile = '9876543299';
  const testName = 'Dev Testing Customer To Delete';
  await db.execute({
    sql: 'DELETE FROM users WHERE mobile = ?',
    args: [testMobile],
  });

  const hash = await bcrypt.hash('StrongPass@123', 12);
  const insertRes = await db.execute({
    sql: 'INSERT INTO users (name, mobile, password_hash, price_visible) VALUES (?, ?, ?, 1) RETURNING id',
    args: [testName, testMobile, hash],
  });
  const createdUserId = Number(insertRes.rows[0].id);
  console.log(`✓ Created disposable test user #${createdUserId} (${testName})`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 2. Admin Login
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin successfully authenticated');

  // 3. Go to Admin Users page
  await page.goto(`${BASE_URL}/admin/users`);
  await page.waitForSelector('table');

  // Search for the disposable test user
  await page.fill('input[placeholder*="Search by name"]', 'Dev Testing Customer');
  await page.waitForTimeout(600); // wait for debounce
  
  const userRow = page.locator('tbody tr').filter({ hasText: testName });
  await userRow.first().waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Found test user in admin desktop table');

  // Desktop view: locate Delete button in this user's row
  const deleteBtn = userRow.locator('button:has-text("Delete")').first();
  await deleteBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Desktop Delete button is clearly visible');

  // Click Delete button to open Delete Customer Account modal
  await deleteBtn.click();
  await page.waitForSelector('text=Delete Customer Account');
  await page.waitForSelector('text=Warning: Permanent Action');
  console.log('✓ Delete Customer Account modal displayed with confirmation warning');

  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-delete-user-modal-desktop.png` });
  console.log('✓ Saved: admin-delete-user-modal-desktop.png');

  // Confirm Deletion in modal
  const confirmDeleteBtn = page.locator('button:has-text("Delete Account")');
  await confirmDeleteBtn.click();

  // Wait for deletion toast
  await page.waitForSelector(`text=deleted permanently`);
  console.log('✓ Success toast verified');

  // Verify user is gone from table
  await page.waitForTimeout(500);
  const existsInTable = await page.locator('tbody tr').filter({ hasText: testName }).count();
  if (existsInTable === 0) {
    console.log('✓ User successfully removed from table immediately!');
  } else {
    throw new Error('User still visible in table after deletion');
  }

  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-after-deletion-desktop.png` });
  console.log('✓ Saved: admin-users-after-deletion-desktop.png');

  // 4. Verify in Database that user is gone
  const dbCheck = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [createdUserId],
  });
  if (dbCheck.rows.length === 0) {
    console.log(`✓ Database verification passed: User #${createdUserId} completely deleted from DB`);
  } else {
    throw new Error(`User #${createdUserId} still present in database!`);
  }

  // 5. Test Mobile UI with a second disposable user
  const mobileTestUser = '9876543298';
  const mobileTestName = 'Mobile Delete Test Customer';
  await db.execute({
    sql: 'DELETE FROM users WHERE mobile = ?',
    args: [mobileTestUser],
  });
  const insertRes2 = await db.execute({
    sql: 'INSERT INTO users (name, mobile, password_hash, price_visible) VALUES (?, ?, ?, 1) RETURNING id',
    args: [mobileTestName, mobileTestUser, hash],
  });
  const createdUserId2 = Number(insertRes2.rows[0].id);
  console.log(`✓ Created second disposable test user #${createdUserId2} for mobile UI verification`);

  // Mobile Context (375x667)
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const mobilePage = await mobileContext.newPage();

  // Set admin session cookie from desktop context
  const cookies = await context.cookies();
  await mobileContext.addCookies(cookies);

  await mobilePage.goto(`${BASE_URL}/admin/users`);
  await mobilePage.waitForSelector('input[placeholder*="Search by name"]');
  await mobilePage.fill('input[placeholder*="Search by name"]', 'Mobile Delete');
  await mobilePage.waitForTimeout(600);

  const mobileCard = mobilePage.locator('div.sm\\:hidden > div').filter({ hasText: mobileTestName }).first();
  await mobileCard.waitFor({ state: 'visible', timeout: 5000 });
  console.log('✓ Found mobile test user card in mobile view');

  // Open the "..." menu on this specific card
  const moreBtn = mobileCard.locator('button[aria-label="More options"]');
  await moreBtn.click();
  await mobilePage.waitForSelector('button:has-text("Delete User")');
  console.log('✓ Mobile action menu opened with "Delete User" option');

  await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/admin-delete-user-menu-mobile.png` });
  console.log('✓ Saved: admin-delete-user-menu-mobile.png');

  // Click Delete User in mobile menu
  await mobilePage.click('button:has-text("Delete User")');
  await mobilePage.waitForSelector('text=Delete Customer Account');
  console.log('✓ Mobile confirmation modal displayed');

  await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/admin-delete-user-modal-mobile.png` });
  console.log('✓ Saved: admin-delete-user-modal-mobile.png');

  // Confirm deletion
  await mobilePage.click('button:has-text("Delete Account")');
  await mobilePage.waitForSelector(`text=deleted permanently`);
  console.log('✓ Mobile deletion confirmed with toast');

  // Verify in DB
  const dbCheck2 = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [createdUserId2],
  });
  if (dbCheck2.rows.length === 0) {
    console.log(`✓ Database verification passed: User #${createdUserId2} completely deleted from DB`);
  } else {
    throw new Error(`User #${createdUserId2} still present in database!`);
  }

  // 6. Security verification: unauthenticated DELETE request
  const unauthRes = await fetch(`${BASE_URL}/api/admin/users/1`, {
    method: 'DELETE',
  });
  if (unauthRes.status === 401 || unauthRes.status === 403) {
    console.log(`✓ Security verified: Unauthenticated DELETE returned ${unauthRes.status}`);
  } else {
    throw new Error(`Unauthenticated DELETE returned unexpected status: ${unauthRes.status}`);
  }

  await browser.close();
  console.log('=== ALL ADMIN DELETE USER VERIFICATIONS PASSED! ===');
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
