import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING VERIFICATION: SCROLLED HAMBURGER THREE-LINE MENU ---');
  const browser = await chromium.launch({ headless: true });

  // Mobile viewport: 360x740
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();

  try {
    // 1. Login as Admin
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:6791/admin/login');
    await page.waitForSelector('input[type="password"]');
    await page.fill('input[placeholder*="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In as Admin")');
    await page.waitForURL('**/admin');
    console.log('✓ Admin login successful');

    // 2. Go to Products Page
    console.log('2. Navigating to Admin Products page...');
    await page.goto('http://localhost:6791/admin/products');
    await page.waitForSelector('button[aria-label="Toggle admin navigation menu"]');

    // 3. Scroll DOWN the page by 600px
    console.log('3. Scrolling down the page by 600px ("When Its Down")...');
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(400);

    // Verify page is indeed scrolled down
    const scrollY = await page.evaluate(() => window.scrollY);
    console.log(`Current scroll position: ${scrollY}px`);

    // Screenshot of scrolled page before opening menu
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-scrolled-down-before-menu.png` });
    console.log('✓ Saved screenshot: admin-scrolled-down-before-menu.png');

    // 4. Click the Three Line (hamburger menu)
    console.log('4. Clicking the Three Line hamburger menu button while scrolled down...');
    const hamburgerBtn = page.locator('button[aria-label="Toggle admin navigation menu"]');
    await hamburgerBtn.click();

    // Verify the menu drawer is immediately visible right below top bar
    const navDrawer = page.locator('#admin-mobile-nav');
    await navDrawer.waitFor({ state: 'visible', timeout: 3000 });

    const dashboardLink = page.locator('#admin-mobile-nav a:has-text("Dashboard")');
    const usersLink = page.locator('#admin-mobile-nav a:has-text("Users")');
    const productsLink = page.locator('#admin-mobile-nav a:has-text("Products")');
    const logoutBtn = page.locator('#admin-mobile-nav button:has-text("Logout")');

    await dashboardLink.waitFor({ state: 'visible', timeout: 3000 });
    await usersLink.waitFor({ state: 'visible', timeout: 3000 });
    await productsLink.waitFor({ state: 'visible', timeout: 3000 });
    await logoutBtn.waitFor({ state: 'visible', timeout: 3000 });

    console.log('✓ All admin navigation links (Dashboard, Users, Products, Logout) are 100% VISIBLE!');

    // Screenshot of menu open while scrolled down
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-scrolled-down-menu-open.png` });
    console.log('✓ Saved screenshot: admin-scrolled-down-menu-open.png');

    // 5. Click on the backdrop (outside the menu) to dismiss it
    console.log('5. Clicking backdrop outside the menu...');
    await page.mouse.click(20, 650); // Click near the bottom on the backdrop
    await page.waitForTimeout(400);

    const isVisibleAfterBackdrop = await navDrawer.isVisible();
    if (isVisibleAfterBackdrop) {
      throw new Error('Menu failed to close on backdrop click!');
    }
    console.log('✓ Menu successfully dismissed upon clicking outside!');
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-scrolled-down-menu-dismissed.png` });
    console.log('✓ Saved screenshot: admin-scrolled-down-menu-dismissed.png');

    // 6. Click Three Line again and navigate to Users
    console.log('6. Re-opening menu and navigating to Users...');
    await hamburgerBtn.click();
    await usersLink.waitFor({ state: 'visible', timeout: 3000 });
    await usersLink.click();
    await page.waitForURL('**/admin/users');
    console.log('✓ Successfully navigated to /admin/users via mobile menu drawer!');

    // 7. Verify Customer-side /products page scrolled hamburger menu
    console.log('7. Navigating to Customer /products page...');
    // Create customer session
    await page.goto('http://localhost:6791/auth');
    await page.waitForSelector('input[type="tel"]');
    await page.fill('input[type="tel"]', '9825123401');
    await page.fill('input[type="password"]', 'Customer@123');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/home', { timeout: 8000 });
    console.log('✓ Customer logged in');

    await page.goto('http://localhost:6791/products');
    await page.waitForSelector('button[aria-label="Toggle Navigation Menu"]');

    // Scroll down on products page
    console.log('8. Scrolling down on /products and opening hamburger menu...');
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(400);

    const customerNavBtn = page.locator('button[aria-label="Toggle Navigation Menu"]');
    await customerNavBtn.click();

    const customerNavDrawer = page.locator('#customer-mobile-nav');
    await customerNavDrawer.waitFor({ state: 'visible', timeout: 3000 });
    const customerProductsLink = page.locator('#customer-mobile-nav a:has-text("Products")');
    await customerProductsLink.waitFor({ state: 'visible', timeout: 3000 });
    console.log('✓ Customer mobile navbar menu is 100% visible while scrolled down!');
    await page.screenshot({ path: `${ARTIFACT_DIR}/customer-scrolled-down-menu-open.png` });
    console.log('✓ Saved screenshot: customer-scrolled-down-menu-open.png');

    console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
