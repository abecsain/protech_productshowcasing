import { unstable_cache, revalidateTag } from 'next/cache';
import { db } from './db';

export interface CatalogProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  categoryId: number;
  createdAt: string;
  image: string;
  imageCount: number;
}

export interface CatalogCategory {
  id: number;
  name: string;
  productCount: number;
}

export function cloudUrl(publicId: string, version: string, width = 300) {
  if (!publicId) return '/product-placeholder.svg';
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
 * Get category list (cached for 10 minutes with tag 'catalog-categories')
 */
export const getCachedCategories = unstable_cache(
  async (): Promise<CatalogCategory[]> => {
    const r = await db().execute(
      'SELECT c.id, c.name, COUNT(p.id) AS productCount FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.name'
    );
    return r.rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      productCount: Number(row.productCount || 0),
    }));
  },
  ['catalog-categories-list'],
  { revalidate: 600, tags: ['catalog-categories'] }
);

/**
 * Get featured products for /home (12 items, cached for 10 minutes with tag 'catalog-products')
 * GUARANTEED: Absolutely NO price column selected or returned in this shared cache!
 */
export const getCachedFeaturedProducts = unstable_cache(
  async (): Promise<CatalogProduct[]> => {
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

    return prods.map((r) => {
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
  },
  ['catalog-home-featured'],
  { revalidate: 600, tags: ['catalog-products'] }
);

/**
 * Get public catalog page (24 items, cached with tag 'catalog-products')
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

  const cacheKey = `catalog-page-p${safePage}-l${safeLimit}-c${catId || 'all'}-q${cleanQ || 'none'}`;

  const fetcher = unstable_cache(
    async () => {
      const where: string[] = [];
      const args: (string | number)[] = [];

      if (cleanQ) {
        where.push('(p.name LIKE ? OR p.description LIKE ?)');
        args.push(`${cleanQ}%`, `%${cleanQ}%`);
      }
      if (catId) {
        where.push('p.category_id=?');
        args.push(catId);
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
          createdAt: String(r.createdAt),
          image: cloudUrl(imgInfo?.publicId || '', imgInfo?.version || '1', 300),
          imageCount: imgInfo ? imgInfo.count : 0,
        };
      });

      return { products, total, page: safePage, limit: safeLimit };
    },
    [cacheKey],
    { revalidate: 600, tags: ['catalog-products'] }
  );

  return fetcher();
}

/**
 * Invalidation triggers for admin mutations
 */
export function revalidateCatalog() {
  try {
    revalidateTag('catalog-products', { expire: 0 });
    revalidateTag('catalog-categories', { expire: 0 });
  } catch {}
}
