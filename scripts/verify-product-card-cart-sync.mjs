import { chromium } from 'playwright';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:6791';
const ARTIFACTS_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function run() {
  console.log('🚀 Starting Full Verification for Product Cart Sync & Stepper Transformation...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  // 1. Authenticate as Admin
  console.log('1. Authenticating as admin...');
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin authenticated');

  // Clear cart in localStorage to ensure clean state
  await page.evaluate(() => localStorage.removeItem('pte_cart'));

  // 2. Navigate to /products
  console.log('2. Navigating to /products...');
  await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="product-card"]');
  console.log('✓ Products loaded');

  // Verify first product shows "Add" button and no stepper initially
  const firstCard = page.locator('[data-testid="product-card"]').first();
  const addBtn = firstCard.locator('button:has-text("Add")');
  assert(await addBtn.isVisible(), 'Initial state must show "Add" button');
  console.log('✓ Initial state shows clean "Add" button');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/cart-sync-1-initial-state.png` });

  // 3. Click "Add" button on first product
  console.log('3. Clicking "Add" on first product...');
  await addBtn.click();
  await page.waitForTimeout(400);

  // Verify it transformed into stepper [ - 1 + ]
  const stepper = firstCard.locator('[aria-label="Quantity selector"]');
  assert(await stepper.isVisible(), 'Card must transform into quantity stepper once added');
  const qtyText = await stepper.locator('span').innerText();
  console.log(`✓ Stepper is visible with quantity: ${qtyText}`);
  assert.strictEqual(qtyText, '1', 'Quantity should be 1');

  // Verify in-cart badge on image
  const inCartBadge = firstCard.locator('text=1 in cart');
  assert(await inCartBadge.isVisible(), 'Image should show "✓ 1 in cart" badge');
  console.log('✓ Image shows "✓ 1 in cart" badge');

  // Verify header cart badge shows 1
  const cartBadge = page.locator('header a[href="/cart"]:visible').locator('span');
  console.log('✓ Header cart badge text:', await cartBadge.innerText());
  assert.strictEqual(await cartBadge.innerText(), '1', 'Header cart badge must show 1');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/cart-sync-2-added-to-cart.png` });

  // 4. Click "+" on the card stepper
  console.log('4. Clicking "+" on the card stepper...');
  const plusBtn = stepper.locator('button[aria-label="Increase quantity"]');
  await plusBtn.click();
  await page.waitForTimeout(400);

  const updatedQty = await stepper.locator('span').innerText();
  console.log(`✓ Quantity incremented to: ${updatedQty}`);
  assert.strictEqual(updatedQty, '2', 'Quantity should be 2 after pressing "+"');

  const badgeUpdated = firstCard.locator('text=2 in cart');
  assert(await badgeUpdated.isVisible(), 'Badge must update to "✓ 2 in cart"');
  console.log('✓ Badge updated to 2 in cart');

  // Header cart badge shows 2
  assert.strictEqual(await cartBadge.innerText(), '2', 'Header cart badge must show 2');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/cart-sync-3-incremented-to-2.png` });

  // 5. Navigate to /cart and verify sync
  console.log('5. Navigating to /cart...');
  await page.locator('header a[href="/cart"]:visible').first().click();
  await page.waitForURL('**/cart');
  console.log('✓ Arrived at /cart');

  // Verify cart item shows quantity 2
  const cartItemStepper = page.locator('[aria-label="Quantity selector"]').first();
  const cartQtyVal = await cartItemStepper.locator('span').innerText();
  console.log(`✓ Cart page item quantity: ${cartQtyVal}`);
  assert.strictEqual(cartQtyVal, '2', 'Cart page must show quantity 2');

  // Increment quantity in cart from 2 to 3
  console.log('Incrementing quantity in cart to 3...');
  await cartItemStepper.locator('button[aria-label="Increase quantity"]').click();
  await page.waitForTimeout(300);
  const cartQtyValAfter = await cartItemStepper.locator('span').innerText();
  console.log(`✓ Cart page quantity after increment: ${cartQtyValAfter}`);
  assert.strictEqual(cartQtyValAfter, '3', 'Cart page quantity should be 3');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/cart-sync-4-cart-page-qty-3.png` });

  // 6. Navigate back to /products using in-app "Back" button
  console.log('6. Clicking in-app "Back" button to return to /products...');
  await page.getByRole('button', { name: /Back/i }).click();
  await page.waitForURL('**/products');
  await page.waitForTimeout(600);
  console.log('✓ Returned to /products');

  // Verify product #1 immediately shows quantity 3 and "✓ 3 in cart"
  const returnedFirstCard = page.locator('[data-testid="product-card"]').first();
  const returnedStepper = returnedFirstCard.locator('[aria-label="Quantity selector"]');
  assert(await returnedStepper.isVisible(), 'Stepper must be visible on products page');
  const returnedQtyText = await returnedStepper.locator('span').innerText();
  console.log(`✓ Products screen card quantity after returning: ${returnedQtyText}`);
  assert.strictEqual(returnedQtyText, '3', 'Products screen must show 3');

  const badge3 = returnedFirstCard.locator('text=3 in cart');
  assert(await badge3.isVisible(), 'Badge must show "✓ 3 in cart"');
  console.log('✓ Products screen shows "✓ 3 in cart" badge');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/cart-sync-5-products-screen-synced-3.png` });

  // 7. Decrement down on /products to 0 (remove from cart)
  console.log('7. Decrementing product on /products to 0...');
  const minusBtn = returnedStepper.locator('button').first();

  // 3 -> 2
  await minusBtn.click();
  await page.waitForTimeout(300);
  console.log('Decremented to 2');

  // 2 -> 1
  await minusBtn.click();
  await page.waitForTimeout(300);
  console.log('Decremented to 1');

  // 1 -> 0 (should show trash icon and remove)
  await minusBtn.click();
  await page.waitForTimeout(400);
  console.log('Decremented to 0');

  // Verify it transformed back into the "Add" button
  const restoredAddBtn = returnedFirstCard.locator('button:has-text("Add")');
  assert(await restoredAddBtn.isVisible(), 'Card must transform back to "Add" button when quantity reaches 0');
  console.log('✓ Card transformed back into clean "Add" button');

  // Verify in-cart badge is removed
  const badgeVisible = await returnedFirstCard.locator('text=in cart').isVisible();
  assert.strictEqual(badgeVisible, false, 'In-cart badge must be removed');
  console.log('✓ In-cart badge removed');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/cart-sync-6-removed-back-to-add.png` });

  // 8. Test ProductModal cart sync
  console.log('\n8. Testing ProductModal cart sync...');
  // First add product to cart via card
  await restoredAddBtn.click();
  await page.waitForTimeout(400);

  // Now click card to open modal for an already-added product
  await returnedFirstCard.click();
  await page.waitForSelector('[role="dialog"]', { state: 'visible' });
  console.log('✓ Product modal opened for in-cart item');

  // In modal, verify it shows "In Cart:" and stepper with value 1
  const inCartSpan = page.locator('[role="dialog"]').locator('text=In Cart:');
  assert(await inCartSpan.isVisible(), 'Modal must show "In Cart:" for in-cart product');
  console.log('✓ Modal displays "In Cart:" stepper and "Done" button');
  await page.screenshot({ path: `${ARTIFACTS_DIR}/cart-sync-7-modal-in-cart.png` });

  // Increment inside modal
  console.log('Buttons in modal before increment:', await page.locator('[role="dialog"] button').allInnerTexts());
  const modalPlusBtn = page.locator('[role="dialog"]').locator('button[aria-label="Increase quantity"]');
  await modalPlusBtn.click();
  await page.waitForTimeout(400);

  console.log('Buttons in modal after increment:', await page.locator('[role="dialog"] button').allInnerTexts());
  const doneBtn = page.locator('[role="dialog"]').locator('button:has-text("Done")');
  await doneBtn.click();
  await page.waitForTimeout(400);

  // Verify card on page shows 2
  const cardQtyAfterModal = await returnedFirstCard.locator('[aria-label="Quantity selector"] span').innerText();
  console.log(`✓ Card reflects modal addition: ${cardQtyAfterModal}`);
  assert.strictEqual(cardQtyAfterModal, '2', 'Card on page must show 2 after modal addition');

  console.log('\n🎉 ALL PRODUCT CARD CART SYNC & STEPPER TESTS PASSED PERFECTLY!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
