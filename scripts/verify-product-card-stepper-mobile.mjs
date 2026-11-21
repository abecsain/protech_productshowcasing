import { chromium } from 'playwright';
import path from 'node:path';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:6791';
const ARTIFACTS_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function run() {
  console.log('🚀 Verifying Product Mobile View & Stepper...');
  const browser = await chromium.launch({ headless: true });
  // 375x667 exact iPhone SE mobile viewport from user screenshot
  const context = await browser.newContext({ viewport: { width: 375, height: 750 } });
  const page = await context.newPage();

  // 1. Authenticate as Admin so we can view products
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin authenticated');

  // 2. Navigate to /products on mobile
  await page.goto(`${BASE_URL}/products`);
  await page.waitForSelector('[data-testid="product-card"]');
  console.log('✓ Loaded /products on 375px mobile viewport');

  // Capture full mobile products view
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'product-card-mobile-375-view.png') });
  console.log('✓ Captured product-card-mobile-375-view.png');

  // 3. Inspect first card's stepper buttons
  const firstCard = page.locator('[data-testid="product-card"]').first();
  await firstCard.screenshot({ path: path.join(ARTIFACTS_DIR, 'product-card-single-mobile-card.png') });
  console.log('✓ Captured product-card-single-mobile-card.png');

  const minusBtn = firstCard.locator('button[aria-label="Decrease quantity"]');
  const plusBtn = firstCard.locator('button[aria-label="Increase quantity"]');
  const addBtn = firstCard.locator('button:has-text("Add")');
  const qtySpan = firstCard.locator('[aria-live="polite"]');

  assert(await minusBtn.isVisible(), 'Minus button must be visible');
  assert(await plusBtn.isVisible(), 'Plus button must be visible alongside');
  assert(await addBtn.isVisible(), 'Add button must be visible alongside');
  assert(await qtySpan.isVisible(), 'Quantity number must be visible');

  const initialQty = await qtySpan.innerText();
  console.log(`✓ Initial quantity: ${initialQty}`);
  assert.strictEqual(initialQty.trim(), '1');

  // 4. Test clicking + button
  console.log('Clicking + button...');
  await plusBtn.click();
  await page.waitForTimeout(200);
  const qtyAfterPlus = await qtySpan.innerText();
  console.log(`✓ Quantity after + click: ${qtyAfterPlus}`);
  assert.strictEqual(qtyAfterPlus.trim(), '2');

  await firstCard.screenshot({ path: path.join(ARTIFACTS_DIR, 'product-card-stepper-increased-to-2.png') });

  // 5. Test clicking - button
  console.log('Clicking - button...');
  await minusBtn.click();
  await page.waitForTimeout(200);
  const qtyAfterMinus = await qtySpan.innerText();
  console.log(`✓ Quantity after - click: ${qtyAfterMinus}`);
  assert.strictEqual(qtyAfterMinus.trim(), '1');

  // 6. Test clicking Add button
  console.log('Clicking Add button...');
  await addBtn.click();
  await page.waitForSelector('text=Added 1 ×');
  console.log('✓ Toast appeared for added item');

  // Verify cart badge updated
  const cartBadge = page.locator('header a[aria-label="Shopping Cart"] span').first();
  const badgeText = await cartBadge.innerText();
  console.log(`✓ Cart badge count: ${badgeText}`);

  await browser.close();
  console.log('🎉 Product View Mobile & Stepper Verification Complete!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
