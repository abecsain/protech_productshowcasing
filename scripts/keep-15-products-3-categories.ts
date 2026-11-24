import { db } from '../lib/db';

const KEEP_PRODUCT_IDS = [10, 11, 12, 13, 14, 185, 186, 187, 188, 189, 360, 361, 362, 363, 364];
const KEEP_CATEGORY_IDS = [6, 7, 8];

const CLEAN_NAMES: Record<number, string> = {
  10: 'Dell Latitude 7440 Ultrabook',
  11: 'Lenovo ThinkPad T14 Gen 4 Business Laptop',
  12: 'Apple MacBook Air M3 Liquid Retina (16GB RAM)',
  13: 'HP EliteBook 840 G10 Enterprise Laptop',
  14: 'ASUS ZenBook 14 OLED Slim Laptop',
  185: 'Dell UltraSharp 27" 4K USB-C Hub Monitor (U2723QE)',
  186: 'LG UltraFine 32" Ergo 4K Display (32UN880)',
  187: 'Samsung ViewFinity S9 27" 5K Studio Monitor',
  188: 'BenQ ProArt 27" Color-Accurate Display (PA278CV)',
  189: 'ASUS DesignVue 32" 4K Thunderbolt Designer Monitor',
  360: 'TP-Link Archer AXE75 Tri-Band Wi-Fi 6E Gigabit Router',
  361: 'Ubiquiti UniFi Dream Machine Pro Security Gateway',
  362: 'Cisco Business 250 Series 24-Port Gigabit Smart Switch',
  363: 'Netgear UniFi 6 Pro High-Density Ceiling Access Point',
  364: 'MikroTik Nighthawk 8-Stream AX6000 Mesh Wi-Fi System',
};

async function main() {
  const c = db();

  console.log('1. Cleaning up product images outside the 15 products...');
  const inProductsPlaceholder = KEEP_PRODUCT_IDS.map(() => '?').join(',');
  const inCategoriesPlaceholder = KEEP_CATEGORY_IDS.map(() => '?').join(',');

  await c.execute({
    sql: `DELETE FROM product_images WHERE product_id NOT IN (${inProductsPlaceholder})`,
    args: KEEP_PRODUCT_IDS,
  });

  console.log('2. Deleting all products outside the 15 products...');
  await c.execute({
    sql: `DELETE FROM products WHERE id NOT IN (${inProductsPlaceholder})`,
    args: KEEP_PRODUCT_IDS,
  });

  console.log('3. Deleting all categories outside the 3 selected categories...');
  await c.execute({
    sql: `DELETE FROM categories WHERE id NOT IN (${inCategoriesPlaceholder})`,
    args: KEEP_CATEGORY_IDS,
  });

  console.log('4. Cleaning up product names...');
  for (const [id, cleanName] of Object.entries(CLEAN_NAMES)) {
    await c.execute({
      sql: 'UPDATE products SET name = ? WHERE id = ?',
      args: [cleanName, Number(id)],
    });
  }

  console.log('5. Verifying database state:');
  const catCount = await c.execute('SELECT COUNT(*) as n FROM categories');
  const prodCount = await c.execute('SELECT COUNT(*) as n FROM products');
  const imgCount = await c.execute('SELECT COUNT(*) as n FROM product_images');
  const cats = await c.execute('SELECT c.id, c.name, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id ORDER BY c.id');

  console.log(`Total Categories: ${catCount.rows[0].n}`);
  console.log(`Total Products: ${prodCount.rows[0].n}`);
  console.log(`Total Product Images: ${imgCount.rows[0].n}`);
  console.log('Category breakdown:', JSON.stringify(cats.rows, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
