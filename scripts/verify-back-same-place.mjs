import { chromium } from 'playwright';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:6791';
const ARTIFACTS_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function run() {
  console.log('🚀 Starting Full Verification for: "When back make User Get In the Same Place"...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // 1. Authenticate as Admin
  console.log('Authenticating...');
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin authenticated');

  // --- Test 1: Mobile Product Modal Back Button Navigation ---
  console.log('\n--- Test 1: Mobile Product Modal Back Button Navigation ---');
  await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="product-card"]');
  console.log('✓ Products page loaded');

  // Scroll down to 500px
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(400);
  const scrollBeforeModal = await page.evaluate(() => window.scrollY);
  console.log(`Scroll position before opening product modal: ${scrollBeforeModal}px`);

  // Click on the 5th product card
  const cards = page.locator('[data-testid="product-card"]');
  const count = await cards.count();
  console.log(`Found ${count} products on /products`);
  await cards.nth(4).click();
  await page.waitForSelector('role=dialog', { state: 'visible' });
  console.log('✓ Product modal opened successfully');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/back-test-modal-open.png` });

  // Press browser back button (simulating hardware/browser Back)
  console.log('Pressing browser Back button...');
  await page.goBack();
  await page.waitForTimeout(500);

  // Verify modal is closed
  const modalVisible = await page.locator('role=dialog').isVisible();
  console.log(`Modal visible after Back: ${modalVisible} (expected false)`);
  assert.strictEqual(modalVisible, false, 'Modal should be dismissed when user presses Back');

  const scrollAfterModalBack = await page.evaluate(() => window.scrollY);
  console.log(`Scroll position after modal Back: ${scrollAfterModalBack}px (expected ~${scrollBeforeModal}px)`);
  assert(Math.abs(scrollAfterModalBack - scrollBeforeModal) < 30, 'User should be in the exact same place after modal back');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/back-test-after-modal-back.png` });

  // --- Test 2: Category Drawer Back Button Navigation ---
  console.log('\n--- Test 2: Category Drawer Back Button Navigation ---');
  const categoryBtn = page.getByRole('button', { name: /Categories/i });
  await categoryBtn.click();
  await page.waitForSelector('#category-drawer-title', { state: 'visible' });
  console.log('✓ Category drawer opened');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/back-test-drawer-open.png` });

  console.log('Pressing browser Back button to dismiss drawer...');
  await page.goBack();
  await page.waitForTimeout(500);
  const drawerVisible = await page.locator('#category-drawer-title').isVisible();
  console.log(`Drawer visible after Back: ${drawerVisible} (expected false)`);
  assert.strictEqual(drawerVisible, false, 'Drawer should close when user presses Back');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/back-test-after-drawer-back.png` });

  // --- Test 3: Page Navigation & Scroll Restoration (Products <-> Cart) ---
  console.log('\n--- Test 3: Page Navigation & Scroll Restoration (Products <-> Cart) ---');
  // Scroll down to 550px on /products
  await page.evaluate(() => window.scrollTo(0, 550));
  await page.waitForTimeout(500);
  const scrollBeforeCart = await page.evaluate(() => window.scrollY);
  console.log(`Scroll position on /products before navigating away: ${scrollBeforeCart}px`);

  // Navigate to Cart via visible cart link
  const cartLink = page.locator('header a[href="/cart"]:visible').first();
  await cartLink.click();
  await page.waitForURL('**/cart');
  await page.waitForTimeout(400);
  console.log('✓ Navigated to /cart');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/back-test-cart-page.png` });

  // Verify in-app Back button exists and click it
  const backBtn = page.getByRole('button', { name: /Back/i });
  assert.strictEqual(await backBtn.isVisible(), true, 'In-app Back button should be visible in Cart');
  console.log('Clicking in-app "Back" button...');
  await backBtn.click();
  await page.waitForURL('**/products');
  await page.waitForTimeout(800); // Wait for scroll restoration
  console.log('✓ Navigated back to /products');

  const scrollAfterCartBack = await page.evaluate(() => window.scrollY);
  console.log(`Scroll position on /products after coming back: ${scrollAfterCartBack}px (expected ~${scrollBeforeCart}px)`);
  const diff = Math.abs(scrollAfterCartBack - scrollBeforeCart);
  console.log(`Scroll position difference: ${diff}px`);
  assert(diff < 40, `Scroll restoration failed: expected ~${scrollBeforeCart}px, got ${scrollAfterCartBack}px (diff: ${diff}px)`);
  await page.screenshot({ path: `${ARTIFACTS_DIR}/back-test-after-cart-back.png` });

  // --- Test 4: Category Filter & State Restoration When Navigating Back ---
  console.log('\n--- Test 4: Category Filter & State Restoration When Navigating Back ---');
  // Click on a category in the horizontal chips or drawer
  const chipButton = page.locator('button:has-text("Networking")').first();
  let selectedCategoryName = 'Networking';
  if (await chipButton.isVisible()) {
    await chipButton.click();
  } else {
    // Open drawer and select category
    await page.getByRole('button', { name: /Categories/i }).click();
    await page.waitForSelector('#category-drawer-title');
    const firstCat = page.locator('div.animate-in button').nth(1);
    selectedCategoryName = (await firstCat.innerText()).split('\n')[0].trim();
    await firstCat.click();
  }
  await page.waitForTimeout(600);

  // Verify category name updated in page heading
  const headingText = await page.locator('main h1').innerText();
  console.log(`Active heading on /products: "${headingText}"`);

  // Scroll down within this category to 400px
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(400);
  const scrollInCat = await page.evaluate(() => window.scrollY);
  console.log(`Scroll position in category "${headingText}": ${scrollInCat}px`);

  // Navigate to /cart
  await page.locator('header a[href="/cart"]:visible').first().click();
  await page.waitForURL('**/cart');
  console.log('✓ Navigated to /cart');

  // Press browser Back button
  console.log('Pressing browser Back button from /cart...');
  await page.goBack();
  await page.waitForURL('**/products*');
  await page.waitForTimeout(800);

  // Check category heading
  const restoredHeading = await page.locator('main h1').innerText();
  console.log(`Restored heading on /products: "${restoredHeading}" (expected "${headingText}")`);
  assert.strictEqual(restoredHeading, headingText, 'Category filter must be restored when pressing Back');

  // Check scroll
  const restoredScrollInCat = await page.evaluate(() => window.scrollY);
  console.log(`Restored scroll position: ${restoredScrollInCat}px (expected ~${scrollInCat}px)`);
  const catDiff = Math.abs(restoredScrollInCat - scrollInCat);
  assert(catDiff < 40, `Scroll restoration in category failed: diff was ${catDiff}px`);
  await page.screenshot({ path: `${ARTIFACTS_DIR}/back-test-category-restored.png` });

  console.log('\n🎉 ALL 4 BACK NAVIGATION & PLACE RESTORATION TESTS PASSED PERFECTLY!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
