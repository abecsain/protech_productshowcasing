import { revalidatePath, revalidateTag } from 'next/cache';
import { db, ensureSchema } from './db';
import { buildCategoryTreeList, getDescendantCategoryIds, type CategoryTreeNode } from './categories';

export interface CatalogProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  categoryId: number;
  categoryPath?: string;
  createdAt: string;
  image: string;
  imageCount: number;
}

export type CatalogCategory = CategoryTreeNode;

const CACHE_TTL_MS = 30_000;
const globalCatalogCache = globalThis as unknown as {
  __pte_categories?: { data: CatalogCategory[]; ts: number };
  __pte_featured?: { data: CatalogProduct[]; ts: number };
  __pte_pages?: Map<string, { data: { products: CatalogProduct[]; total: number; page: number; limit: number }; ts: number }>;
};

export function clearCatalogMemoryCache() {
  globalCatalogCache.__pte_categories = undefined;
  globalCatalogCache.__pte_featured = undefined;
  globalCatalogCache.__pte_pages?.clear();
}

export function cloudUrl(publicId: string, version: string, width = 300) {
  if (!publicId) return '/product-placeholder.svg';
  if (publicId.startsWith('/api/images/')) return publicId;
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) return publicId;
  if (publicId.startsWith('seed/') || publicId.startsWith('unsplash/')) {
    const raw = publicId.split('#')[0].replace(/^(seed|unsplash)\//, '');
    const match = raw.match(/photo-[a-zA-Z0-9-]+/);
    if (match) {
      const cleanId = match[0].replace(/-\d+$/, '');
      return `https://images.unsplash.com/${cleanId}?auto=format&fit=crop&w=${width}&q=80`;
    }
    return '/product-placeholder.svg';
  }
  const cname = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cname || cname === 'your_cloud_name') return '/product-placeholder.svg';
  return `https://res.cloudinary.com/${cname}/image/upload/f_auto,q_auto,w_${width},c_limit/${version}/${publicId}`;
}

/**
 * Get category list directly from DB (3-level tree) so storefront and admin always stay in sync
 */
export async function getCachedCategories(): Promise<CatalogCategory[]> {
  const now = Date.now();
  const cached = globalCatalogCache.__pte_categories;
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  await ensureSchema();
  const r = await db().execute(
    'SELECT c.id, c.name, c.parent_id AS parentId, COUNT(p.id) AS productCount FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.name'
  );
  const tree = buildCategoryTreeList(
    r.rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      parentId: row.parentId ? Number(row.parentId) : null,
      directProductCount: Number(row.productCount || 0),
    }))
  );
  globalCatalogCache.__pte_categories = { data: tree, ts: Date.now() };
  return tree;
}

/**
 * Get featured products for /home (12 items) directly from DB
 * GUARANTEED: Absolutely NO price column selected or returned!
 */
export async function getCachedFeaturedProducts(): Promise<CatalogProduct[]> {
  const now = Date.now();
  const cached = globalCatalogCache.__pte_featured;
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  await ensureSchema();
  const prodsRes = await db().execute({
    sql: `SELECT p.id, p.name, p.description, c.name AS category, c.id AS categoryId, p.created_at AS createdAt
          FROM products p
          JOIN categories c ON c.id = p.category_id
          ORDER BY p.id DESC
          LIMIT 12`,
    args: [],
  });

  const prods = prodsRes.rows;
  if (prods.length === 0) return [];

  const pIds = prods.map((r) => Number(r.id));
  const placeholders = pIds.map(() => '?').join(',');
  const imgsResult = await db().execute({
    sql: `SELECT product_id, public_id, version, sort_order FROM product_images WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC`,
    args: pIds,
  });

  const imagesByProdId: Record<number, { publicId: string; version: string; count: number }> = {};
  for (const img of imgsResult.rows) {
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

  const featured = prods.map((r) => {
    const pid = Number(r.id);
    const imgInfo = imagesByProdId[pid];
    return {
      id: pid,
      name: String(r.name),
      description: String(r.description || ''),
      category: String(r.category),
      categoryId: Number(r.categoryId),
      createdAt: String(r.createdAt),
      image: cloudUrl(imgInfo?.publicId || '', imgInfo?.version || '1', 300),
      imageCount: imgInfo ? imgInfo.count : 0,
    };
  });
  globalCatalogCache.__pte_featured = { data: featured, ts: Date.now() };
  return featured;
}

/**
 * Get public catalog page (24 items) directly from DB
 * GUARANTEED: NO price column selected or returned!
 */
export async function getCachedProductsPage({
  page = 1,
  limit = 24,
  category = null,
  q = '',
}: {
  page?: number;
  limit?: number;
  category?: number | null;
  q?: string;
}): Promise<{ products: CatalogProduct[]; total: number; page: number; limit: number }> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(24, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;
  const cleanQ = q.trim().slice(0, 100);
  const catId = category && Number.isSafeInteger(category) ? category : null;

  const cacheKey = `${safePage}|${safeLimit}|${catId ?? ''}|${cleanQ}`;
  const now = Date.now();
  const pagesMap = (globalCatalogCache.__pte_pages ??= new Map());
  const cachedPage = pagesMap.get(cacheKey);
  if (cachedPage && now - cachedPage.ts < CACHE_TTL_MS) {
    return cachedPage.data;
  }

  await ensureSchema();

  const allCategories = await getCachedCategories();
  const catPathMap = new Map<number, string>();
  for (const c of allCategories) catPathMap.set(c.id, c.fullPath);

  const where: string[] = [];
  const args: (string | number)[] = [];

  if (cleanQ) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    args.push(`${cleanQ}%`, `%${cleanQ}%`);
  }
  if (catId) {
    const subtreeIds = getDescendantCategoryIds(allCategories, catId);
    const placeholders = subtreeIds.map(() => '?').join(',');
    where.push(`p.category_id IN (${placeholders})`);
    args.push(...subtreeIds);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countPromise = db()
    .execute({ sql: `SELECT COUNT(*) AS n FROM products p ${w}`, args })
    .then((r) => Number(r.rows[0]?.n || 0));

  const prodsPromise = db().execute({
    sql: `SELECT p.id, p.name, p.description, c.name AS category, c.id AS categoryId, p.created_at AS createdAt
          FROM products p
          JOIN categories c ON c.id = p.category_id
          ${w}
          ORDER BY p.id DESC
          LIMIT ? OFFSET ?`,
    args: [...args, safeLimit, offset],
  });

  const [total, prodsResult] = await Promise.all([countPromise, prodsPromise]);
  const prods = prodsResult.rows;

  const imagesByProdId: Record<number, { publicId: string; version: string; count: number }> = {};
  if (prods.length > 0) {
    const pIds = prods.map((r) => Number(r.id));
    const placeholders = pIds.map(() => '?').join(',');
    const imgsResult = await db().execute({
      sql: `SELECT product_id, public_id, version, sort_order FROM product_images WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC`,
      args: pIds,
    });

    for (const img of imgsResult.rows) {
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

  const products: CatalogProduct[] = prods.map((r) => {
    const pid = Number(r.id);
    const imgInfo = imagesByProdId[pid];
    return {
      id: pid,
      name: String(r.name),
      description: String(r.description || ''),
      category: String(r.category),
      categoryId: Number(r.categoryId),
      categoryPath: catPathMap.get(Number(r.categoryId)) || String(r.category),
      createdAt: String(r.createdAt),
      image: cloudUrl(imgInfo?.publicId || '', imgInfo?.version || '1', 300),
      imageCount: imgInfo ? imgInfo.count : 0,
    };
  });

  const result = { products, total, page: safePage, limit: safeLimit };
  if (pagesMap.size >= 40) {
    const firstKey = pagesMap.keys().next().value;
    if (firstKey !== undefined) pagesMap.delete(firstKey);
  }
  pagesMap.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

/**
 * Invalidation triggers for admin mutations
 */
export function revalidateCatalog() {
  clearCatalogMemoryCache();
  try {
    revalidateTag('catalog-products', { expire: 0 });
    revalidateTag('catalog-categories', { expire: 0 });
    revalidatePath('/products');
    revalidatePath('/home');
  } catch {}
}
