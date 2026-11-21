import { chromium } from 'playwright';
import path from 'node:path';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:6791';
const ARTIFACTS_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function run() {
  console.log('🚀 Verifying Auto-off Options & Mobile Top Toast...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 750 } });
  const page = await context.newPage();

  // 1. Authenticate as Admin
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');
  console.log('✓ Admin authenticated');

  // 2. Navigate to /admin/users
  await page.goto(`${BASE_URL}/admin/users`);
  await page.waitForSelector('text=Registered Users');
  console.log('✓ Loaded /admin/users');

  // 3. Open Price Visibility & Auto-Off Timer Modal for first user
  // On mobile cards, click the timer pill button
  const timerBtn = page.locator('button:has-text("Price")').first();
  await timerBtn.click();

  // Wait for modal to open
  await page.waitForSelector('text=Price Visibility & Auto-Off Timer', { timeout: 5000 });
  console.log('✓ Opened Timer Modal');

  // 4. Verify Auto-off duration dropdown options
  const select = page.locator('select').first();
  const optionsText = await select.innerText();
  console.log('Options found:\n' + optionsText);

  assert(!optionsText.includes('3 Days'), 'Should NOT contain "3 Days"');
  assert(!optionsText.includes('7 Days'), 'Should NOT contain "7 Days"');
  assert(!optionsText.includes('30 Days'), 'Should NOT contain "30 Days"');
  assert(optionsText.includes('Never (No auto-off)'), 'Must contain Never');
  assert(optionsText.includes('1 Hour'), 'Must contain 1 Hour');
  assert(optionsText.includes('6 Hours'), 'Must contain 6 Hours');
  assert(optionsText.includes('24 Hours (1 Day)'), 'Must contain 24 Hours');
  assert(optionsText.includes('Custom Timeout...'), 'Must contain Custom Timeout...');
  console.log('✓ All requested duration options (3 Days, 7 Days, 30 Days) removed!');

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'admin-users-auto-off-options-removed.png') });

  // 5. Select 1 Hour and Save to trigger toast
  await select.selectOption('1');
  const saveBtn = page.locator('button:has-text("Save & Enable Price")');
  await saveBtn.click();

  // 6. Verify toast appears at TOP on mobile
  const toast = page.locator('[aria-label="Notifications"] > div').first();
  await toast.waitFor({ state: 'visible', timeout: 3000 });
  const toastBox = await toast.boundingBox();
  console.log('Toast Bounding Box on 375x750 viewport:', toastBox);

  // Assert toast is at the top (y < 80px) and not at bottom (> 600px)
  assert(toastBox && toastBox.y < 80, `Toast should be at the top of the mobile screen, actual y: ${toastBox?.y}`);
  console.log(`✓ Toast appeared at TOP of mobile viewport (y = ${toastBox.y}px)`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'mobile-toast-notification-at-top.png') });

  // 7. Verify toast auto-dismisses in 2 seconds ("Get Off in 2 Sec")
  console.log('Waiting 2.3 seconds to verify auto-dismissal...');
  await page.waitForTimeout(2300);
  const isStillVisible = await toast.isVisible().catch(() => false);
  console.log(`✓ Toast visible after 2.3s: ${isStillVisible}`);
  assert(!isStillVisible, 'Toast must automatically disappear within 2 seconds');
  console.log('✓ Toast successfully got off in 2 seconds!');

  await browser.close();
  console.log('🎉 Auto-off options and Mobile Top Toast verification PASSED!');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
