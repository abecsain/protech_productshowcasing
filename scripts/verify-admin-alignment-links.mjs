import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:6791/admin/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  await page.waitForTimeout(1000);

  // Verify alignment
  const statLinks = await page.locator('div.grid.grid-cols-2').first().locator('a').allInnerTexts();
  console.log('Stat cards (row 1):', statLinks);

  const manageLinks = await page.locator('div.grid.grid-cols-2').nth(1).locator('a').allInnerTexts();
  console.log('Manage cards (row 2):', manageLinks);

  // Take screenshot of aligned dashboard
  await page.screenshot({ path: 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5/admin-dashboard-aligned.png' });
  console.log('Saved admin-dashboard-aligned.png');

  // Test clicking Total Products stat number / card
  const prodStat = page.locator('a[aria-label="View Products Dashboard"]').first();
  await prodStat.click();
  await page.waitForURL('**/admin/products');
  console.log('Successfully navigated to Products dashboard via number/stat card:', page.url());

  // Go back to /admin
  await page.goto('http://localhost:6791/admin');
  await page.waitForTimeout(800);

  // Test clicking Total Users stat number / card
  const userStat = page.locator('a[aria-label="View Users Dashboard"]').first();
  await userStat.click();
  await page.waitForURL('**/admin/users');
  console.log('Successfully navigated to Users dashboard via number/stat card:', page.url());

  await browser.close();
}

main().catch(console.error);
