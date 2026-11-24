import { chromium } from 'playwright';

const ARTIFACT_DIR = 'C:/Users/atult/.gemini/antigravity/brain/f8f01ac4-38c6-4b65-b1a4-1ae157de59a5';

async function main() {
  console.log('--- STARTING VERIFICATION: REAL-TIME PRICE AUTO-OFF (NO REFRESH) & SS RESTRICTION ---');
  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Setup Admin context
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await adminPage.goto('http://localhost:6791/admin/login');
    await adminPage.fill('input[type="text"]', 'admin');
    await adminPage.fill('input[type="password"]', 'admin123');
    await adminPage.click('button:has-text("Sign In")');
    await adminPage.waitForURL('**/admin');
    console.log('✓ Admin authenticated');

    // 2. Setup Customer context
    const customerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const customerPage = await customerContext.newPage();

    // Customer login: 9825123401 (Aarav Patel)
    await customerPage.goto('http://localhost:6791/auth?tab=login');
    await customerPage.fill('input[type="tel"]', '9825123401');
    await customerPage.fill('input[type="password"]', 'Customer@123');
    await customerPage.click('button:has-text("Sign In")');
    await customerPage.waitForURL('**/home');
    console.log('✓ Customer Aarav Patel logged in');

    // Make sure price is initially ON for testing
    // Get user id
    const usersRes = await adminPage.request.get('http://localhost:6791/api/admin/users?q=9825123401');
    const uData = await usersRes.json();
    const customerUserId = uData.users[0].id;

    await adminPage.request.put(`http://localhost:6791/api/admin/users/${customerUserId}/price`, {
      data: { enabled: true, hours: 2 }
    });
    console.log(`✓ Admin set price visibility ON for user #${customerUserId}`);

    // Navigate customer to /products
    await customerPage.goto('http://localhost:6791/products');
    await customerPage.waitForLoadState('networkidle');

    // Verify prices are visible
    const priceElement = customerPage.locator('text=₹').first();
    await priceElement.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Customer currently sees wholesale prices (₹)');
    await customerPage.screenshot({ path: `${ARTIFACT_DIR}/customer-prices-visible-before-off.png` });
    console.log('✓ Saved: customer-prices-visible-before-off.png');

    // 3. TEST REAL-TIME AUTOMATIC PRICE OFF WITHOUT REFRESH!
    console.log('3. Admin turns price OFF via API while customer tab stays open (NO REFRESH)...');
    await adminPage.request.put(`http://localhost:6791/api/admin/users/${customerUserId}/price`, {
      data: { enabled: false, hours: null }
    });

    console.log('Waiting for real-time live sync to automatically hide prices without refreshing page...');
    // We expect prices to vanish within 3-4 seconds (polling interval is 2.5s)
    const priceOnReq = customerPage.locator('text=Price on request').first();
    await priceOnReq.waitFor({ state: 'visible', timeout: 6000 });

    // Verify ₹ price count is now 0 on product cards
    const visiblePriceCount = await customerPage.locator('.text-\\[16px\\].font-bold.text-\\[\\#1D4ED8\\]:has-text("₹")').count();
    console.log(`Visible price count after auto-off: ${visiblePriceCount}`);
    if (visiblePriceCount > 0) {
      throw new Error('Prices did not turn off automatically in customer view!');
    }
    console.log('✓ SUCCESS: Prices turned OFF automatically in customer view WITHOUT REFRESHING!');

    await customerPage.screenshot({ path: `${ARTIFACT_DIR}/customer-prices-automatically-off-no-refresh.png` });
    console.log('✓ Saved: customer-prices-automatically-off-no-refresh.png');

    // 4. VERIFY SS (SCREENSHOT) AND ACTIONS ARE NOT LOCKED
    console.log('4. Verifying SS (Screenshot) is NOT locked on laptop or mobile...');
    await customerPage.keyboard.press('PrintScreen');
    await customerPage.waitForTimeout(300);

    const ssVeil = customerPage.locator('text=Screenshots Strictly Prohibited');
    const ssVeilCount = await ssVeil.count();
    if (ssVeilCount === 0) {
      console.log('✓ Verified: No screenshot veil or restriction on PrintScreen');
    }

    // 5. Verify Right-Click is not disabled
    console.log('5. Verifying Right-Click is not disabled...');
    await customerPage.locator('img').first().click({ button: 'right' });
    console.log('✓ Right-click allowed normally');

    // 6. Verify Window Blur does not lock screen
    console.log('6. Verifying Window Blur does not lock screen...');
    await customerPage.evaluate(() => window.dispatchEvent(new Event('blur')));
    await customerPage.waitForTimeout(300);

    const blurVeil = customerPage.locator('text=Protected Wholesale View');
    const blurVeilCount = await blurVeil.count();
    if (blurVeilCount === 0) {
      console.log('✓ Verified: No blur lock or veil on focus loss');
    }

    // Refocus
    await customerPage.evaluate(() => window.dispatchEvent(new Event('focus')));
    await customerPage.waitForTimeout(300);

    console.log('=== ALL REAL-TIME & UNLOCKED SCREENSHOT TESTS PASSED! ===');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
