import { db, ensureSchema } from '../lib/db';

async function seed() {
  const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
  console.log(`Connecting to database: ${url.startsWith('file:') ? 'local SQLite file' : 'Turso remote libSQL'}`);

  await ensureSchema();
  console.log('✓ Database schema, FTS5 index, categories, sample products, and admin user initialized via ensureSchema().');

  const client = db();
  const cats = await client.execute('SELECT COUNT(*) AS count FROM categories');
  const prods = await client.execute('SELECT COUNT(*) AS count FROM products');
  const imgs = await client.execute('SELECT COUNT(*) AS count FROM product_images');
  const admins = await client.execute('SELECT COUNT(*) AS count FROM admin_users');
  const settings = await client.execute('SELECT * FROM app_settings');

  console.log(`\nDatabase Status:`);
  console.log(`- Categories: ${cats.rows[0]?.count}`);
  console.log(`- Products: ${prods.rows[0]?.count}`);
  console.log(`- Product Images: ${imgs.rows[0]?.count}`);
  console.log(`- Admin Users: ${admins.rows[0]?.count}`);
  console.log(`- Settings:`, settings.rows);

  console.log('\n🎉 Seed process completed successfully!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
