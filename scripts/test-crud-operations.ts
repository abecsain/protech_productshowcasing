import { db } from '../lib/db';

async function main() {
  const c = db();
  console.log('Testing Product and Category CRUD operations...');

  // 1. Create a test category
  const testCatName = `TestCat-${Date.now()}`;
  const catInsert = await c.execute({
    sql: 'INSERT INTO categories(name) VALUES(?) RETURNING id, name',
    args: [testCatName],
  });
  const catId = Number(catInsert.rows[0]!.id);
  console.log(`✓ 1. Category Created: ID ${catId}, Name "${testCatName}"`);

  // 2. Update/Rename the category
  const renamedCatName = `${testCatName}-Renamed`;
  await c.execute({
    sql: 'UPDATE categories SET name = ? WHERE id = ?',
    args: [renamedCatName, catId],
  });
  const catVerify = await c.execute({
    sql: 'SELECT name FROM categories WHERE id = ?',
    args: [catId],
  });
  if (catVerify.rows[0]?.name !== renamedCatName) {
    throw new Error('Category rename failed');
  }
  console.log(`✓ 2. Category Updated/Renamed: "${catVerify.rows[0]?.name}"`);

  // 3. Create a test product in that category
  const prodName = `Test Product ${Date.now()}`;
  const prodInsert = await c.execute({
    sql: 'INSERT INTO products(name, description, price, category_id) VALUES(?, ?, ?, ?) RETURNING id',
    args: [prodName, 'Test description for CRUD', 1999, catId],
  });
  const prodId = Number(prodInsert.rows[0]!.id);

  // Add a test image
  await c.execute({
    sql: 'INSERT INTO product_images(product_id, public_id, version, sort_order) VALUES(?, ?, ?, ?)',
    args: [prodId, `protech/products/crud-test-${prodId}`, '1', 0],
  });
  console.log(`✓ 3. Product Created: ID ${prodId}, Name "${prodName}"`);

  // 4. Update the product
  const updatedProdName = `${prodName} - Updated`;
  await c.execute({
    sql: 'UPDATE products SET name = ?, price = ?, description = ? WHERE id = ?',
    args: [updatedProdName, 2499, 'Updated description', prodId],
  });
  const prodVerify = await c.execute({
    sql: 'SELECT name, price, description FROM products WHERE id = ?',
    args: [prodId],
  });
  if (prodVerify.rows[0]?.name !== updatedProdName || Number(prodVerify.rows[0]?.price) !== 2499) {
    throw new Error('Product update failed');
  }
  console.log(`✓ 4. Product Updated: Name "${prodVerify.rows[0]?.name}", Price ₹${prodVerify.rows[0]?.price}`);

  // 5. Delete the product
  await c.execute({
    sql: 'DELETE FROM product_images WHERE product_id = ?',
    args: [prodId],
  });
  await c.execute({
    sql: 'DELETE FROM products WHERE id = ?',
    args: [prodId],
  });
  const prodDelCheck = await c.execute({
    sql: 'SELECT id FROM products WHERE id = ?',
    args: [prodId],
  });
  if (prodDelCheck.rows.length > 0) {
    throw new Error('Product deletion failed');
  }
  console.log(`✓ 5. Product Deleted: ID ${prodId} removed`);

  // 6. Delete the test category
  await c.execute({
    sql: 'DELETE FROM categories WHERE id = ?',
    args: [catId],
  });
  const catDelCheck = await c.execute({
    sql: 'SELECT id FROM categories WHERE id = ?',
    args: [catId],
  });
  if (catDelCheck.rows.length > 0) {
    throw new Error('Category deletion failed');
  }
  console.log(`✓ 6. Category Deleted: ID ${catId} removed`);

  // Verify baseline 15 products and 3 categories remain intact
  const finalCats = await c.execute('SELECT COUNT(*) as n FROM categories');
  const finalProds = await c.execute('SELECT COUNT(*) as n FROM products');
  console.log(`\nFinal DB State: ${finalCats.rows[0]?.n} Categories, ${finalProds.rows[0]?.n} Products`);
  if (Number(finalCats.rows[0]?.n) !== 3 || Number(finalProds.rows[0]?.n) !== 15) {
    throw new Error(`Expected 3 categories and 15 products, found ${finalCats.rows[0]?.n} and ${finalProds.rows[0]?.n}`);
  }

  console.log('✓ All Category & Product CRUD operations verified successfully!');
  process.exit(0);
}

main().catch((err) => {
  console.error('CRUD test failed:', err);
  process.exit(1);
});
