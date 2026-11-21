import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING VERIFICATION: CUSTOM AUTO-OFF TIMEOUT ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login as Admin
    console.log('1. Logging in as admin...');
    await page.goto('http://localhost:6791/admin/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder*="admin"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("Sign In as Admin")');
    await page.waitForURL('**/admin');
    console.log('✓ Admin login successful');

    // 2. Go to Users Page
    console.log('2. Navigating to Admin Users page...');
    await page.goto('http://localhost:6791/admin/users');
    await page.waitForLoadState('networkidle');

    // Find the first visible user timer button
    const timerBtn = page.locator('button:visible').filter({ hasText: /(Price visible until|No auto-off|Price hidden)/ }).first();
    await timerBtn.click();

    // Verify modal is open
    await page.waitForSelector('text="Price Visibility & Auto-Off Timer"', { timeout: 5000 });
    console.log('✓ Auto-Off Timer modal opened');

    // Screenshot 1: Modal with dropdown options
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-timer-modal-initial.png` });
    console.log('✓ Saved screenshot: admin-users-timer-modal-initial.png');

    // Select "Custom Timeout..." from the dropdown
    console.log('3. Selecting "Custom Timeout..." option...');
    const selectElem = page.locator('select').first();
    await selectElem.selectOption('custom');

    // Verify custom duration input and unit selector appeared
    await page.waitForSelector('input[placeholder*="12"]', { timeout: 3000 });
    console.log('✓ Custom duration fields visible');

    // Fill custom values: 5 Days
    console.log('4. Entering 5 Days custom timeout...');
    const durationInput = page.locator('input[placeholder*="12"]');
    await durationInput.fill('5');

    const unitSelect = page.locator('select').nth(1);
    await unitSelect.selectOption('days');
    await page.waitForTimeout(400);

    // Verify live visibility schedule preview shows "in 5 days"
    const schedulePreview = page.locator('text=/in 5 days/');
    await schedulePreview.waitFor({ timeout: 3000 });
    console.log('✓ Live visibility schedule preview updated to 5 days');

    // Screenshot 2: Custom Timeout Configured
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-custom-timer-configured.png` });
    console.log('✓ Saved screenshot: admin-users-custom-timer-configured.png');

    // Save & Enable Price
    console.log('5. Clicking Save & Enable Price...');
    await page.click('button:has-text("Save & Enable Price")');

    // Verify toast
    await page.waitForSelector(':has-text("Price visibility enabled for 5 days")', { timeout: 5000 });
    console.log('✓ Custom timer successfully saved and enabled!');

    // Screenshot 3: User row showing new timer
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${ARTIFACT_DIR}/admin-users-row-with-custom-timer.png` });
    console.log('✓ Saved screenshot: admin-users-row-with-custom-timer.png');

    // 6. Mobile Viewport (360x740)
    console.log('6. Verifying on Mobile Viewport (360x740)...');
    const mobileContext = await browser.newContext({ viewport: { width: 360, height: 740 } });
    const cookies = await context.cookies();
    await mobileContext.addCookies(cookies);
    const mobilePage = await mobileContext.newPage();

    await mobilePage.goto('http://localhost:6791/admin/users');
    await mobilePage.waitForLoadState('networkidle');

    // Click timer button on mobile card
    const mobileTimerBtn = mobilePage.locator('button:visible').filter({ hasText: /(Price visible until|No auto-off|Price hidden)/ }).first();
    await mobileTimerBtn.click();
    await mobilePage.waitForSelector('text="Price Visibility & Auto-Off Timer"', { timeout: 5000 });

    // Select custom
    await mobilePage.locator('select').first().selectOption('custom');
    await mobilePage.waitForSelector('input[placeholder*="12"]', { timeout: 3000 });
    await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/admin-users-custom-timer-mobile-360.png` });
    console.log('✓ Saved screenshot: admin-users-custom-timer-mobile-360.png');

    console.log('=== ALL CUSTOM TIMER TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
