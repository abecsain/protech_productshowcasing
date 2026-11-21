import { chromium } from 'playwright';
import path from 'node:path';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:6791';
const ARTIFACTS_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function run() {
  console.log('🚀 Verifying Front Screen 3-in-a-row & Total 12 Products...');
  const browser = await chromium.launch({ headless: true });
  // 375x750 mobile viewport matching user's uploaded screenshot
  const context = await browser.newContext({ viewport: { width: 375, height: 750 } });
  const page = await context.newPage();

  // 1. Authenticate as Admin so we can view /home
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin authenticated');

  // 2. Navigate to /home (Front Screen)
  await page.goto(`${BASE_URL}/home`);
  await page.waitForSelector('text=Featured Products');
  await page.waitForSelector('[data-testid="product-card"]');
  console.log('✓ Loaded Front Screen (/home)');

  // 3. Count total products rendered
  const productCards = page.locator('[data-testid="product-card"]');
  const totalCount = await productCards.count();
  console.log(`✓ Total featured products count: ${totalCount}`);
  assert(totalCount >= 9 && totalCount <= 12, `Total products must be between 9 and 12, got: ${totalCount}`);
  assert.strictEqual(totalCount, 12, 'Expected exactly 12 products for 4 complete rows of 3');

  // 4. Verify 3 products in a row
  // Check the CSS grid columns style or card positions
  const grid = page.locator('section div.grid').first();
  const gridClasses = await grid.getAttribute('class');
  console.log('Grid classes:', gridClasses);
  assert(gridClasses.includes('grid-cols-3'), 'Grid must use grid-cols-3 on mobile');

  // Check bounding boxes of the first 3 cards to confirm they have same Y coordinate (same row)
  const box0 = await productCards.nth(0).boundingBox();
  const box1 = await productCards.nth(1).boundingBox();
  const box2 = await productCards.nth(2).boundingBox();
  const box3 = await productCards.nth(3).boundingBox();

  console.log(`Card 0 y: ${box0.y}, Card 1 y: ${box1.y}, Card 2 y: ${box2.y}`);
  console.log(`Card 3 y: ${box3.y} (Row 2)`);

  // Cards 0, 1, 2 should be in row 1 (same y within 2px)
  assert(Math.abs(box0.y - box1.y) < 2, 'Card 0 and Card 1 must be on the same row');
  assert(Math.abs(box1.y - box2.y) < 2, 'Card 1 and Card 2 must be on the same row');

  // Card 3 should be on row 2 (higher y)
  assert(box3.y > box0.y + 50, 'Card 3 must start on row 2');
  console.log('✓ Confirmed: Exactly 3 products in a row on mobile!');

  // Capture screenshot of the front screen
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'front-screen-3-products-per-row-mobile.png') });
  console.log('✓ Captured front-screen-3-products-per-row-mobile.png');

  // 5. Test Desktop View (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'front-screen-desktop-featured-products.png') });
  console.log('✓ Captured front-screen-desktop-featured-products.png');

  await browser.close();
  console.log('🎉 Front Screen 3-in-a-row & 12 Products Verification PASSED!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
