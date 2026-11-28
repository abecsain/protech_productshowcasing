import { db, ensureSchema } from './db';
import { buildCategoryTreeList, type CategoryTreeNode } from './categories';
import { cloudUrl } from './catalog';

export interface AdminDashboardStats {
  products: number;
  users: number;
  categories: number;
}

export interface AdminInitialProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  categoryId: number;
  categoryPath?: string;
  image: string;
  imageCount?: number;
  createdAt: string;
}

export interface AdminInitialUser {
  id: number;
  name: string;
  firmName?: string;
  mobile: string;
  address?: string;
  createdAt: string;
  priceVisible: boolean;
  expiresAt: string | null;
  remainingMs: number | null;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await ensureSchema();
  const r = await db().execute(
    'SELECT (SELECT COUNT(*) FROM products) AS products, (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM categories) AS categories'
  );
  const row = r.rows[0];
  return {
    products: Number(row?.products || 0),
    users: Number(row?.users || 0),
    categories: Number(row?.categories || 0),
  };
}

export async function getAdminInitialProductsData(): Promise<{
  products: AdminInitialProduct[];
  total: number;
  categories: CategoryTreeNode[];
  whatsapp: string;
}> {
  await ensureSchema();
  const c = db();
  const [countRes, prodsRes, catsRes, settingsRes] = await Promise.all([
    c.execute('SELECT COUNT(*) n FROM products'),
    c.execute(
      `SELECT p.id, p.name, p.description, p.price, p.category_id AS categoryId, c.name AS category, p.created_at AS createdAt
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ORDER BY p.id DESC
       LIMIT 20 OFFSET 0`
    ),
    c.execute(
      'SELECT c.id, c.name, c.parent_id AS parentId, COUNT(p.id) AS productCount FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.name'
    ),
    c.execute({ sql: 'SELECT value FROM app_settings WHERE key=?', args: ['whatsapp'] }),
  ]);

  const categories = buildCategoryTreeList(
    catsRes.rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      parentId: row.parentId ? Number(row.parentId) : null,
      directProductCount: Number(row.productCount || 0),
    }))
  );
  const catPathMap = new Map<number, string>();
  for (const cat of categories) catPathMap.set(cat.id, cat.fullPath);

  const prods = prodsRes.rows;
  const imagesByProdId: Record<number, { publicId: string; version: string; count: number }> = {};
  if (prods.length > 0) {
    const pIds = prods.map((r) => Number(r.id));
    const placeholders = pIds.map(() => '?').join(',');
    const imgs = await c.execute({
      sql: `SELECT product_id, public_id, version, sort_order FROM product_images WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC`,
      args: pIds,
    });
    for (const img of imgs.rows) {
      const pid = Number(img.product_id);
      if (!imagesByProdId[pid]) {
        imagesByProdId[pid] = {
          publicId: String(img.public_id || ''),
          version: String(img.version || '1'),
          count: 1,
        };
      } else {
        imagesByProdId[pid].count++;
      }
    }
  }

  const products: AdminInitialProduct[] = prods.map((r) => {
    const pid = Number(r.id);
    const imgInfo = imagesByProdId[pid];
    return {
      id: pid,
      name: String(r.name),
      description: String(r.description || ''),
      price: Number(r.price),
      category: String(r.category),
      categoryId: Number(r.categoryId),
      categoryPath: catPathMap.get(Number(r.categoryId)) || String(r.category),
      createdAt: String(r.createdAt),
      image: cloudUrl(imgInfo?.publicId || '', imgInfo?.version || '1', 300),
      imageCount: imgInfo ? imgInfo.count : 0,
    };
  });

  return {
    products,
    total: Number(countRes.rows[0]?.n || 0),
    categories,
    whatsapp: String(settingsRes.rows[0]?.value || ''),
  };
}

export async function getAdminInitialUsersData(): Promise<{
  users: AdminInitialUser[];
  total: number;
}> {
  await ensureSchema();
  const c = db();
  const [countRes, usersRes] = await Promise.all([
    c.execute('SELECT COUNT(*) n FROM users'),
    c.execute(
      `SELECT id, name, firm_name AS firmName, mobile, address, created_at AS createdAt, price_visible AS priceVisible, price_expires_at AS expiresAt
       FROM users
       ORDER BY created_at DESC, id DESC
       LIMIT 20 OFFSET 0`
    ),
  ]);

  const now = Date.now();
  const users: AdminInitialUser[] = usersRes.rows.map((u) => {
    const expiresAt = u.expiresAt ? String(u.expiresAt) : null;
    const expiryMs = expiresAt ? Date.parse(expiresAt) : null;
    const visible = Boolean(u.priceVisible && (!expiryMs || expiryMs > now));
    return {
      id: Number(u.id),
      name: String(u.name),
      firmName: String(u.firmName || ''),
      mobile: String(u.mobile),
      address: String(u.address || ''),
      createdAt: String(u.createdAt),
      priceVisible: visible,
      expiresAt,
      remainingMs: expiryMs ? Math.max(0, expiryMs - now) : null,
    };
  });

  return {
    users,
    total: Number(countRes.rows[0]?.n || 0),
  };
}
