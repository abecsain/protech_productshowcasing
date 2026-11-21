import { chromium } from 'playwright';
import { db } from '../lib/db.ts';

const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING VERIFICATION: CATEGORY ADDITION & INLINE PRODUCT MODAL CATEGORY ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('response', res => {
    if (res.url().includes('/api/admin/categories')) {
      console.log(`API RESPONSE [${res.status()}]:`, res.url());
    }
  });

  try {
    // 1. Login as Admin
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:6791/admin/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder*="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In as Admin")');
    await page.waitForURL('**/admin');
    console.log('✓ Admin login successful');

    // 2. Go to Products Page
    console.log('2. Navigating to Admin Products page...');
    await page.goto('http://localhost:6791/admin/products');
    await page.waitForLoadState('networkidle');

    // 3. Test Top Category Addition Form
    console.log('3. Testing top category addition form...');
    const topCatName = `Top Cat ${Date.now() % 10000}`;
    const topCatInput = page.locator('input[placeholder*="Add category name"]');
    await topCatInput.fill(topCatName);
    const addCatBtn = page.locator('form:has(input[placeholder*="Add category name"]) button[type="submit"]');
    await addCatBtn.click();
    // Wait for the new category badge to appear
    await page.waitForSelector(`text="${topCatName}"`, { timeout: 6000 });
    console.log(`✓ Top category creation verified: "${topCatName}" appeared in category list.`);

    // 4. Test Product Modal with Inline Category Addition
    console.log('4. Opening Add Product Modal...');
    await page.click('button:has-text("Add Product")');
    await page.waitForSelector('text="Add New Product"', { timeout: 5000 });

    // Screenshot 1: Modal initial state with "+ New Category" button
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-modal-product-add-new-category-btn.png` });
    console.log('✓ Saved screenshot: admin-modal-product-add-new-category-btn.png');

    // Click "+ New Category" inside modal
    console.log('5. Clicking "+ New Category" inside product modal...');
    const newCatBtn = page.locator('button:has-text("New Category")');
    await newCatBtn.click();

    // Verify inline category input appears
    await page.waitForSelector('input[placeholder*="Smart Watches"]', { timeout: 3000 });
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-modal-product-inline-category-input.png` });
    console.log('✓ Saved screenshot: admin-modal-product-inline-category-input.png');

    // Type a new inline category name
    const inlineCatName = `Robotics Kit ${Date.now() % 10000}`;
    const inlineInput = page.locator('input[placeholder*="Smart Watches"]');
    await inlineInput.fill(inlineCatName);

    // Click Save & Select
    console.log(`6. Saving & selecting inline category: "${inlineCatName}"...`);
    await page.click('button:has-text("Save & Select")');

    // Wait for toast and dropdown to auto-select the new category
    await page.waitForSelector(':has-text("created and selected")', { timeout: 5000 });
    
    // Verify the category dropdown now selects the new category
    await page.waitForFunction(
      (expectedText) => {
        const el = document.querySelector('select[aria-label="Category"]');
        if (!el) return false;
        const selectedOption = el.options[el.selectedIndex];
        return selectedOption && selectedOption.textContent.includes(expectedText);
      },
      inlineCatName,
      { timeout: 5000 }
    );
    console.log(`✓ Category dropdown automatically selected "${inlineCatName}"!`);

    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-modal-product-category-auto-selected.png` });
    console.log('✓ Saved screenshot: admin-modal-product-category-auto-selected.png');

    // 7. Complete product creation with 0 photos (optional photos feature)
    console.log('7. Completing product creation...');
    await page.fill('input[placeholder*="Cisco Gigabit Switch"]', `Test Robot Unit ${Date.now() % 1000}`);
    await page.fill('input[placeholder*="4999"]', '14999');
    await page.fill('textarea[placeholder*="technical specifications"]', 'High precision automated robotics testing device.');
    
    // Click Create Product (modal submit button)
    await page.click('form button[type="submit"]:has-text("Create Product")');

    // Wait for modal to close and product to show in the list
    await page.waitForSelector('text="Product created successfully"', { timeout: 5000 });
    console.log('✓ Product created successfully with inline category and 0 photos!');

    // Clean up created test category and test product from DB
    console.log('8. Cleaning up test data...');
    const database = db();
    await database.execute({
      sql: 'DELETE FROM products WHERE name LIKE ?',
      args: ['Test Robot Unit%']
    });
    await database.execute({
      sql: 'DELETE FROM categories WHERE name = ? OR name = ?',
      args: [topCatName, inlineCatName]
    });
    console.log('✓ Test data cleaned up.');

    console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
