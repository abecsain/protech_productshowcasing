import { createClient, type Client } from '@libsql/client';
import bcrypt from 'bcryptjs';

let client: Client | undefined;
let ready: Promise<void> | undefined;

const DEFAULT_TURSO_URL = 'libsql://protechenterprices-abecsain.aws-ap-south-1.turso.io';
const DEFAULT_TURSO_AUTH_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTUxOTkwMzksImlkIjoiMDFhMWZhMzItZjMwMS03ODEwLWFmZWMtMWIxODc4YmQxYTY3Iiwia2lkIjoiVHF6cEJKRktOc0pITFo5Y080bmRfMDZ1Vjd4RGx2ek5pUUxNM3JieHJzVSIsInJpZCI6IjhiZjU1YTFlLTgwOGYtNDQ3Ni04MTYyLTE2ODRlOWE0MGE4ZiJ9.cETJIHoPPNQ2V0P7pWgN7lkNN9mBG6EzD0x4H6-ZmUAypSh3Tzx89TF6ZjflLRyumME6HrHg4uXX2azwIl7gAA';

const globalForDb = globalThis as unknown as {
  __turso_client?: Client;
  __turso_schema_ready?: boolean;
};

export function db(): Client {
  if (!globalForDb.__turso_client) {
    const url = process.env.TURSO_DATABASE_URL || DEFAULT_TURSO_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN || DEFAULT_TURSO_AUTH_TOKEN;
    globalForDb.__turso_client = createClient({
      url,
      authToken,
    });
  }
  return globalForDb.__turso_client;
}

export async function ensureSchema() {
  if (globalForDb.__turso_schema_ready) return;
  if (!ready) {
    ready = (async () => {
      const c = db();
      try {
        const check = await c.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1");
        if (check.rows.length > 0) {
          try {
            await c.execute("ALTER TABLE users ADD COLUMN firm_name TEXT NOT NULL DEFAULT ''");
          } catch {}
          try {
            await c.execute("ALTER TABLE users ADD COLUMN address TEXT NOT NULL DEFAULT ''");
          } catch {}
          try {
            await c.execute(`CREATE TABLE IF NOT EXISTS stored_images (
              id TEXT PRIMARY KEY,
              mime_type TEXT NOT NULL,
              data TEXT NOT NULL,
              admin_id INTEGER NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )`);
          } catch {}
          globalForDb.__turso_schema_ready = true;
          return;
        }
      } catch {}

      const statements = [
        'PRAGMA foreign_keys=ON',
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          firm_name TEXT NOT NULL DEFAULT '',
          mobile TEXT NOT NULL UNIQUE,
          address TEXT NOT NULL DEFAULT '',
          password_hash TEXT NOT NULL,
          must_change_password INTEGER NOT NULL DEFAULT 0,
          price_visible INTEGER NOT NULL DEFAULT 0,
          price_expires_at TEXT,
          failed_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT,
          token_version INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          failed_attempts INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT,
          token_version INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          price REAL NOT NULL CHECK(price>=0),
          category_id INTEGER NOT NULL REFERENCES categories(id),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS product_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          public_id TEXT NOT NULL,
          version TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0,
          UNIQUE(public_id)
        )`,
        `CREATE TABLE IF NOT EXISTS admin_audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT,
          details TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS rate_limits (
          bucket TEXT PRIMARY KEY,
          window_start INTEGER NOT NULL,
          count INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS uploaded_assets (
          public_id TEXT PRIMARY KEY,
          admin_id INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          claimed INTEGER NOT NULL DEFAULT 0
        )`,
        `CREATE TABLE IF NOT EXISTS stored_images (
          id TEXT PRIMARY KEY,
          mime_type TEXT NOT NULL,
          data TEXT NOT NULL,
          admin_id INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`,
        'CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC, id DESC)',
        'CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile)',
        'CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, id DESC)',
        'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name COLLATE NOCASE)',
        'CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id, sort_order)',
        `CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(name, description, content='products', content_rowid='id')`,
        `CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN INSERT INTO products_fts(rowid, name, description) VALUES(new.id, new.name, new.description); END`,
        `CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN INSERT INTO products_fts(products_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description); END`,
        `CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN INSERT INTO products_fts(products_fts, rowid, name, description) VALUES('delete', old.id, old.name, old.description); INSERT INTO products_fts(rowid, name, description) VALUES(new.id, new.name, new.description); END`,
        `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
      ];

      await c.batch(statements.map((sql) => ({ sql })), 'write');

      // Seed default categories if none
      const categories = await c.execute('SELECT COUNT(*) AS n FROM categories');
      if (Number(categories.rows[0]?.n ?? 0) === 0) {
        await c.batch(
          ['Accessories', 'Electronics', 'Office Essentials', 'Networking'].map((name) => ({
            sql: 'INSERT INTO categories(name) VALUES(?)',
            args: [name],
          })),
          'write'
        );
      }

      // Seed 8 default products if none
      const products = await c.execute('SELECT COUNT(*) AS n FROM products');
      if (Number(products.rows[0]?.n ?? 0) === 0) {
        const rows = [
          ['Wireless Keyboard', 'Comfortable wireless typing with quiet keys for everyday office and business use.', 1299, 'Accessories', 'photo-1587829741301-dc798b83add3'],
          ['Bluetooth Ergonomic Mouse', 'Precise optical tracking and comfortable ergonomic grip for productivity.', 799, 'Accessories', 'photo-1527814050087-3793815479db'],
          ['USB-C Hub 7-in-1 Multiport Adapter', 'High-speed 4K HDMI, 100W PD charging, SD card reader and USB 3.0 ports in an aluminium body.', 2499, 'Electronics', 'photo-1625842268584-8f3296236761'],
          ['LED Desk Task Lamp', 'Eye-care dimmable brightness with multiple color temperatures and USB charging port.', 1599, 'Office Essentials', 'photo-1507473885765-e6ed057f782c'],
          ['Noise-Cancelling Wireless Headphones', 'Crystal-clear audio with hybrid active noise cancellation and 30-hour battery life.', 3299, 'Electronics', 'photo-1505740420928-5e560c06d30e'],
          ['Aluminium Folding Laptop Stand', 'Sturdy ergonomic stand with adjustable height and non-slip silicone pads for better posture.', 1199, 'Office Essentials', 'photo-1527864550417-7fd91fc51a46'],
          ['Wi-Fi Router AC1200 Dual Band', 'High-speed dual band gigabit Wi-Fi router with 4 high-gain antennas for wide coverage.', 2899, 'Networking', 'photo-1633113214698-485cdb5b4b8c'],
          ['Portable NVMe SSD 1TB', 'Ultra-fast read/write speeds up to 1050MB/s with rugged shock-resistant aluminium casing.', 6499, 'Electronics', 'photo-1597872200969-2b65d56bd16b'],
        ];
        for (const [name, description, price, category, image] of rows) {
          const cat = await c.execute({ sql: 'SELECT id FROM categories WHERE name = ?', args: [category] });
          if (cat.rows[0]) {
            const ins = await c.execute({
              sql: 'INSERT INTO products(name, description, price, category_id) VALUES(?, ?, ?, ?) RETURNING id',
              args: [name, description, price, cat.rows[0].id],
            });
            const pId = ins.rows[0]?.id;
            if (pId) {
              await c.execute({
                sql: 'INSERT INTO product_images(product_id, public_id, version, sort_order) VALUES(?, ?, ?, 0)',
                args: [pId, `seed/${image}`, '1'],
              });
              await c.execute({
                sql: 'INSERT INTO product_images(product_id, public_id, version, sort_order) VALUES(?, ?, ?, 1)',
                args: [pId, `seed/${image}-2`, '1'],
              });
              await c.execute({
                sql: 'INSERT INTO product_images(product_id, public_id, version, sort_order) VALUES(?, ?, ?, 2)',
                args: [pId, `seed/${image}-3`, '1'],
              });
            }
          }
        }
      }

      // App settings: admin whatsapp number
      const wa = process.env.ADMIN_WHATSAPP_NUMBER?.replace(/\D/g, '');
      if (wa) await c.execute({
        sql: 'INSERT INTO app_settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO NOTHING',
        args: ['whatsapp', wa],
      });

      // Admin user seed
      const username = process.env.ADMIN_USERNAME || 'admin';
      const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
      const existing = await c.execute({ sql: 'SELECT id FROM admin_users WHERE username = ?', args: [username] });
      if (!existing.rows.length && initialPassword) {
        await c.execute({
          sql: 'INSERT INTO admin_users(username, password_hash) VALUES(?, ?)',
          args: [username, await bcrypt.hash(initialPassword, 12)],
        });
      }
      globalForDb.__turso_schema_ready = true;
    })();
  }
  return ready;
}
