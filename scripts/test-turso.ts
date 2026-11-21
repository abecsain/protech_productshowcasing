import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

async function test() {
  console.log('Connecting to Turso...');
  const client = createClient({ url, authToken });
  const res = await client.execute('SELECT 1 as connected');
  console.log('TURSO RESULT:', res.rows);
}

test().catch(err => {
  console.error('TURSO ERROR:', err);
  process.exit(1);
});
