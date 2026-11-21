import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://localhost:6791/admin/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  await page.goto('http://localhost:6791/admin/products');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5/admin-products-current-actual.png' });
  const count = await page.locator('text=Total Products').count();
  console.log('Page loaded successfully, saved admin-products-current-actual.png');
  const chipTexts = await page.locator('.flex.flex-wrap.items-center.gap-2.pt-1 > div').allInnerTexts();
  console.log(`Total category chips rendered (${chipTexts.length}):`, chipTexts);

  const cardBox = await page.locator('h2:has-text("Categories")').locator('xpath=ancestor::div[contains(@class, "rounded-xl")]').first().boundingBox();
  console.log('Categories Card bounding box:', cardBox);
  await browser.close();
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
