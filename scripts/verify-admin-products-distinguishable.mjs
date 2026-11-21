import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:6791';
const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING ADMIN PRODUCTS MOBILE DISTINGUISHABLE CARDS VERIFICATION ---');
  const browser = await chromium.launch({ headless: true });

  // 1. Authenticate admin
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin authenticated');

  // 2. Go to /admin/products
  await page.goto(`${BASE_URL}/admin/products`);
  await page.waitForSelector('text=Products & Categories');
  // Wait for product cards to render
  await page.waitForSelector('div.sm\\:hidden .rounded-xl');
  console.log('✓ Found mobile product cards');

  // 3. Take screenshot of iPhone SE (375x667)
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-products-distinguishable-mobile-375.png` });
  console.log('✓ Saved: admin-products-distinguishable-mobile-375.png');

  // 4. Scroll down directly to the product cards section
  await page.evaluate(() => {
    const el = document.querySelector('div.sm\\:hidden');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-products-list-distinguishable-full.png` });
  console.log('✓ Saved: admin-products-list-distinguishable-full.png');

  // 5. Test iPhone 14 (390x844) viewport
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-products-distinguishable-mobile-390.png` });
  console.log('✓ Saved: admin-products-distinguishable-mobile-390.png');

  // 6. Test View Details Modal from a card
  const firstViewBtn = page.locator('div.sm\\:hidden button:has-text("View Details")').first();
  await firstViewBtn.click();
  await page.waitForSelector('text=Product Details');
  console.log('✓ Product View Details modal opened cleanly from card');
  await page.screenshot({ path: `${ARTIFACT_DIR}/admin-products-view-modal-from-card.png` });
  console.log('✓ Saved: admin-products-view-modal-from-card.png');

  // Close modal
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  await browser.close();
  console.log('=== ALL PRODUCTS DISTINGUISHABLE CARD VERIFICATIONS PASSED! ===');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
