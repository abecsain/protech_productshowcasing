import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 812 });

  await page.goto('http://localhost:6791/admin/login');
  console.log('Login URL:', page.url());

  // Check login form
  const passInput = await page.locator('input[type="password"]');
  if (await passInput.count() > 0) {
    const userInput = await page.locator('input[type="text"], input[type="email"]');
    if (await userInput.count() > 0) {
      await userInput.fill('admin@protech.com');
    }
    await passInput.fill('Admin@123'); // Or whatever the admin password is
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
  }

  await page.goto('http://localhost:6791/admin/products');
  await page.waitForTimeout(1000);
  console.log('Current URL:', page.url());
  await page.screenshot({ path: 'scripts/page-view.png' });
  await browser.close();
}

main().catch(console.error);
