import { chromium } from 'playwright';
import { performance } from 'node:perf_hooks';

async function testFrontend() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:6791/admin/login');
  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("Sign In")');
  await page.waitForURL('**/admin');

  console.log('--- TESTING FRONTEND PAGE NAVIGATION TIMES ---');

  const requests = [];
  page.on('request', req => {
    requests.push({ url: req.url(), method: req.method(), time: performance.now() });
  });

  // Measure /admin/users
  requests.length = 0;
  let t0 = performance.now();
  await page.goto('http://localhost:6791/admin/users');
  await page.waitForLoadState('networkidle');
  let t1 = performance.now();
  console.log(`/admin/users load time: ${(t1 - t0).toFixed(1)}ms. Total requests: ${requests.length}`);
  requests.forEach(r => console.log(`  REQ: ${r.method} ${r.url}`));

  // Measure /admin/products
  requests.length = 0;
  t0 = performance.now();
  await page.goto('http://localhost:6791/admin/products');
  await page.waitForLoadState('networkidle');
  t1 = performance.now();
  console.log(`/admin/products load time: ${(t1 - t0).toFixed(1)}ms. Total requests: ${requests.length}`);
  requests.forEach(r => console.log(`  REQ: ${r.method} ${r.url}`));

  await browser.close();
}

testFrontend().catch(console.error);
