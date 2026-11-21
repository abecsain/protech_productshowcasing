import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:6791';
const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function verify() {
  console.log('--- STARTING MOBILE USERS LIST SLIM & BIFURCATION VERIFICATION ---');
  const browser = await chromium.launch({ headless: true });

  // 1. Authenticate as admin
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin authenticated');

  // 2. Go to /admin/users
  await page.goto(`${BASE_URL}/admin/users`);
  await page.waitForSelector('text=Registered Users');
  await page.waitForTimeout(600); // ensure list is rendered

  // 3. Take screenshot of 375x667 standard iPhone SE viewport
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-mobile-slim-bifurcated-375.png` });
  console.log('✓ Saved: admin-users-mobile-slim-bifurcated-375.png');

  // 4. Also test 390x844 (iPhone 14 / modern Android viewport)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-mobile-slim-bifurcated-390.png` });
  console.log('✓ Saved: admin-users-mobile-slim-bifurcated-390.png');

  // 5. Open action menu on first card to ensure menu dropdown opens neatly
  const firstMoreBtn = page.locator('button[aria-label="More options"]').first();
  await firstMoreBtn.click();
  await page.waitForSelector('text=Reset Password');
  await page.waitForSelector('text=Delete User');
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-mobile-menu-open.png` });
  console.log('✓ Saved: admin-users-mobile-menu-open.png');

  await browser.close();
  console.log('=== VERIFICATION COMPLETE ===');
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
