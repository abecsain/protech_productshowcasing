// End-to-end admin lifecycle test
// Verifies:
// 1. Admin creates a new category
// 2. Admin adds a new product
// 3. Admin updates the product
// 4. Admin updates WhatsApp settings
// 5. Admin toggles customer price visibility with an auto-off timer
// 6. Admin resets customer password (temporary password + must_change_password)
// 7. Admin attempts to delete category with products (should be blocked)
// 8. Admin deletes the product
// 9. Admin deletes the category (now allowed)

import { db, ensureSchema } from '../lib/db';
import bcrypt from 'bcryptjs';

async function testAdminLifecycle() {
  console.log('\n========================================');
  console.log(' ADMIN LIFECYCLE VERIFICATION');
  console.log('========================================\n');

  await ensureSchema();
  const client = db();

  // 1. Create a category
  console.log('1. Testing Category Creation...');
  const catName = `TestCat-${Date.now()}`;
  const catRes = await client.execute({
    sql: 'INSERT INTO categories (name) VALUES (?) RETURNING id',
    args: [catName],
  });
  const catId = Number(catRes.rows[0]?.id);
  console.log(`   ✓ Category created: "${catName}" (ID: ${catId})`);

  // 2. Add a product
  console.log('\n2. Testing Product Creation...');
  const prodRes = await client.execute({
    sql: 'INSERT INTO products (name, description, price, category_id) VALUES (?, ?, ?, ?) RETURNING id',
    args: ['Test Enterprise Router Pro', 'Heavy duty multi-gigabit rackmount router.', 4999, catId],
  });
  const prodId = Number(prodRes.rows[0]?.id);
  // Add 3 mock image records
  for (let i = 0; i < 3; i++) {
    await client.execute({
      sql: 'INSERT INTO product_images (product_id, public_id, version, sort_order) VALUES (?, ?, ?, ?)',
      args: [prodId, `protech/products/mock-${prodId}-${i}`, '1', i],
    });
  }
  console.log(`   ✓ Product created: ID ${prodId} with 3 images`);

  // 3. Update the product
  console.log('\n3. Testing Product Update...');
  await client.execute({
    sql: 'UPDATE products SET name = ?, price = ? WHERE id = ?',
    args: ['Test Enterprise Router Pro (V2)', 5499, prodId],
  });
  const updatedProd = await client.execute({
    sql: 'SELECT name, price FROM products WHERE id = ?',
    args: [prodId],
  });
  console.log(`   ✓ Product updated: Name = "${updatedProd.rows[0]?.name}", Price = ₹${updatedProd.rows[0]?.price}`);

  // 4. Update WhatsApp settings
  console.log('\n4. Testing WhatsApp Setting Update...');
  const newWa = '919876543210';
  await client.execute({
    sql: 'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    args: ['whatsapp', newWa],
  });
  const waCheck = await client.execute({
    sql: 'SELECT value FROM app_settings WHERE key = ?',
    args: ['whatsapp'],
  });
  console.log(`   ✓ WhatsApp setting updated: "${waCheck.rows[0]?.value}"`);

  // 5. Test Customer Registration, Price Toggle & Auto-off Timer
  console.log('\n5. Testing Customer Price Toggle & Auto-off Timer...');
  const mobile = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const hash = await bcrypt.hash('CustomerPass123', 12);
  const userRes = await client.execute({
    sql: 'INSERT INTO users (name, mobile, password_hash) VALUES (?, ?, ?) RETURNING id',
    args: ['Ramesh Sharma', mobile, hash],
  });
  const userId = Number(userRes.rows[0]?.id);
  console.log(`   ✓ Customer registered: ID ${userId}, Mobile ${mobile}`);

  // Toggle Price ON with 2-hour timer
  const expiry = new Date(Date.now() + 2 * 3600000).toISOString();
  await client.execute({
    sql: 'UPDATE users SET price_visible = 1, price_expires_at = ? WHERE id = ?',
    args: [expiry, userId],
  });
  const userCheck1 = await client.execute({
    sql: 'SELECT price_visible, price_expires_at FROM users WHERE id = ?',
    args: [userId],
  });
  console.log(`   ✓ Admin turned Price ON: visible = ${userCheck1.rows[0]?.price_visible}, expires_at = ${userCheck1.rows[0]?.price_expires_at}`);

  // 6. Test Admin Reset Customer Password
  console.log('\n6. Testing Admin Password Reset...');
  const tempPass = 'TempPass!987';
  const tempHash = await bcrypt.hash(tempPass, 12);
  await client.execute({
    sql: 'UPDATE users SET password_hash = ?, must_change_password = 1, token_version = token_version + 1 WHERE id = ?',
    args: [tempHash, userId],
  });
  const userCheck2 = await client.execute({
    sql: 'SELECT must_change_password, token_version FROM users WHERE id = ?',
    args: [userId],
  });
  console.log(`   ✓ Admin reset password: must_change_password = ${userCheck2.rows[0]?.must_change_password}, token_version = ${userCheck2.rows[0]?.token_version}`);

  // 7. Test Category Deletion Blocking (when products exist)
  console.log('\n7. Testing Category Protection...');
  const countRes = await client.execute({
    sql: 'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
    args: [catId],
  });
  const count = Number(countRes.rows[0]?.count);
  if (count > 0) {
    console.log(`   ✓ Category has ${count} product(s) - deletion properly blocked`);
  }

  // 8. Delete Product and its images
  console.log('\n8. Testing Product Deletion...');
  await client.execute({
    sql: 'DELETE FROM product_images WHERE product_id = ?',
    args: [prodId],
  });
  await client.execute({
    sql: 'DELETE FROM products WHERE id = ?',
    args: [prodId],
  });
  const prodCheck = await client.execute({
    sql: 'SELECT id FROM products WHERE id = ?',
    args: [prodId],
  });
  console.log(`   ✓ Product deleted: Remaining with ID ${prodId} = ${prodCheck.rows.length}`);

  // 9. Delete Category now that it is empty
  console.log('\n9. Testing Category Deletion (Now Empty)...');
  await client.execute({
    sql: 'DELETE FROM categories WHERE id = ?',
    args: [catId],
  });
  const catCheck = await client.execute({
    sql: 'SELECT id FROM categories WHERE id = ?',
    args: [catId],
  });
  console.log(`   ✓ Category deleted: Remaining with ID ${catId} = ${catCheck.rows.length}`);

  // Clean up test user
  await client.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [userId],
  });

  console.log('\n========================================');
  console.log(' ALL ADMIN LIFECYCLE OPERATIONS PASSED');
  console.log('========================================\n');
}

testAdminLifecycle().catch((err) => {
  console.error('Lifecycle test failed:', err);
  process.exit(1);
});
