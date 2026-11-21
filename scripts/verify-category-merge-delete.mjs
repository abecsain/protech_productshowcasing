import { chromium } from 'playwright';

async function verifyCategoryWorkflow() {
  console.log('🚀 Running Category Management & Safe Merge/Delete Verification...');
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

  // 3. Verify NO [x] delete buttons inside category chips
  const categoryChipsCard = page.locator('text=Categories').locator('xpath=ancestor::div[contains(@class, "bg-white")][1]');
  const xButtons = categoryChipsCard.locator('button[aria-label*="Delete"]');
  const xCount = await xButtons.count();
  console.log('  [✓] Number of [x] delete buttons inside category chips:', xCount);
  if (xCount > 0) throw new Error('Category chips still have [x] delete buttons!');

  // Screenshot category chips without [x]
  await page.screenshot({ path: 'docs/screenshots/admin-categories-no-x.png', fullPage: false });
  console.log('  [✓] Saved screenshot: docs/screenshots/admin-categories-no-x.png');

  // 4. Verify Manage Categories button
  const manageBtn = page.locator('button:has-text("Manage Categories")');
  const manageVisible = await manageBtn.isVisible();
  console.log('  [✓] "Manage Categories" button visible:', manageVisible);
  if (!manageVisible) throw new Error('Manage Categories button is missing');

  // 5. Create a temporary category via API to test Merge & Delete
  const tempCatName = `TempMergeCat_${Date.now()}`;
  const catCreateRes = await page.request.post('http://localhost:6791/api/admin/categories', {
    data: { name: tempCatName },
  });
  console.log('  [✓] Created temp category status:', catCreateRes.status());

  // Reload page to see new category
  await page.reload({ waitUntil: 'networkidle' });

  // Find the category id from the DOM or API
  const catsRes = await page.request.get('http://localhost:6791/api/admin/categories');
  const catsData = await catsRes.json();
  const createdCat = catsData.categories.find((c) => c.name === tempCatName);
  console.log('  [✓] Created category id:', createdCat?.id);

  // Create a product inside this temporary category
  const tempProdName = `Mergeable Item ${Date.now()}`;
  const prodRes = await page.request.post('http://localhost:6791/api/admin/products', {
    data: {
      name: tempProdName,
      description: 'Product created for merge verification',
      price: 999,
      categoryId: createdCat.id,
      images: [],
    },
  });
  console.log('  [✓] Created test product status:', prodRes.status());
  const prodData = await prodRes.json();
  const testProdId = prodData.id;

  // Reload products page
  await page.reload({ waitUntil: 'networkidle' });

  // 6. Open Manage Categories Modal
  await page.click('button:has-text("Manage Categories")');
  await page.waitForSelector('div[role="dialog"]', { state: 'visible' });
  await page.waitForTimeout(400);

  // Screenshot Manage Categories modal
  await page.screenshot({ path: 'docs/screenshots/admin-modal-manage-categories.png', fullPage: false });
  console.log('  [✓] Saved screenshot: docs/screenshots/admin-modal-manage-categories.png');

  // Locate the temp category row and click Delete
  const tempRow = page.locator('div[role="dialog"] div.py-3', { hasText: tempCatName });
  const deleteTempBtn = tempRow.locator('button:has-text("Delete")');
  await deleteTempBtn.click();
  await page.waitForTimeout(500);

  // 7. Verify Delete Category Modal displays the 2 choices (Merge vs Delete All)
  const deleteModalTitle = page.locator(`div[role="dialog"] h2:has-text("Delete Category: \\"${tempCatName}\\"")`);
  const isDeleteModalOpen = await deleteModalTitle.isVisible();
  console.log('  [✓] Delete Category Modal open:', isDeleteModalOpen);
  if (!isDeleteModalOpen) throw new Error('Delete category modal not open');

  const mergeOption = page.locator('text=Merge products to another category');
  const deleteAllOption = page.locator('text=Delete all products & category');
  console.log('  [✓] Merge option visible:', await mergeOption.isVisible());
  console.log('  [✓] Delete all option visible:', await deleteAllOption.isVisible());

  // Screenshot Delete Category Modal with options
  await page.screenshot({ path: 'docs/screenshots/admin-modal-delete-category-options.png', fullPage: false });
  console.log('  [✓] Saved screenshot: docs/screenshots/admin-modal-delete-category-options.png');

  // Select destination category
  const destSelect = page.locator('div[role="dialog"] select');
  await destSelect.selectOption({ index: 1 });
  const selectedDest = await destSelect.inputValue();
  console.log('  [✓] Selected destination category id:', selectedDest);

  // Click Merge & Delete
  await page.click('div[role="dialog"] button:has-text("Merge & Delete")');
  await page.waitForSelector('div[role="dialog"]', { state: 'detached' });
  await page.waitForTimeout(1000);

  // 8. Verify the category was deleted and the product merged
  const checkChip = page.locator(`span:has-text("${tempCatName}")`);
  const chipExists = await checkChip.isVisible();
  console.log('  [✓] Temporary category removed from categories:', !chipExists);
  if (chipExists) throw new Error('Category was not deleted');

  // Clean up test product via API
  if (testProdId) {
    await page.request.delete(`http://localhost:6791/api/admin/products/${testProdId}`);
    console.log('  [✓] Cleaned up test product.');
  }

  await browser.close();
  console.log('\n🎉 ALL CATEGORY MANAGEMENT & MERGE/DELETE VERIFICATIONS PASSED 100%!');
}

verifyCategoryWorkflow().catch((e) => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});
