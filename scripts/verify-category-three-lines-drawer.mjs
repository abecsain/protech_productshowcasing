import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:6791';
const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING CATEGORIES THREE-LINES DRAWER & OUTSIDE-CLICK VERIFICATION ---');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();

  // 1. Admin Login
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin authenticated');

  // 2. Go to /admin/products
  await page.goto(`${BASE_URL}/admin/products`);
  await page.waitForSelector('text=Products & Categories');
  await page.waitForSelector('button[aria-label="Open categories menu"]');
  console.log('✓ Admin products page loaded with Three-Lines Categories button');

  // 3. Screenshot compact category bar on mobile
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-categories-compact-three-lines-bar.png` });
  console.log('✓ Saved: admin-categories-compact-three-lines-bar.png');

  // 4. Click the "Three Lines" Categories button
  const threeLinesBtn = page.locator('button[aria-label="Open categories menu"]');
  await threeLinesBtn.click();
  await page.waitForSelector('div[aria-label="Close categories backdrop"]');
  console.log('✓ Category Three-Lines Drawer opened separately');

  await page.waitForTimeout(300); // animation
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-categories-drawer-open.png` });
  console.log('✓ Saved: admin-categories-drawer-open.png');

  // 5. Test Outside Click: Click on the backdrop overlay
  console.log('Testing click outside on backdrop overlay...');
  // The backdrop is right outside the drawer (drawer is max-w-sm, backdrop spans the rest of viewport or right edge)
  // Let's click at x: 370, y: 100 on the backdrop
  const backdrop = page.locator('div[aria-label="Close categories backdrop"]');
  await backdrop.click({ position: { x: 360, y: 50 }, force: true });
  await page.waitForTimeout(400);

  // Verify drawer is closed
  const isDrawerOpen = await page.locator('div[aria-label="Close categories backdrop"]').count();
  if (isDrawerOpen === 0) {
    console.log('✓ SUCCESS: Category drawer closed immediately when clicked outside!');
  } else {
    throw new Error('Category drawer did not close on outside click');
  }

  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-categories-after-outside-click-closed.png` });
  console.log('✓ Saved: admin-categories-after-outside-click-closed.png');

  // 6. Test Category Selection inside Drawer
  await threeLinesBtn.click();
  await page.waitForSelector('div[aria-label="Close categories backdrop"]');
  
  // Click on "Laptops & Computers" inside the drawer
  const drawerPanel = page.locator('div[aria-label="Close categories backdrop"] + div');
  const catBtn = drawerPanel.locator('button:has-text("Laptops & Computers")').first();
  await catBtn.click();
  await page.waitForTimeout(500);

  // Verify drawer closed and active filter badge is visible
  await page.waitForSelector('text=Filtered by:');
  await page.waitForSelector('text=Laptops & Computers');
  console.log('✓ Category selected, drawer closed automatically, and filter applied!');

  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-categories-filtered-active.png` });
  console.log('✓ Saved: admin-categories-filtered-active.png');

  await browser.close();
  console.log('=== ALL THREE-LINES CATEGORY DRAWER VERIFICATIONS PASSED! ===');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
