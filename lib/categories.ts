export interface RawCategoryRow {
  id: number;
  name: string;
  parentId: number | null;
  directProductCount?: number;
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  level: 1 | 2 | 3;
  fullPath: string;
  directProductCount: number;
  productCount: number;
}

/**
 * Compute all category IDs in the subtree rooted at `rootId` (inclusive).
 */
export function getDescendantCategoryIds(
  categories: ReadonlyArray<{ id: number; parentId?: number | null }>,
  rootId: number
): number[] {
  const result: number[] = [];
  const visited = new Set<number>();
  const stack = [rootId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    for (const cat of categories) {
      if (cat.parentId === current && !visited.has(cat.id)) {
        stack.push(cat.id);
      }
    }
  }
  return result;
}

/**
 * Return the ancestor chain [level1, level2?, level3?] from root down to `catId`.
 */
export function getCategoryAncestors<T extends { id: number; parentId?: number | null }>(
  categories: ReadonlyArray<T>,
  catId: number | null | undefined
): T[] {
  if (!catId) return [];
  const byId = new Map<number, T>();
  for (const c of categories) byId.set(c.id, c);

  const chain: T[] = [];
  const visited = new Set<number>();
  let cur = byId.get(catId);
  while (cur && !visited.has(cur.id) && chain.length < 3) {
    visited.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

/**
 * Return depth (1 = main, 2 = sub, 3 = sub-sub) of a category.
 */
export function getCategoryDepth(
  categories: ReadonlyArray<{ id: number; parentId?: number | null }>,
  catId: number
): number {
  return getCategoryAncestors(categories, catId).length || 1;
}

/**
 * Build a flat tree-ordered list of categories (max 3 levels) with recursive product counts and full paths.
 */
export function buildCategoryTreeList(rows: RawCategoryRow[]): CategoryTreeNode[] {
  const byId = new Map<number, RawCategoryRow>();
  const childrenMap = new Map<number | null, RawCategoryRow[]>();

  for (const row of rows) {
    const normalized: RawCategoryRow = {
      id: Number(row.id),
      name: String(row.name),
      parentId: row.parentId ? Number(row.parentId) : null,
      directProductCount: Number(row.directProductCount || 0),
    };
    byId.set(normalized.id, normalized);
  }

  for (const row of byId.values()) {
    const validParent = row.parentId && byId.has(row.parentId) && row.parentId !== row.id ? row.parentId : null;
    const list = childrenMap.get(validParent) || [];
    list.push({ ...row, parentId: validParent });
    childrenMap.set(validParent, list);
  }

  for (const list of childrenMap.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }

  const countCache = new Map<number, number>();
  const computeTotalCount = (id: number, depth = 1): number => {
    if (countCache.has(id)) return countCache.get(id)!;
    const node = byId.get(id);
    let total = node?.directProductCount || 0;
    if (depth < 3) {
      for (const child of childrenMap.get(id) || []) {
        total += computeTotalCount(child.id, depth + 1);
      }
    }
    countCache.set(id, total);
    return total;
  };

  const ordered: CategoryTreeNode[] = [];
  const visit = (parentId: number | null, level: 1 | 2 | 3, prefix: string) => {
    const children = childrenMap.get(parentId) || [];
    for (const child of children) {
      const fullPath = prefix ? `${prefix} › ${child.name}` : child.name;
      ordered.push({
        id: child.id,
        name: child.name,
        parentId,
        level,
        fullPath,
        directProductCount: child.directProductCount || 0,
        productCount: computeTotalCount(child.id, level),
      });
      if (level < 3) {
        visit(child.id, (level + 1) as 2 | 3, fullPath);
      }
    }
  };

  visit(null, 1, '');
  return ordered;
}
