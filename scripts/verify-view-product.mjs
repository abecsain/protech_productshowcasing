import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING VERIFICATION: ADMIN PRODUCT VIEW MODAL & PHOTO GALLERY ---');
  const browser = await chromium.launch({ headless: true });
  
  // 1. Laptop Viewport (1280x900)
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Login
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:6791/admin/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder*="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In as Admin")');
    await page.waitForURL('**/admin');
    console.log('✓ Admin login successful');

    // Go to Products
    console.log('2. Navigating to Admin Products page...');
    await page.goto('http://localhost:6791/admin/products');
    await page.waitForLoadState('networkidle');

    // Wait for product items to render
    await page.waitForSelector('button:has-text("View")', { timeout: 8000 });
    console.log('✓ View buttons found in product list');

    // Screenshot of products list showing View buttons
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-products-list-with-view-buttons.png` });
    console.log('✓ Saved screenshot: admin-products-list-with-view-buttons.png');

    // Find a product that has photos (e.g. search for Cooler Master or USB or Cable)
    console.log('3. Searching for a product with multiple photos...');
    const searchInput = page.locator('input[placeholder*="Search products"]');
    await searchInput.fill('Cooler Master');
    await page.waitForTimeout(1000); // Debounce / network load

    // Click View on the first product
    console.log('4. Clicking "View" button to open Product Details modal...');
    const firstViewBtn = page.locator('button:has-text("View")').first();
    await firstViewBtn.click();

    // Verify Modal opens
    await page.waitForSelector('text="Product Details"', { timeout: 5000 });
    await page.waitForTimeout(800); // Allow image to render

    // Screenshot of the View Product Modal on Laptop
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-product-view-modal-laptop-1280.png` });
    console.log('✓ Saved screenshot: admin-product-view-modal-laptop-1280.png');

    // Verify photo thumbnail switching if multiple photos
    const thumbs = page.locator('div[role="button"][aria-label*="Select photo"]');
    const thumbCount = await thumbs.count();
    console.log(`Found ${thumbCount} photo thumbnails in gallery.`);
    if (thumbCount > 1) {
      console.log('Testing thumbnail click to switch photo...');
      await thumbs.nth(1).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${ARTIFACT_DIR}/admin-product-view-modal-photo-switched.png` });
      console.log('✓ Saved screenshot: admin-product-view-modal-photo-switched.png');
    }

    // Close modal
    await page.click('button:has-text("Close")');
    await page.waitForTimeout(400);

    // Test clicking product title / row directly to open view modal
    console.log('5. Testing click on product title to open view modal...');
    const firstProductTitle = page.locator('h3:has-text("Cooler Master")').first();
    await firstProductTitle.click();
    await page.waitForSelector('text="Product Details"', { timeout: 5000 });
    console.log('✓ Product row / title click successfully opened view modal!');

    // Test "Edit Product" button from inside view modal
    console.log('6. Testing "Edit Product" button from within View modal...');
    await page.click('button:has-text("Edit Product")');
    await page.waitForSelector('text="Edit Product"', { timeout: 5000 });
    console.log('✓ "Edit Product" modal opened directly from View modal!');
    await page.click('button:has-text("Cancel")');

    // 7. Mobile Viewport Verification (360x740)
    console.log('7. Verifying View Modal on Mobile Viewport (360x740)...');
    const mobileContext = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const mobilePage = await mobileContext.newPage();
    // Copy cookies
    const cookies = await context.cookies();
    await mobileContext.addCookies(cookies);

    await mobilePage.goto('http://localhost:6791/admin/products');
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.waitForSelector('button:has-text("View")', { timeout: 8000 });

    await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/admin-products-mobile-360-list.png` });
    console.log('✓ Saved screenshot: admin-products-mobile-360-list.png');

    // Click View on mobile
    await mobilePage.locator('button:has-text("View")').first().click();
    await mobilePage.waitForSelector('text="Product Details"', { timeout: 5000 });
    await mobilePage.waitForTimeout(800);

    await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/admin-product-view-modal-mobile-360.png` });
    console.log('✓ Saved screenshot: admin-product-view-modal-mobile-360.png');

    console.log('=== ALL VIEW TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
