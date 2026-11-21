import { performance } from 'node:perf_hooks';

async function benchmark() {
  console.log('--- MEASURING API ENDPOINT PERFORMANCE ---');
  
  // 1. Admin login
  let t0 = performance.now();
  const loginRes = await fetch('http://localhost:6791/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:6791' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  let t1 = performance.now();
  console.log(`Admin login API: ${(t1 - t0).toFixed(1)}ms`);
  const cookie = loginRes.headers.get('set-cookie');

  // 2. Admin users
  t0 = performance.now();
  const usersRes = await fetch('http://localhost:6791/api/admin/users?page=1&limit=50', {
    headers: { 'Cookie': cookie || '' }
  });
  await usersRes.json();
  t1 = performance.now();
  console.log(`Admin users API: ${(t1 - t0).toFixed(1)}ms`);

  // 3. Admin dashboard
  t0 = performance.now();
  const dashRes = await fetch('http://localhost:6791/api/admin/dashboard', {
    headers: { 'Cookie': cookie || '' }
  });
  await dashRes.json();
  t1 = performance.now();
  console.log(`Admin dashboard API: ${(t1 - t0).toFixed(1)}ms`);

  // 4. Admin categories
  t0 = performance.now();
  const catRes = await fetch('http://localhost:6791/api/admin/categories', {
    headers: { 'Cookie': cookie || '' }
  });
  await catRes.json();
  t1 = performance.now();
  console.log(`Admin categories API: ${(t1 - t0).toFixed(1)}ms`);

  // 5. Admin products (page 1, limit 20)
  t0 = performance.now();
  const prodRes = await fetch('http://localhost:6791/api/admin/products?page=1&limit=20', {
    headers: { 'Cookie': cookie || '' }
  });
  await prodRes.json();
  t1 = performance.now();
  console.log(`Admin products API: ${(t1 - t0).toFixed(1)}ms`);

  // 6. Customer products
  // Customer login
  const custLogin = await fetch('http://localhost:6791/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:6791' },
    body: JSON.stringify({ mobile: '9825123401', password: 'Customer@123' })
  });
  const custCookie = custLogin.headers.get('set-cookie');

  t0 = performance.now();
  const custProdRes = await fetch('http://localhost:6791/api/products?page=1&limit=24', {
    headers: { 'Cookie': custCookie || '' }
  });
  await custProdRes.json();
  t1 = performance.now();
  console.log(`Customer products API: ${(t1 - t0).toFixed(1)}ms`);
}

benchmark().catch(console.error);
