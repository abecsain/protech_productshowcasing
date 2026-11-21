async function test() {
  // 1. Customer login
  const custLogin = await fetch('http://localhost:6791/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:6791' },
    body: JSON.stringify({ mobile: '9825123401', password: 'Customer@123' })
  });
  const custCookie = custLogin.headers.get('set-cookie');

  // Check initial price status
  const me1 = await fetch('http://localhost:6791/api/auth/me', { headers: { 'Cookie': custCookie } });
  console.log('Customer initial canSeePrices:', (await me1.json()).user?.canSeePrices);

  // 2. Admin login & turn price ON
  const adminLogin = await fetch('http://localhost:6791/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:6791' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const adminCookie = adminLogin.headers.get('set-cookie');

  // Find user ID for 9825123401
  const usersRes = await fetch('http://localhost:6791/api/admin/users?q=9825123401', { headers: { 'Cookie': adminCookie } });
  const userData = await usersRes.json();
  const userId = userData.users[0].id;

  // Set price ON
  await fetch(`http://localhost:6791/api/admin/users/${userId}/price`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:6791', 'Cookie': adminCookie },
    body: JSON.stringify({ enabled: true, hours: 2 })
  });

  // Check customer me again
  const me2 = await fetch('http://localhost:6791/api/auth/me', { headers: { 'Cookie': custCookie } });
  console.log('Customer after admin turned ON canSeePrices:', (await me2.json()).user?.canSeePrices);

  // Set price OFF
  await fetch(`http://localhost:6791/api/admin/users/${userId}/price`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:6791', 'Cookie': adminCookie },
    body: JSON.stringify({ enabled: false, hours: null })
  });

  // Check customer me again
  const me3 = await fetch('http://localhost:6791/api/auth/me', { headers: { 'Cookie': custCookie } });
  console.log('Customer after admin turned OFF canSeePrices:', (await me3.json()).user?.canSeePrices);
}

test().catch(console.error);
