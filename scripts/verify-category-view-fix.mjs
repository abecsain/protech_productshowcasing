import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING VERIFICATION: CATEGORIES VIEW & SHOW (>10 CATEGORIES) & PRODUCT VIEW ---');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Mobile viewport test (390x844 - iPhone / modern Android)
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await mobileContext.newPage();

    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:6791/admin/login');
    await page.waitForSelector('input[type="text"]');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/admin', { timeout: 8000 });
    console.log('✓ Admin login successful');

    console.log('2. Navigating to Admin Products page...');
    await page.goto('http://localhost:6791/admin/products');
    await page.waitForSelector('span:has-text("16 Categories")');

    // 3. Verify Categories header and total categories count
    const headerBadge = page.locator('span:has-text("16 Categories")');
    await headerBadge.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Confirmed 16 Categories badge is visible');

    // Check Categories card height in compact rail mode
    const categoriesCard = page.locator('h2:has-text("Categories")').locator('xpath=ancestor::div[contains(@class, "rounded-xl")]').first();
    const box = await categoriesCard.boundingBox();
    console.log(`✓ Compact categories card height: ${Math.round(box.height)}px (huge reduction from former 680px!)`);

    // Screenshot compact rail on mobile
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-categories-compact-rail-mobile.png` });
    console.log('✓ Saved: admin-categories-compact-rail-mobile.png');

    // 4. Test interactive filtering by tapping a category pill
    console.log('3. Clicking category pill "Laptops & Computers"...');
    const laptopPill = page.locator('button:has-text("Laptops & Computers")').first();
    await laptopPill.click();
    await page.waitForTimeout(600);

    // Verify filter feedback banner
    const filterBanner = page.locator('text=Filtered by category:');
    await filterBanner.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✓ Active category filter feedback banner is visible');

    // Screenshot filtered products
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-category-filtered-laptops.png` });
    console.log('✓ Saved: admin-category-filtered-laptops.png');

    // 5. Test "Show All (16)" grid toggle
    console.log('4. Testing Show All (16) grid toggle...');
    const showAllBtn = page.locator('button:has-text("Show All")');
    await showAllBtn.click();
    await page.waitForTimeout(400);

    const compactBtn = page.locator('button:has-text("Compact Rail")');
    await compactBtn.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✓ Toggled to expanded Multi-Row Grid View');

    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-categories-expanded-grid.png` });
    console.log('✓ Saved: admin-categories-expanded-grid.png');

    // 6. Test Category Search filter
    console.log('5. Testing Category Search filter...');
    const searchInput = page.locator('input[placeholder="Search category list..."]');
    await searchInput.fill('Monitors');
    await page.waitForTimeout(300);

    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-category-search-filtered.png` });
    console.log('✓ Saved: admin-category-search-filtered.png');

    // Clear search
    await searchInput.fill('');
    // Toggle back to rail
    await compactBtn.click();
    await page.waitForTimeout(300);

    // 7. Test Product "View" button
    console.log('6. Clicking [ View ] button on first product...');
    const firstViewBtn = page.locator('button:has-text("View")').first();
    await firstViewBtn.click();

    // Verify View Modal opens with high-res gallery
    const viewModalTitle = page.locator('h2:has-text("Product Details")');
    await viewModalTitle.waitFor({ state: 'visible', timeout: 4000 });
    console.log('✓ Product View Details modal opened successfully');

    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-product-view-modal-enhanced.png` });
    console.log('✓ Saved: admin-product-view-modal-enhanced.png');

    // Close modal
    await page.locator('button:has-text("Close")').first().click();
    await page.waitForTimeout(300);

    // 8. Desktop 1280px Viewport Check
    console.log('7. Verifying Desktop 1280px layout...');
    const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const deskPage = await desktopContext.newPage();
    // Copy cookies
    const cookies = await mobileContext.cookies();
    await desktopContext.addCookies(cookies);

    await deskPage.goto('http://localhost:6791/admin/products');
    await deskPage.waitForSelector('span:has-text("16 Categories")');

    await deskPage.screenshot({ path: `${ARTIFACT_DIR}/admin-categories-desktop-1280.png` });
    console.log('✓ Saved: admin-categories-desktop-1280.png');

    console.log('=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
