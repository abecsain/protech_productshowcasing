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

  // Click Categories button to open drawer
  await page.click('button[aria-label="Open categories menu"]');
  await page.waitForTimeout(500);

  // Take screenshot of drawer
  await page.screenshot({ path: 'scripts/drawer-actual.png' });
  
  // Inspect the first few category buttons in drawer
  const drawerButtons = await page.locator('div.relative.z-50.w-\\[84\\%\\].sm\\:w-96 button').evaluateAll(els => 
    els.map(el => ({
      text: el.innerText,
      tag: el.tagName,
      className: el.className,
      rect: el.getBoundingClientRect(),
      childCount: el.children.length,
      children: Array.from(el.children).map(c => ({
        tag: c.tagName,
        text: c.innerText,
        className: c.className,
        rect: c.getBoundingClientRect()
      }))
    }))
  );

  console.log('Drawer buttons:', JSON.stringify(drawerButtons.slice(3, 7), null, 2));

  await browser.close();
}

main().catch(console.error);
