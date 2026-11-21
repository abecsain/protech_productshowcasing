import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

async function addIndexes() {
  console.log('Adding performance indexes...');
  const statements = [
    'CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort_order)',
    'CREATE INDEX IF NOT EXISTS idx_products_id_desc ON products(id DESC)',
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name COLLATE NOCASE)',
    'CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name COLLATE NOCASE)',
    'CREATE INDEX IF NOT EXISTS idx_users_search ON users(name COLLATE NOCASE, mobile)',
    'PRAGMA optimize'
  ];

  for (const sql of statements) {
    const t0 = performance.now();
    await client.execute(sql);
    console.log(`Executed: ${sql} in ${(performance.now() - t0).toFixed(1)}ms`);
  }
}

addIndexes().catch(console.error);
