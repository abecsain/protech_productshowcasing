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
  
  await page.goto('http://localhost:6791/admin/products');
  await page.waitForLoadState('networkidle');

  const categoriesCard = page.locator('h2:has-text("Categories")').locator('xpath=ancestor::div[contains(@class, "rounded-xl")]').first();
  await categoriesCard.screenshot({ path: 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5/admin-categories-card-focused.png' });
  console.log('Saved focused screenshot admin-categories-card-focused.png');

  await browser.close();
}

main().catch(console.error);
