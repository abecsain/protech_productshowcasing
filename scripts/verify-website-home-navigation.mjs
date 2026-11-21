import { chromium } from 'playwright';
import assert from 'node:assert';
import path from 'node:path';

const BASE_URL = 'http://localhost:6791';
const ARTIFACTS_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function run() {
  console.log('🚀 Starting Admin & Website Home Navigation Verification...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', resp => {
    if (resp.url().includes('/api/')) {
      console.log('API RESPONSE:', resp.url(), resp.status());
    }
  });

  // Step 1: Login as Admin
  console.log('1. Logging in as Admin...');
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('   Admin logged in successfully at /admin.');

  // Step 2: Check Laptop Sidebar has "Website Home"
  console.log('2. Verifying "Website Home" in Admin Sidebar...');
  const websiteHomeSidebar = page.locator('aside a:has-text("Website Home")');
  await websiteHomeSidebar.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-sidebar-website-home-link.png'), fullPage: false });
  console.log('   "Website Home" link is visible in sidebar.');

  // Step 3: Click "Website Home" and verify navigation to /home
  console.log('3. Clicking "Website Home"...');
  await Promise.all([
    page.waitForResponse(resp => resp.url().includes('/api/products') && resp.status() === 200),
    websiteHomeSidebar.click()
  ]);
  await page.waitForURL('**/home');
  console.log('   Successfully navigated to /home as logged-in admin!');

  // Verify storefront products loaded without 401 error
  await page.waitForSelector('text=Featured Products', { timeout: 8000 });
  const productCards = await page.locator('[data-testid="product-card"], .group.border').count();
  console.log(`   Featured products count on /home: ${productCards}`);
  assert(productCards > 0, 'Featured products should load on /home for logged-in admin');

  // Verify "Admin Panel" button is visible in Navbar
  const adminPanelBtn = page.locator('header a:has-text("Admin Panel")');
  await adminPanelBtn.waitFor({ state: 'visible' });
  console.log('   "Admin Panel" link button is visible in storefront Navbar.');
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'storefront-home-with-admin-badge.png'), fullPage: false });

  // Step 4: Verify navigation to /products works for admin
  console.log('4. Navigating to /products...');
  await page.click('header a:has-text("Products")');
  await page.waitForURL('**/products');
  await page.waitForSelector('input[placeholder="Search products by name..."]', { timeout: 8000 });
  console.log('   Admin can browse /products catalog seamlessly.');

  // Step 5: Test Root URL "/" redirects to "/home"
  console.log('5. Navigating to Root URL "/"...');
  await page.goto(`${BASE_URL}/`);
  await page.waitForURL('**/home');
  console.log('   Root URL "/" successfully resolved to /home!');

  // Step 6: Click "Admin Panel" to return to /admin
  console.log('6. Clicking "Admin Panel" button in Navbar to return to /admin...');
  await page.click('header a:has-text("Admin Panel")');
  await page.waitForURL('**/admin');
  console.log('   Successfully returned to /admin.');

  // Step 7: Mobile Viewport Verification (375px)
  console.log('7. Testing on Mobile Viewport (375x667)...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(`${BASE_URL}/admin`);

  // Mobile Topbar "Website Home" pill button
  const mobileWebsiteHomeBtn = page.locator('header a:has-text("Website Home")');
  await mobileWebsiteHomeBtn.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-mobile-website-home-topbar.png') });
  console.log('   Mobile topbar has "Website Home" link.');

  // Check mobile hamburger menu drawer has "Website Home"
  await page.click('button[aria-label="Toggle admin navigation menu"]');
  const drawerWebsiteHome = page.locator('#admin-mobile-nav a:has-text("Website Home")');
  await drawerWebsiteHome.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-mobile-drawer-website-home.png') });
  console.log('   Mobile drawer has "Website Home" link.');

  // Click "Website Home" from mobile drawer
  await drawerWebsiteHome.click();
  await page.waitForURL('**/home');
  console.log('   Navigated to /home on mobile.');

  // Open mobile menu in storefront and verify "Admin Panel"
  await page.click('button[aria-label="Toggle Navigation Menu"]');
  const mobileAdminPanel = page.locator('#customer-mobile-nav a:has-text("Admin Panel")');
  await mobileAdminPanel.waitFor({ state: 'visible' });
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'storefront-mobile-drawer-admin-panel.png') });
  console.log('   Storefront mobile menu has "Admin Panel" link.');

  await browser.close();
  console.log('🎉 ALL TESTS PASSED! Admin can seamlessly browse and access Website Home.');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
