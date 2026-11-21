import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:6791/admin/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  
  await page.goto('http://localhost:6791/admin/products');
  await page.waitForLoadState('networkidle');

  const addBtn = page.locator('button:has-text("+ Add Product"), button:has-text("Add Product")').first();
  await addBtn.click();
  await page.waitForTimeout(500);

  const options = await page.locator('select[aria-label="Category"] option').allInnerTexts();
  console.log('Category options in select:', options.slice(0, 5));

  await browser.close();
}

main().catch(console.error);
