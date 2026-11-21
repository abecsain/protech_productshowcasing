import { db } from './lib/db.js';
import { issueSession } from './lib/security.js';

async function test() {
  const token = await issueSession('admin', 1, 1);
  const res = await fetch('http://localhost:6791/api/products?limit=10', {
    headers: {
      Cookie: `protech_session=${token}`
    }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text.slice(0, 300));
}

test().catch(console.error);
