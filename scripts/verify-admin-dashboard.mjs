import { chromium } from 'playwright';

async function verifyAdminDashboard() {
  console.log('🚀 Running Admin Dashboard Verification (Single horizontal lines & Back button)...');
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'mobile-360', width: 360, height: 780 },
    { name: 'laptop-1280', width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    console.log(`\n📱 Testing on ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // 1. Login as Admin
    await page.goto('http://localhost:6791/admin/login', { waitUntil: 'networkidle' });
    await page.fill('input#username', 'admin');
    await page.fill('input#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin', { timeout: 10000 });
    console.log(`  [✓] Logged in to Admin Dashboard`);

    await page.waitForTimeout(600);

    // 2. Verify Back Button
    const backBtn = page.locator('a:has-text("Back to Store")');
    const backVisible = await backBtn.isVisible();
    console.log(`  [✓] "Back to Store" button visible:`, backVisible);
    if (!backVisible) throw new Error('Back to Store button missing');

    const backHref = await backBtn.getAttribute('href');
    console.log(`  [✓] Back button href:`, backHref);

    // 3. Verify Stat Cards (Total Products and Total Users in SINGLE HORIZONTAL LINE)
    const productStat = page.locator('text=Total Products').locator('xpath=ancestor::div[contains(@class, "bg-white")][1]');
    const userStat = page.locator('text=Total Users').locator('xpath=ancestor::div[contains(@class, "bg-white")][1]');

    const pBox = await productStat.boundingBox();
    const uBox = await userStat.boundingBox();
    console.log(`  [✓] Total Products Card box:`, pBox);
    console.log(`  [✓] Total Users Card box:`, uBox);

    if (!pBox || !uBox) throw new Error('Could not find stat card bounding boxes');
    const yDiffStats = Math.abs(pBox.y - uBox.y);
    console.log(`  [✓] Stat cards vertical difference: ${yDiffStats}px (should be ~0 for single line)`);
    if (yDiffStats > 8) throw new Error(`Stat cards are NOT in a single line! yDiff: ${yDiffStats}px`);

    // 4. Verify Management Cards (Users and Products in SINGLE HORIZONTAL LINE)
    const userManageCard = page.locator('main a[href="/admin/users"]');
    const productManageCard = page.locator('main a[href="/admin/products"]');

    const umBox = await userManageCard.boundingBox();
    const pmBox = await productManageCard.boundingBox();
    console.log(`  [✓] Users Manage Card box:`, umBox);
    console.log(`  [✓] Products Manage Card box:`, pmBox);

    if (!umBox || !pmBox) throw new Error('Could not find management card bounding boxes');
    const yDiffManage = Math.abs(umBox.y - pmBox.y);
    console.log(`  [✓] Management cards vertical difference: ${yDiffManage}px (should be ~0 for single line)`);
    if (yDiffManage > 8) throw new Error(`Management cards are NOT in a single line! yDiff: ${yDiffManage}px`);

    // Screenshot
    const screenshotPath = `docs/screenshots/admin-dashboard-${vp.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  [✓] Saved screenshot: ${screenshotPath}`);

    await context.close();
  }

  await browser.close();
  console.log('\n🎉 ALL ADMIN DASHBOARD SINGLE-LINE & BACK BUTTON CHECKS PASSED 100%!');
}

verifyAdminDashboard().catch((e) => {
  console.error('❌ Verification failed:', e);
  process.exit(1);
});
