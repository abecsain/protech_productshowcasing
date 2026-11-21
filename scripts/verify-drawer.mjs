import { chromium } from 'playwright';
import path from 'path';

async function testDrawer() {
  console.log('Testing 3-line left slide category drawer on mobile...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  });
  const page = await context.newPage();

  // Register or Login via API to get auth cookie
  const randomMobile = '9' + Math.floor(100000000 + Math.random() * 900000000);
  console.log('Registering user with mobile:', randomMobile);
  const regRes = await page.request.post('http://localhost:6791/api/auth/register', {
    data: {
      name: 'Customer Demo',
      mobile: randomMobile,
      password: 'DemoPassword1',
      confirmPassword: 'DemoPassword1',
    },
  });
  console.log('Register response status:', regRes.status());

  // Navigate to products page
  await page.goto('http://localhost:6791/products', { waitUntil: 'networkidle' });
  console.log('Page URL after auth:', page.url());

  // Locate the 3-line category menu button
  const menuButton = page.locator('button[aria-label="Open categories menu"]');
  const isVisible = await menuButton.isVisible();
  console.log('3-Line menu button visible:', isVisible);
  if (!isVisible) throw new Error('Menu button not visible on mobile');

  const btnBox = await menuButton.boundingBox();
  console.log('3-Line menu button dimensions:', btnBox);
  if (btnBox.width < 44 || btnBox.height < 44) {
    throw new Error(`Menu button too small: ${btnBox.width}x${btnBox.height}px (< 44px)`);
  }

  // Click the 3-line button to open drawer
  await menuButton.click();
  await page.waitForTimeout(300);

  // Verify drawer is open
  const drawerTitle = page.locator('#category-drawer-title');
  const drawerVisible = await drawerTitle.isVisible();
  console.log('Left slide drawer visible:', drawerVisible);
  if (!drawerVisible) throw new Error('Drawer failed to open');

  // Capture screenshot of the open left slide drawer
  const shotPath = path.resolve('ui-screenshots', 'mobile-360-category-drawer-open.png');
  await page.screenshot({ path: shotPath });
  console.log('Screenshot of open category drawer saved to:', shotPath);

  // Click a category inside drawer
  const catButtons = page.locator('div[role="dialog"] button');
  const count = await catButtons.count();
  console.log('Total buttons inside category drawer:', count);

  // Click second category
  if (count > 2) {
    await catButtons.nth(2).click();
    await page.waitForTimeout(300);
    console.log('Selected category from drawer successfully.');
  }

  // Verify drawer closed
  const isClosed = !(await drawerTitle.isVisible());
  console.log('Drawer closed after selection:', isClosed);
  if (!isClosed) throw new Error('Drawer did not close after selection');

  await browser.close();
  console.log('🎉 3-line left slide drawer test PASSED perfectly!');
}

testDrawer().catch((e) => {
  console.error(e);
  process.exit(1);
});
