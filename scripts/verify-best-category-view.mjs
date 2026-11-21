import { chromium } from 'playwright';
import path from 'node:path';

const BASE_URL = 'http://localhost:6791';
const ARTIFACTS_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function run() {
  console.log('🚀 Verifying Best Category View...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const page = await context.newPage();

  // 1. Authenticate as Admin
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Authenticated');

  // 2. Navigate to /products
  await page.goto(`${BASE_URL}/products`);
  await page.waitForSelector('aside');
  await page.waitForSelector('[data-testid="product-card"]');
  console.log('✓ Loaded /products');

  // Take screenshot of pristine category sidebar on desktop
  const asideElement = page.locator('aside');
  await asideElement.screenshot({ path: path.join(ARTIFACTS_DIR, 'best-category-sidebar-desktop.png') });
  console.log('✓ Captured best-category-sidebar-desktop.png');

  // 3. Test selection of a category in the sidebar (e.g. Office Essentials or PC Components)
  const officeEssentialsBtn = page.locator('aside button:has-text("Office Essentials")').first();
  if (await officeEssentialsBtn.count() > 0) {
    await officeEssentialsBtn.click();
    await page.waitForTimeout(400);
    await asideElement.screenshot({ path: path.join(ARTIFACTS_DIR, 'best-category-sidebar-selected.png') });
    console.log('✓ Captured best-category-sidebar-selected.png');
  }

  // 4. Test sidebar category filter search
  const filterInput = page.locator('aside input[placeholder="Filter categories..."]');
  if (await filterInput.count() > 0) {
    await filterInput.fill('Net');
    await page.waitForTimeout(300);
    await asideElement.screenshot({ path: path.join(ARTIFACTS_DIR, 'best-category-sidebar-filtered.png') });
    console.log('✓ Captured best-category-sidebar-filtered.png');
    await filterInput.fill('');
    await page.waitForTimeout(300);
  }

  // Full page view on desktop
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'best-products-page-with-sidebar.png'), fullPage: false });

  // 5. Test Mobile Category View (375x667)
  console.log('Testing Mobile Category Drawer...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE_URL}/products`);
  await page.waitForSelector('[data-testid="product-card"]');

  // Click 3-lines category trigger
  const categoriesBtn = page.locator('button:has-text("Categories")').first();
  await categoriesBtn.click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'best-category-drawer-mobile.png') });
  console.log('✓ Captured best-category-drawer-mobile.png');

  await browser.close();
  console.log('🎉 Category View Verification Complete!');
}

run().catch((err) => {
  console.error('❌ Error during category view verification:', err);
  process.exit(1);
});
