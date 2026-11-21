import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING VERIFICATION: CLICK-OUTSIDE DISMISS & POPULATED USERS/PRODUCTS ---');
  const browser = await chromium.launch({ headless: true });

  // Mobile viewport where the "..." menu exists
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();

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

    // 2. Go to Users Page on Mobile Viewport
    console.log('2. Navigating to Admin Users page (mobile 360x740)...');
    await page.goto('http://localhost:6791/admin/users');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('button[aria-label="More options"]', { timeout: 8000 });

    // Click the "..." button on the first user
    console.log('3. Clicking "..." menu button to open popover...');
    const moreBtn = page.locator('button[aria-label="More options"]').first();
    await moreBtn.click();

    // Verify "Reset Password" popover menu is visible
    const resetMenu = page.locator('.z-40 button:has-text("Reset Password")');
    await resetMenu.waitFor({ timeout: 3000 });
    console.log('✓ "Reset Password" menu opened successfully');

    // Screenshot 1: Menu Open
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-mobile-menu-open.png` });
    console.log('✓ Saved screenshot: admin-users-mobile-menu-open.png');

    // 4. Click outside the menu (on the card background or anywhere outside)
    console.log('4. Clicking outside the menu (backdrop click)...');
    await page.mouse.click(20, 150); // Click on the left side of the screen outside the menu
    await page.waitForTimeout(400);

    // Verify menu is now closed / hidden
    const isVisibleAfterClick = await resetMenu.isVisible();
    if (isVisibleAfterClick) {
      throw new Error('Menu failed to close when clicking outside!');
    }
    console.log('✓ Menu successfully closed immediately upon clicking outside!');

    // Screenshot 2: Menu Closed
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-mobile-menu-dismissed.png` });
    console.log('✓ Saved screenshot: admin-users-mobile-menu-dismissed.png');

    // 5. Test Escape key dismiss
    console.log('5. Testing Escape key dismiss...');
    await moreBtn.click();
    await resetMenu.waitFor({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const isVisibleAfterEscape = await resetMenu.isVisible();
    if (isVisibleAfterEscape) {
      throw new Error('Menu failed to close on Escape key!');
    }
    console.log('✓ Menu successfully closed on Escape key!');

    // 6. Verify Populated Users on Laptop Viewport (1280x900)
    console.log('6. Verifying populated users list and dashboard on laptop...');
    const laptopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const cookies = await context.cookies();
    await laptopContext.addCookies(cookies);
    const laptopPage = await laptopContext.newPage();

    // Check Admin Dashboard counts
    await laptopPage.goto('http://localhost:6791/admin');
    await laptopPage.waitForLoadState('networkidle');
    await laptopPage.screenshot({ path: `${ARTIFACT_DIR}/admin-dashboard-with-populated-counts.png` });
    console.log('✓ Saved screenshot: admin-dashboard-with-populated-counts.png');

    // Check Admin Users Table
    await laptopPage.goto('http://localhost:6791/admin/users');
    await laptopPage.waitForLoadState('networkidle');
    await laptopPage.screenshot({ path: `${ARTIFACT_DIR}/admin-users-populated-table.png` });
    console.log('✓ Saved screenshot: admin-users-populated-table.png');

    console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
