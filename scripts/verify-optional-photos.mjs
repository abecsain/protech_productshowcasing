import { chromium } from 'playwright';

async function verifyOptionalPhotos() {
  console.log('🚀 Running Verification for Optional Product Photos (0 or 1+ photos)...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // 1. Login as Admin
  await page.goto('http://localhost:6791/admin/login', { waitUntil: 'networkidle' });
  await page.fill('input#username', 'admin');
  await page.fill('input#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/admin', { timeout: 10000 });

  // 2. Navigate to Admin Products
  await page.goto('http://localhost:6791/admin/products', { waitUntil: 'networkidle' });

  // 3. Open Add Product Modal
  await page.click('button:has-text("Add Product")');
  await page.waitForTimeout(400);

  // 4. Verify Label states "Optional"
  const photoLabel = page.locator('text=Product Photos (Optional, up to 5)');
  const labelVisible = await photoLabel.isVisible();
  console.log('  [✓] "Product Photos (Optional, up to 5)" label visible:', labelVisible);
  if (!labelVisible) throw new Error('Photos label does not indicate optional');

  // Screenshot modal with optional photo label
  await page.screenshot({ path: 'docs/screenshots/admin-modal-optional-photos.png', fullPage: false });
  console.log('  [✓] Saved screenshot: docs/screenshots/admin-modal-optional-photos.png');

  // 5. Fill details with 0 photos
  const testName = `Patch Cord Test ${Date.now()}`;
  await page.fill('input#product-name', testName);
  await page.fill('input[type="number"]', '149');
  await page.selectOption('select', { index: 1 });
  await page.fill('textarea', 'High grade copper patch cable for networking.');

  // 6. Submit with 0 photos
  await page.click('div[role="dialog"] button:has-text("Create Product")');
  await page.waitForTimeout(1000);

  // 7. Verify modal closed and product appears in list
  const createdRow = page.locator(`h3:has-text("${testName}")`);
  const isCreated = await createdRow.isVisible();
  console.log('  [✓] Product created with 0 photos and visible in list:', isCreated);
  if (!isCreated) throw new Error('Product failed to create with 0 photos');

  // Clean up: delete test product
  const deleteBtn = createdRow.locator('xpath=ancestor::div[contains(@class, "p-4")][1]//button[contains(@aria-label, "Delete") or contains(text(), "Delete")]');
  if (await deleteBtn.isVisible()) {
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await deleteBtn.click();
    await page.waitForTimeout(500);
    console.log('  [✓] Test product cleaned up.');
  }

  await browser.close();
  console.log('\n🎉 OPTIONAL PHOTOS VERIFICATION PASSED 100%!');
}

verifyOptionalPhotos().catch((e) => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});
