import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  // Test iPhone SE (375x667) - compact mobile viewport
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:6791/admin/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  
  await page.goto('http://localhost:6791/admin/products');
  await page.waitForLoadState('networkidle');

  // Test 1: Open Add New Product modal
  const addBtn = page.locator('button:has-text("+ Add Product"), button:has-text("Add Product")').first();
  await addBtn.click();
  await page.waitForTimeout(500);

  const modalDialog = page.locator('div[role="dialog"] > div.relative').first();
  const box = await modalDialog.boundingBox();
  console.log('Add Product Modal bounding box:', box);

  // Check margins from viewport
  const bottomGap = 667 - (box.y + box.height);
  console.log('Bottom gap (distance from bottom of screen):', bottomGap, 'px (should be > 10px)');
  console.log('Top gap (distance from top of screen):', box.y, 'px (should be > 10px)');
  console.log('Left gap:', box.x, 'px (should be > 10px)');

  await page.screenshot({ path: 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5/mobile-modal-fixed-add-product.png' });
  console.log('Saved screenshot mobile-modal-fixed-add-product.png');

  // Close modal via Cancel or X
  await page.click('div[role="dialog"] button[aria-label="Close modal"]');
  await page.waitForTimeout(300);

  // Test 2: Open Manage Categories modal
  const manageBtn = page.locator('button:has-text("Manage")').first();
  if (await manageBtn.count() > 0) {
    await manageBtn.click();
    await page.waitForTimeout(500);
    const manageBox = await page.locator('div[role="dialog"] > div.relative').first().boundingBox();
    console.log('Manage Categories Modal bounding box:', manageBox);
    const manageBottomGap = 667 - (manageBox.y + manageBox.height);
    console.log('Manage Categories bottom gap:', manageBottomGap, 'px');
    await page.screenshot({ path: 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5/mobile-modal-fixed-manage-categories.png' });
    console.log('Saved screenshot mobile-modal-fixed-manage-categories.png');
  }

  await browser.close();
}

main().catch(console.error);
