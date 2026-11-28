import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'node:crypto';
import { db, ensureSchema } from '@/lib/db';
import { clearSession, freshPrincipal, jsonError, principal, requireRole, setSession, validOrigin, invalidatePrincipalCache } from '@/lib/security';
import { revalidateCatalog } from '@/lib/catalog';
import { buildCategoryTreeList, getDescendantCategoryIds, type CategoryTreeNode } from '@/lib/categories';
import { pagination, validPassword, cloudinaryProductId, lockoutState, canRequestUpload } from '@/lib/policy.mjs';

export const runtime='nodejs';
type Ctx={params:Promise<{segments:string[]}>};
const mobileSchema=z.string().transform((val)=>{let d=val.replace(/\D/g,'');if(d.length===12&&d.startsWith('91'))d=d.slice(2);if(d.length===11&&d.startsWith('0'))d=d.slice(1);return d;}).pipe(z.string().regex(/^\d{10}$/));
const nameSchema=z.string().trim().min(2).max(80);
const passwordSchema=z.string().min(8).max(72);
const productSchema=z.object({name:z.string().trim().min(2).max(100),description:z.string().trim().max(200),price:z.number().finite().min(0).max(100000000),categoryId:z.number().int().positive(),images:z.array(z.object({publicId:z.string().min(1),version:z.string().regex(/^\d+$/)})).min(0).max(5).default([])});
const cloud=()=>{const {CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,CLOUDINARY_API_SECRET}=process.env;if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_API_KEY||!CLOUDINARY_API_SECRET)throw new Error('Image storage is not configured.');cloudinary.config({cloud_name:CLOUDINARY_CLOUD_NAME,api_key:CLOUDINARY_API_KEY,api_secret:CLOUDINARY_API_SECRET,secure:true});return cloudinary};
const fail=(e:unknown)=>{console.error('API request failed:',e instanceof Error?e.message:'unknown');return jsonError('The request could not be completed.',500)};
const memRateLimit = new Map<string, { count: number; resetAt: number }>();
function allowMem(bucket: string, limit = 5, windowSec = 60) {
  const now = Date.now();
  const entry = memRateLimit.get(bucket);
  if (!entry || entry.resetAt < now) {
    memRateLimit.set(bucket, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

let cachedCategories: CategoryTreeNode[] | null = null;
let cachedCategoriesTime = 0;
const API_CACHE_TTL_MS = 30_000;
function invalidateCategories() {
  revalidateCatalog(); cachedCategories = null; cachedCategoriesTime = 0; }
async function loadCategoryTree(): Promise<CategoryTreeNode[]> {
  const now = Date.now();
  if (cachedCategories && now - cachedCategoriesTime < API_CACHE_TTL_MS) {
    return cachedCategories;
  }
  const r = await db().execute('SELECT c.id, c.name, c.parent_id AS parentId, COUNT(p.id) AS productCount FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.name');
  const tree = buildCategoryTreeList(r.rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    parentId: row.parentId ? Number(row.parentId) : null,
    directProductCount: Number(row.productCount || 0),
  })));
  cachedCategories = tree;
  cachedCategoriesTime = Date.now();
  return tree;
}

let cachedSettings: { whatsapp: string } | null = null;
let cachedSettingsTime = 0;
function invalidateSettings() { cachedSettings = null; cachedSettingsTime = 0; }

let cachedTotalCount: number | null = null;
let cachedTotalCountTime = 0;
let cachedHomeFeaturedNoPrice: any[] | null = null;
let cachedHomeFeaturedWithPrice: any[] | null = null;
let cachedHomeFeaturedNoPriceTime = 0;
let cachedHomeFeaturedWithPriceTime = 0;
let cachedFirstCatalogNoPrice: any[] | null = null;
let cachedFirstCatalogWithPrice: any[] | null = null;
let cachedFirstCatalogNoPriceTime = 0;
let cachedFirstCatalogWithPriceTime = 0;
const cachedProductDetail = new Map<string, { data: any; ts: number }>();
function invalidateProducts() {
  revalidateCatalog();
  cachedTotalCount = null;
  cachedTotalCountTime = 0;
  cachedHomeFeaturedNoPrice = null;
  cachedHomeFeaturedWithPrice = null;
  cachedHomeFeaturedNoPriceTime = 0;
  cachedHomeFeaturedWithPriceTime = 0;
  cachedFirstCatalogNoPrice = null;
  cachedFirstCatalogWithPrice = null;
  cachedFirstCatalogNoPriceTime = 0;
  cachedFirstCatalogWithPriceTime = 0;
  cachedProductDetail.clear();
}

async function bodyJson(req:Request){try{return await req.json()}catch{return null}}
async function csrf(req:Request){return await validOrigin(req)}
async function allow(bucket:string,limit=5,windowSec=60){return allowMem(bucket, limit, windowSec)}
function ip(req:Request){return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')||'unknown'}
async function log(adminId:number,action:string,targetType:string,targetId:string|number|null,details:Record<string,unknown>={}){await db().execute({sql:'INSERT INTO admin_audit_log(admin_id,action,target_type,target_id,details) VALUES(?,?,?,?,?)',args:[adminId,action,targetType,targetId===null?null:String(targetId),JSON.stringify(details)]})}
function cloudUrl(publicId:string,version:string,width=300){if(!publicId)return '/product-placeholder.svg';if(publicId.startsWith('/api/images/'))return publicId;if(publicId.startsWith('http://')||publicId.startsWith('https://'))return publicId;if(publicId.startsWith('seed/')||publicId.startsWith('unsplash/')){const raw=publicId.split('#')[0].replace(/^(seed|unsplash)\//,'');const match=raw.match(/photo-[a-zA-Z0-9-]+/);if(match){const cleanId=match[0].replace(/-\d+$/,'');return `https://images.unsplash.com/${cleanId}?auto=format&fit=crop&w=${width}&q=80`}return '/product-placeholder.svg'}const cname=process.env.CLOUDINARY_CLOUD_NAME;if(!cname||cname==='your_cloud_name')return '/product-placeholder.svg';return `https://res.cloudinary.com/${cname}/image/upload/f_auto,q_auto,w_${width},c_limit/${version}/${publicId}`}
function isStoredImageId(value:string){return typeof value==='string'&&/^\/api\/images\/[a-f0-9-]{36}$/.test(value)}
async function verifyOwnedAssets(ids:{publicId:string;version:string}[],adminId:number,existingProductId?:number){for(const item of ids){if(existingProductId){const old=await db().execute({sql:'SELECT 1 FROM product_images WHERE product_id=? AND public_id=? AND version=?',args:[existingProductId,item.publicId,item.version]});if(old.rows.length)continue;}const isStored=isStoredImageId(item.publicId);if(!cloudinaryProductId(item.publicId)&&!isStored)return false;const a=await db().execute({sql:'SELECT 1 FROM uploaded_assets WHERE public_id=? AND admin_id=? AND claimed=0',args:[item.publicId,adminId]});if(!a.rows.length)return false;if(isStored){const imgId=item.publicId.replace('/api/images/','');const s=await db().execute({sql:'SELECT 1 FROM stored_images WHERE id=? AND admin_id=?',args:[imgId,adminId]});if(!s.rows.length)return false;continue;}try{const asset=await cloud().api.resource(item.publicId,{resource_type:'image'});if(asset.resource_type!=='image'||String(asset.version)!==item.version||!['webp','jpg','jpeg','png'].includes(asset.format)||!item.publicId.startsWith('protech/products/'))return false;}catch{}}return true}
async function destroyAssets(ids:string[]){for(const id of ids){if(isStoredImageId(id)){try{const imgId=id.replace('/api/images/','');await db().execute({sql:'DELETE FROM stored_images WHERE id=?',args:[imgId]})}catch{}continue;}try{await cloud().uploader.destroy(id,{resource_type:'image',invalidate:true})}catch(e){console.error('Cloudinary cleanup failed for asset',id,e instanceof Error?e.message:'unknown');await db().execute({sql:'INSERT INTO admin_audit_log(admin_id,action,target_type,target_id,details) VALUES(0,?,?,?,?)',args:['cleanup_failed','image',id,'{}']}).catch(()=>{})}}}
async function userRoute(req:Request,segments:string[]){
 await ensureSchema();const method=req.method;
 if(segments[0]==='images'&&segments[1]&&method==='GET'){
  const imgId=segments[1];
  if(!/^[a-f0-9-]{36}$/.test(imgId))return jsonError('Image not found.',404);
  const r=await db().execute({sql:'SELECT mime_type,data FROM stored_images WHERE id=?',args:[imgId]});
  if(!r.rows.length)return jsonError('Image not found.',404);
  const row=r.rows[0]!;
  const buf=Buffer.from(String(row.data),'base64');
  return new NextResponse(buf,{headers:{'Content-Type':String(row.mime_type||'image/webp'),'Cache-Control':'public, max-age=31536000, immutable'}});
 }
 if(segments.join('/')==='auth/register'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const b=await bodyJson(req),schema=z.object({name:nameSchema,firmName:z.string().trim().max(100).optional().default(''),mobile:mobileSchema,address:z.string().trim().max(250).optional().default(''),password:passwordSchema,confirmPassword:passwordSchema});const parsed=schema.safeParse(b);if(!parsed.success)return jsonError('Please check your registration details.');const {name,firmName,mobile,address,password,confirmPassword}=parsed.data;if(!validPassword(password,mobile)||confirmPassword!==password)return jsonError('Use a strong password and make sure the passwords match.');if(!await allow(`register:ip:${ip(req)}`)||!await allow(`register:mobile:${mobile}`))return jsonError('Too many attempts. Try again in a minute.',429);const hash=await bcrypt.hash(password,12);try{const r=await db().execute({sql:'INSERT INTO users(name,firm_name,mobile,address,password_hash) VALUES(?,?,?,?,?) RETURNING id,token_version',args:[name,firmName,mobile,address,hash]});const out=NextResponse.json({user:{name,firmName,mobile,address,role:'user'}},{status:201,headers:{'Cache-Control':'no-store'}});await setSession(out,'user',Number(r.rows[0]!.id),Number(r.rows[0]!.token_version));return out}catch{return jsonError('An account could not be created with those details.',409)}
 }
 if(segments.join('/')==='auth/login'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const b=await bodyJson(req),parsed=z.object({mobile:mobileSchema,password:passwordSchema}).safeParse(b);if(!parsed.success)return jsonError('Invalid mobile or password.',401);const {mobile,password}=parsed.data;if(!await allow(`login:ip:${ip(req)}`)||!await allow(`login:mobile:${mobile}`))return jsonError('Too many attempts. Try again in a minute.',429);const r=await db().execute({sql:'SELECT id,password_hash,failed_attempts,locked_until,token_version FROM users WHERE mobile=?',args:[mobile]});const u=r.rows[0];if(!u)return jsonError('Invalid mobile or password.',401);if(u.locked_until&&Date.parse(String(u.locked_until))>Date.now())return jsonError('Invalid mobile or password.',401);if(!await bcrypt.compare(password,String(u.password_hash))){const state=lockoutState(Number(u.failed_attempts),u.locked_until?String(u.locked_until):null);await db().execute({sql:'UPDATE users SET failed_attempts=?,locked_until=? WHERE id=?',args:[state.failed,state.lockedUntil||null,u.id]});return jsonError('Invalid mobile or password.',401)}await db().execute({sql:'UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=?',args:[u.id]});const out=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});await setSession(out,'user',Number(u.id),Number(u.token_version));return out;
 }
 if(segments.join('/')==='admin/login'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const b=await bodyJson(req),parsed=z.object({username:z.string().min(1).max(80),password:passwordSchema}).safeParse(b);if(!parsed.success)return jsonError('Invalid username or password.',401);if(!await allow(`admin-login:ip:${ip(req)}`))return jsonError('Too many attempts. Try again in a minute.',429);const r=await db().execute({sql:'SELECT id,password_hash,failed_attempts,locked_until,token_version FROM admin_users WHERE username=?',args:[parsed.data.username]});const u=r.rows[0];if(!u||u.locked_until&&Date.parse(String(u.locked_until))>Date.now()||!await bcrypt.compare(parsed.data.password,String(u?.password_hash||'$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'))){if(u){const state=lockoutState(Number(u.failed_attempts),u.locked_until?String(u.locked_until):null);await db().execute({sql:'UPDATE admin_users SET failed_attempts=?,locked_until=? WHERE id=?',args:[state.failed,state.lockedUntil||null,u.id]})}return jsonError('Invalid username or password.',401)}await db().execute({sql:'UPDATE admin_users SET failed_attempts=0,locked_until=NULL WHERE id=?',args:[u.id]});const out=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});await setSession(out,'admin',Number(u.id),Number(u.token_version));return out;
 }
 if(segments.join('/')==='auth/logout'&&method==='POST'){if(!await csrf(req))return jsonError('Invalid request origin.',403);const out=NextResponse.json({ok:true});await clearSession(out);return out}
 if(segments.join('/')==='auth/me'&&method==='GET'){const p=await freshPrincipal();if(!p)return jsonError('Sign in required.',401);return NextResponse.json({user:p},{headers:{'Cache-Control':'no-store'}})}
 if(segments.join('/')==='auth/password'&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const p=await requireRole('user');if(!p)return jsonError('Sign in required.',401);const parsed=z.object({oldPassword:passwordSchema,newPassword:passwordSchema,confirmPassword:passwordSchema}).safeParse(await bodyJson(req));if(!parsed.success)return jsonError('Please check your password details.');const v=parsed.data;if(v.newPassword!==v.confirmPassword||!validPassword(v.newPassword,p.mobile!))return jsonError('Choose a strong password and make sure the passwords match.');const u=await db().execute({sql:'SELECT password_hash,token_version FROM users WHERE id=?',args:[p.id]});if(!await bcrypt.compare(v.oldPassword,String(u.rows[0]!.password_hash)))return jsonError('Current password is incorrect.',403);const hash=await bcrypt.hash(v.newPassword,12);await db().execute({sql:'UPDATE users SET password_hash=?,must_change_password=0,token_version=token_version+1 WHERE id=?',args:[hash,p.id]});const out=NextResponse.json({ok:true});await setSession(out,'user',p.id,p.version+1);return out;
 }
 if(segments[0]==='settings'&&method==='GET'){
  const now = Date.now();
  if (cachedSettings && (now - cachedSettingsTime < 60000)) {
    return NextResponse.json(cachedSettings, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } });
  }
  const r = await db().execute({ sql: 'SELECT value FROM app_settings WHERE key=?', args: ['whatsapp'] });
  const resObj = { whatsapp: String(r.rows[0]?.value || process.env.ADMIN_WHATSAPP_NUMBER || '918319613801') };
  cachedSettings = resObj;
  cachedSettingsTime = Date.now();
  return NextResponse.json(resObj, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } });
 }
 const p=await principal();if(!p||(p.role!=='user'&&p.role!=='admin'))return jsonError('Sign in required.',401);if(p.role==='user'&&p.mustChange&&segments[0]!=='auth')return jsonError('Password change required.',403);
 if(segments[0]==='categories'&&method==='GET'){
  const tree = await loadCategoryTree();
  return NextResponse.json({ categories: tree }, { headers: { 'Cache-Control': 'no-store' } });
 }
   if(segments[0]==='prices'&&method==='GET'){
    const fresh=await freshPrincipal();
    if(!fresh?.canSeePrices)return NextResponse.json({prices:{},canSeePrices:false},{headers:{'Cache-Control':'private, no-store'}});
    const url=new URL(req.url),rawIds=(url.searchParams.get('ids')||'').split(','),ids=rawIds.map(Number).filter(n=>Number.isSafeInteger(n)&&n>0).slice(0,50);
    if(!ids.length)return NextResponse.json({prices:{},canSeePrices:true},{headers:{'Cache-Control':'private, no-store'}});
    const placeholders=ids.map(()=>'?').join(',');
    const r=await db().execute({sql:`SELECT id,price FROM products WHERE id IN (${placeholders})`,args:ids});
    const priceMap: Record<number, number> = {};
    for(const row of r.rows){priceMap[Number(row.id)]=Number(row.price);}
    return NextResponse.json({prices:priceMap,canSeePrices:true},{headers:{'Cache-Control':'private, no-store'}});
  }
  if(segments[0]==='products'&&segments.length===1&&method==='GET'){
    const url = new URL(req.url);
    const { page, limit, offset } = pagination(url.searchParams.get('page'), url.searchParams.get('limit'), 24);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const cat = Number(url.searchParams.get('category')) || null;
    if (q && !await allow(`search:${ip(req)}`, 60)) return jsonError('Search limit reached. Try again shortly.', 429);

    const now = Date.now();
    if (!q && !cat && page === 1 && cachedTotalCount !== null && now - cachedTotalCountTime < API_CACHE_TTL_MS) {
      if (limit === 12) {
        const hit = p.canSeePrices ? cachedHomeFeaturedWithPrice : cachedHomeFeaturedNoPrice;
        const hitTime = p.canSeePrices ? cachedHomeFeaturedWithPriceTime : cachedHomeFeaturedNoPriceTime;
        if (hit && now - hitTime < API_CACHE_TTL_MS) {
          return NextResponse.json({ products: hit, page, limit, total: cachedTotalCount, canSeePrices: p.canSeePrices }, { headers: { 'Cache-Control': 'private, no-store' } });
        }
      } else if (limit === 24) {
        const hit = p.canSeePrices ? cachedFirstCatalogWithPrice : cachedFirstCatalogNoPrice;
        const hitTime = p.canSeePrices ? cachedFirstCatalogWithPriceTime : cachedFirstCatalogNoPriceTime;
        if (hit && now - hitTime < API_CACHE_TTL_MS) {
          return NextResponse.json({ products: hit, page, limit, total: cachedTotalCount, canSeePrices: p.canSeePrices }, { headers: { 'Cache-Control': 'private, no-store' } });
        }
      }
    }

    const catTree = await loadCategoryTree();
    const catPathMap = new Map<number, string>();
    for (const c of catTree) catPathMap.set(c.id, c.fullPath);

    const where: string[] = [];
    const args: (string | number)[] = [];
    if (q) {
      where.push('(p.name LIKE ? OR p.description LIKE ?)');
      args.push(`${q}%`, `%${q}%`);
    }
    if (cat) {
      const subtreeIds = getDescendantCategoryIds(catTree, cat);
      const placeholders = subtreeIds.map(() => '?').join(',');
      where.push(`p.category_id IN (${placeholders})`);
      args.push(...subtreeIds);
    }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalCountPromise = db()
      .execute({ sql: `SELECT COUNT(*) AS n FROM products p ${w}`, args })
      .then((r) => Number(r.rows[0]?.n || 0));

    const priceCol = p.canSeePrices ? 'p.price,' : '';
    const prodsPromise = db().execute({
      sql: `SELECT p.id, p.name, p.description, ${priceCol} c.name AS category, c.id AS categoryId, p.created_at AS createdAt
            FROM products p
            JOIN categories c ON c.id = p.category_id
            ${w}
            ORDER BY p.id DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    const [total, prodsResult] = await Promise.all([totalCountPromise, prodsPromise]);
    const prods = prodsResult.rows;

    const imagesByProdId: Record<number, { publicId: string; version: string; count: number }> = {};
    if (prods.length > 0) {
      const pIds = prods.map(r => Number(r.id));
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

    const items = prods.map(r => {
      const pid = Number(r.id);
      const imgInfo = imagesByProdId[pid];
      const item: Record<string, any> = {
        id: pid,
        name: r.name,
        description: r.description,
        category: r.category,
        categoryId: r.categoryId,
        categoryPath: catPathMap.get(Number(r.categoryId)) || String(r.category),
        createdAt: r.createdAt,
        image: cloudUrl(imgInfo?.publicId || '', imgInfo?.version || '1', 300),
        imageCount: imgInfo ? imgInfo.count : 0,
      };
      if (p.canSeePrices && typeof r.price === 'number') {
        item.price = r.price;
      }
      return item;
    });

    if (!q && !cat && page === 1) {
      cachedTotalCount = total;
      cachedTotalCountTime = Date.now();
      if (limit === 12) {
        if (p.canSeePrices) {
          cachedHomeFeaturedWithPrice = items;
          cachedHomeFeaturedWithPriceTime = Date.now();
        } else {
          cachedHomeFeaturedNoPrice = items;
          cachedHomeFeaturedNoPriceTime = Date.now();
        }
      } else if (limit === 24) {
        if (p.canSeePrices) {
          cachedFirstCatalogWithPrice = items;
          cachedFirstCatalogWithPriceTime = Date.now();
        } else {
          cachedFirstCatalogNoPrice = items;
          cachedFirstCatalogNoPriceTime = Date.now();
        }
      }
    }

    return NextResponse.json({
      products: items,
      page,
      limit,
      total,
      canSeePrices: p.canSeePrices,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
 }
 if(segments[0]==='products'&&segments[1]&&method==='GET'){const id=Number(segments[1]);if(!Number.isSafeInteger(id)||id<1)return jsonError('Product not found.',404);const cacheKey=`${id}:${p.canSeePrices?1:0}`;const cached=cachedProductDetail.get(cacheKey);if(cached&&Date.now()-cached.ts<API_CACHE_TTL_MS){return NextResponse.json({product:cached.data},{headers:{'Cache-Control':'private, no-store'}})}const price=p.canSeePrices?'p.price,':'';const [r,imgs]=await Promise.all([db().execute({sql:`SELECT p.id,p.name,p.description,${price}c.name AS category,c.id AS categoryId FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=?`,args:[id]}),db().execute({sql:'SELECT public_id,version FROM product_images WHERE product_id=? ORDER BY sort_order',args:[id]})]);if(!r.rows.length)return jsonError('Product not found.',404);const prodData={...r.rows[0],images:imgs.rows.map(i=>cloudUrl(String(i.public_id),String(i.version),800))};cachedProductDetail.set(cacheKey,{data:prodData,ts:Date.now()});return NextResponse.json({product:prodData},{headers:{'Cache-Control':'private, no-store'}})}
 return jsonError('Not found.',404)
}

async function adminRoute(req:Request,segments:string[]){await ensureSchema();const method=req.method;
 if(segments.join('/')==='uploads/signature'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const a=await requireRole('admin');if(!canRequestUpload(a?.role))return jsonError('Administrator access required.',403);if(!a)return jsonError('Administrator access required.',403);if(!await allow(`upload:${ip(req)}`,30))return jsonError('Upload limit reached. Try again later.',429);const cname=process.env.CLOUDINARY_CLOUD_NAME,apiKey=process.env.CLOUDINARY_API_KEY,apiSecret=process.env.CLOUDINARY_API_SECRET,preset=process.env.CLOUDINARY_UPLOAD_PRESET;if(!cname||cname==='your_cloud_name'||!apiKey||!apiSecret||!preset){return NextResponse.json({mode:'direct'},{headers:{'Cache-Control':'no-store'}})}const cl=cloud(),timestamp=Math.floor(Date.now()/1000),publicId=`protech/products/${crypto.randomUUID()}`,folder='protech/products';const params={timestamp,folder,public_id:publicId,upload_preset:preset};const signature=cl.utils.api_sign_request(params,apiSecret);await db().execute({sql:'INSERT INTO uploaded_assets(public_id,admin_id) VALUES(?,?)',args:[publicId,a.id]});return NextResponse.json({mode:'cloudinary',cloudName:cname,apiKey,signature,timestamp,folder,publicId,uploadPreset:preset},{headers:{'Cache-Control':'no-store'}})
 }
 if(segments.join('/')==='uploads/direct'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const a=await requireRole('admin');if(!canRequestUpload(a?.role))return jsonError('Administrator access required.',403);if(!a)return jsonError('Administrator access required.',403);if(!await allow(`upload:${ip(req)}`,30))return jsonError('Upload limit reached. Try again later.',429);const formData=await req.formData().catch(()=>null);const file=formData?.get('file');if(!file||!(file instanceof Blob))return jsonError('No image file provided.',400);if(file.size<=0||file.size>1024*1024)return jsonError('Image size must be under 1 MB.',400);const mime=(file.type||'image/webp').toLowerCase();if(!['image/webp','image/jpeg','image/jpg','image/png'].includes(mime))return jsonError('Unsupported image format.',400);const buf=Buffer.from(await file.arrayBuffer());const b64=buf.toString('base64');const imgId=crypto.randomUUID();const publicId=`/api/images/${imgId}`;await db().execute({sql:'INSERT INTO stored_images(id,mime_type,data,admin_id) VALUES(?,?,?,?)',args:[imgId,mime,b64,a.id]});await db().execute({sql:'INSERT INTO uploaded_assets(public_id,admin_id) VALUES(?,?)',args:[publicId,a.id]});return NextResponse.json({ok:true,publicId,version:'1',previewUrl:publicId},{headers:{'Cache-Control':'no-store'}})
 }
 if(segments.join('/')==='uploads/verify'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const a=await requireRole('admin');if(!a)return jsonError('Administrator access required.',403);const parsed=z.object({publicId:z.string().min(1),version:z.string().regex(/^\d+$/)}).safeParse(await bodyJson(req));if(!parsed.success)return jsonError('Invalid uploaded image.');try{if(!await verifyOwnedAssets([parsed.data],a.id))return jsonError('Uploaded image could not be verified.',400);if(isStoredImageId(parsed.data.publicId))return NextResponse.json({ok:true});const asset=await cloud().api.resource(parsed.data.publicId,{resource_type:'image'});if(Number(asset.bytes)>350000||asset.width>800||asset.height>800)return jsonError('Image must be resized before upload.',400);return NextResponse.json({ok:true})}catch{return jsonError('Uploaded image could not be verified.',400)}
 }
 const a=await requireRole('admin');if(!a)return jsonError('Administrator access required.',403);
 if(segments[0]==='admin'&&segments[1]==='dashboard'&&method==='GET'){const r=await db().execute('SELECT (SELECT COUNT(*) FROM products) AS products,(SELECT COUNT(*) FROM users) AS users,(SELECT COUNT(*) FROM categories) AS categories');const row=r.rows[0];return NextResponse.json({products:Number(row?.products||0),users:Number(row?.users||0),categories:Number(row?.categories||0)},{headers:{'Cache-Control':'no-store'}})}
 if(segments[0]==='admin'&&segments[1]==='users'&&segments.length===2&&method==='GET'){const url=new URL(req.url),{page,limit,offset}=pagination(url.searchParams.get('page'),url.searchParams.get('limit'),50),q=(url.searchParams.get('q')||'').trim().slice(0,80);if(q&&!await allow(`admin-search:${ip(req)}`,60))return jsonError('Search limit reached.',429);const term=q?`WHERE name LIKE ? OR firm_name LIKE ? OR mobile LIKE ?`:'';const args=q?[`${q}%`,`${q}%`,`${q}%`]:[];const count=await db().execute({sql:`SELECT COUNT(*) n FROM users ${term}`,args});const users=await db().execute({sql:`SELECT id,name,firm_name AS firmName,mobile,address,created_at AS createdAt,price_visible AS priceVisible,price_expires_at AS expiresAt FROM users ${term} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,args:[...args,limit,offset]});return NextResponse.json({users:users.rows.map(u=>({...u,firmName:String(u.firmName||''),address:String(u.address||''),priceVisible:Boolean(u.priceVisible&&(!u.expiresAt||Date.parse(String(u.expiresAt))>Date.now())),remainingMs:u.expiresAt?Math.max(0,Date.parse(String(u.expiresAt))-Date.now()):null})),total:Number(count.rows[0]?.n||0),page,limit},{headers:{'Cache-Control':'no-store'}})}
 if(segments[0]==='admin'&&segments[1]==='users'&&segments[2]&&segments[3]==='price'&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]),parsed=z.object({enabled:z.boolean(),hours:z.number().min(0.01).max(24*365).nullable()}).safeParse(await bodyJson(req));if(!Number.isSafeInteger(id)||!parsed.success)return jsonError('Invalid price setting.');const expiry=parsed.data.enabled&&parsed.data.hours?new Date(Date.now()+parsed.data.hours*3600000).toISOString():null;const r=await db().execute({sql:'UPDATE users SET price_visible=?,price_expires_at=? WHERE id=? RETURNING id',args:[parsed.data.enabled?1:0,expiry,id]});if(!r.rows.length)return jsonError('User not found.',404);await log(a.id,'price_access_changed','user',id,{enabled:parsed.data.enabled,expiry});invalidatePrincipalCache();return NextResponse.json({ok:true})
 }
 if(segments[0]==='admin'&&segments[1]==='users'&&segments[2]&&segments[3]==='reset-password'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]);if(!Number.isSafeInteger(id))return jsonError('Invalid user.');const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';const temp=Array.from(crypto.randomBytes(16),b=>alphabet[b%alphabet.length]).join('');const hash=await bcrypt.hash(temp,12);const r=await db().execute({sql:'UPDATE users SET password_hash=?,must_change_password=1,token_version=token_version+1,failed_attempts=0,locked_until=NULL WHERE id=? RETURNING id',args:[hash,id]});if(!r.rows.length)return jsonError('User not found.',404);await log(a.id,'password_reset','user',id);invalidatePrincipalCache();return NextResponse.json({temporaryPassword:temp},{headers:{'Cache-Control':'no-store'}})
 }
 if(segments[0]==='admin'&&segments[1]==='users'&&segments[2]&&segments.length===3&&method==='DELETE'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]);if(!Number.isSafeInteger(id)||id<1)return jsonError('Invalid user ID.');const userRow=await db().execute({sql:'SELECT id,name,mobile FROM users WHERE id=?',args:[id]});if(!userRow.rows.length)return jsonError('User not found.',404);const u=userRow.rows[0];const r=await db().execute({sql:'DELETE FROM users WHERE id=? RETURNING id',args:[id]});if(!r.rows.length)return jsonError('User not found.',404);await log(a.id,'user_deleted','user',id,{name:u?.name,mobile:u?.mobile});invalidatePrincipalCache();return NextResponse.json({ok:true,deletedUser:{id,name:u?.name,mobile:u?.mobile}},{headers:{'Cache-Control':'no-store'}});
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&segments[2]&&method==='GET'){
  const id=Number(segments[2]);if(!Number.isSafeInteger(id)||id<1)return jsonError('Product not found.',404);const r=await db().execute({sql:'SELECT p.id,p.name,p.description,p.price,p.category_id AS categoryId,c.name AS category,p.created_at AS createdAt FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=?',args:[id]});if(!r.rows.length)return jsonError('Product not found.',404);const images=await db().execute({sql:'SELECT public_id AS publicId,version FROM product_images WHERE product_id=? ORDER BY sort_order',args:[id]});return NextResponse.json({product:{...r.rows[0],imageAssets:images.rows.map(i=>({...i,previewUrl:cloudUrl(String(i.publicId),String(i.version),300)}))}},{headers:{'Cache-Control':'no-store'}})
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&segments.length===2&&method==='GET'){
   const url=new URL(req.url),{page,limit,offset}=pagination(url.searchParams.get('page'),url.searchParams.get('limit'),50),q=(url.searchParams.get('q')||'').trim().slice(0,100);
   const catParam=url.searchParams.get('category')?.trim()||'';
   const catId=catParam?Number(catParam):null;
   const catTree = await loadCategoryTree();
   const catPathMap = new Map<number, string>();
   for (const c of catTree) catPathMap.set(c.id, c.fullPath);
   const conditions:string[]=[];
   const args:(string|number)[]=[];
   if(q){
     conditions.push('(p.name LIKE ? OR c.name LIKE ? OR CAST(p.price AS TEXT) LIKE ?)');
     args.push(`${q}%`,`${q}%`,`${q}%`);
   }
   if(catParam){
     if(Number.isSafeInteger(catId)&&catId!>0){
       const subtreeIds=getDescendantCategoryIds(catTree,catId!);
       const placeholders=subtreeIds.map(()=>'?').join(',');
       conditions.push(`p.category_id IN (${placeholders})`);
       args.push(...subtreeIds);
     }else{
       conditions.push('LOWER(c.name)=LOWER(?)');
       args.push(catParam);
     }
   }
   const where=conditions.length?`WHERE ${conditions.join(' AND ')}`:'';
   const countPromise = db().execute({sql:`SELECT COUNT(*) n FROM products p JOIN categories c ON c.id=p.category_id ${where}`,args});
   const prodsPromise = db().execute({
     sql: `SELECT p.id, p.name, p.description, p.price, p.category_id AS categoryId, c.name AS category, p.created_at AS createdAt
           FROM products p
           JOIN categories c ON c.id = p.category_id
           ${where}
           ORDER BY p.id DESC
           LIMIT ? OFFSET ?`,
     args: [...args, limit, offset]
   });
   const [count, prodsRes] = await Promise.all([countPromise, prodsPromise]);
   const prods = prodsRes.rows;
   const imagesByProdId: Record<number, { publicId: string; version: string; count: number }> = {};
   if (prods.length > 0) {
     const pIds = prods.map(r => Number(r.id));
     const placeholders = pIds.map(() => '?').join(',');
     const imgs = await db().execute({
       sql: `SELECT product_id, public_id, version, sort_order FROM product_images WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC`,
       args: pIds
     });
     for (const img of imgs.rows) {
       const pid = Number(img.product_id);
       if (!imagesByProdId[pid]) {
         imagesByProdId[pid] = {
           publicId: String(img.public_id || ''),
           version: String(img.version || '1'),
           count: 1
         };
       } else {
         imagesByProdId[pid].count++;
       }
     }
   }
   return NextResponse.json({
     products: prods.map(r => {
       const pid = Number(r.id);
       const imgInfo = imagesByProdId[pid];
       return {
         ...r,
         categoryPath: catPathMap.get(Number(r.categoryId)) || String(r.category),
         image: cloudUrl(imgInfo?.publicId || '', imgInfo?.version || '1', 300),
         imageCount: imgInfo ? imgInfo.count : 0
       };
     }),
     total: Number(count.rows[0]?.n || 0),
     page,
     limit
   }, { headers: { 'Cache-Control': 'no-store' } });
 }
 if(segments[0]==='admin'&&segments[1]==='categories'&&method==='GET'){
   const tree = await loadCategoryTree();
   return NextResponse.json({categories:tree},{headers:{'Cache-Control':'no-store'}});
 }
 if(segments[0]==='admin'&&segments[1]==='categories'&&segments.length===2&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);
  const parsed=z.object({name:z.string().trim().min(1).max(100),parentId:z.number().int().positive().nullable().optional()}).safeParse(await bodyJson(req));
  if(!parsed.success)return jsonError('Please enter a valid category name (1-100 characters).');
  const catName=parsed.data.name;
  const parentId=parsed.data.parentId??null;
  const tree=await loadCategoryTree();
  let newLevel:1|2|3=1;
  let prefix='';
  if(parentId!==null){
   const parentNode=tree.find(c=>c.id===parentId);
   if(!parentNode)return jsonError('Parent category not found.',404);
   if(parentNode.level>=3)return jsonError('Maximum 3 category levels allowed (Category → Sub Category → Sub-Sub Category).',400);
   newLevel=(parentNode.level+1) as 2|3;
   prefix=parentNode.fullPath;
  }
  const existing=await db().execute({sql:'SELECT id,name FROM categories WHERE LOWER(name)=LOWER(?) AND COALESCE(parent_id,0)=COALESCE(?,0)',args:[catName,parentId]});
  if(existing.rows.length){
   return NextResponse.json({
    error:`A category named "${existing.rows[0]?.name}" already exists at this level.`,
    existingCategory:{id:Number(existing.rows[0]?.id),name:String(existing.rows[0]?.name),parentId}
   },{status:409});
  }
  try{
   const r=await db().execute({sql:'INSERT INTO categories(name,parent_id) VALUES(?,?) RETURNING id,name,parent_id',args:[catName,parentId]});
   const created=r.rows[0];
   const catObj: CategoryTreeNode = {
    id:Number(created!.id),
    name:String(created!.name),
    parentId:created!.parent_id?Number(created!.parent_id):null,
    level:newLevel,
    fullPath:prefix?`${prefix} › ${String(created!.name)}`:String(created!.name),
    directProductCount:0,
    productCount:0
   };
   await log(a.id,'category_created','category',catObj.id,{name:catName,parentId});
    invalidateCategories();
   return NextResponse.json({ok:true,category:catObj},{status:201});
  }catch{
   return jsonError('Could not save category. Make sure the name is unique.',409);
  }
 }
 if(segments[0]==='admin'&&segments[1]==='categories'&&segments[2]&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);
  const id=Number(segments[2]);
  if(!Number.isSafeInteger(id)||id<1)return jsonError('Invalid category ID.',400);
  const parsed=z.object({name:z.string().trim().min(1).max(100)}).safeParse(await bodyJson(req));
  if(!parsed.success)return jsonError('Please enter a valid category name (1-100 characters).');
  const catName=parsed.data.name;
  const currentRow=await db().execute({sql:'SELECT id,parent_id FROM categories WHERE id=?',args:[id]});
  if(!currentRow.rows.length)return jsonError('Category not found.',404);
  const parentId=currentRow.rows[0]!.parent_id?Number(currentRow.rows[0]!.parent_id):null;
  const existing=await db().execute({sql:'SELECT id FROM categories WHERE LOWER(name)=LOWER(?) AND COALESCE(parent_id,0)=COALESCE(?,0) AND id!=?',args:[catName,parentId,id]});
  if(existing.rows.length){
   return jsonError(`A category named "${catName}" already exists at this level.`,409);
  }
  try{
   const r=await db().execute({sql:'UPDATE categories SET name=? WHERE id=? RETURNING id,name',args:[catName,id]});
   if(!r.rows.length)return jsonError('Category not found.',404);
   await log(a.id,'category_updated','category',id,{name:catName});
   invalidateCategories();
   invalidateProducts();
   return NextResponse.json({ok:true,category:{id,name:catName}});
  }catch{
   return jsonError('Could not rename category. Name may already exist.',409);
  }
 }
 if(segments[0]==='admin'&&segments[1]==='categories'&&segments[2]&&method==='DELETE'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);
  const id=Number(segments[2]);
  if(!Number.isSafeInteger(id)||id<1)return jsonError('Invalid category ID.',400);
  const tree=await loadCategoryTree();
  const targetNode=tree.find(c=>c.id===id);
  if(!targetNode)return jsonError('Category not found.',404);
  const subtreeIds=getDescendantCategoryIds(tree,id);
  // Order bottom-up (level 3 -> level 2 -> level 1) to satisfy parent_id FK on deletion
  const subtreeBottomUp=tree.filter(c=>subtreeIds.includes(c.id)).sort((x,y)=>y.level-x.level).map(c=>c.id);
  const placeholders=subtreeIds.map(()=>'?').join(',');
  const countRow=await db().execute({sql:`SELECT COUNT(*) n FROM products WHERE category_id IN (${placeholders})`,args:subtreeIds});
  const prodCount=Number(countRow.rows[0]?.n||0);
  const childCount=subtreeIds.length-1;
  const url=new URL(req.url);
  const body=await bodyJson(req);
  const action=(body?.action||url.searchParams.get('action')||'').toLowerCase();
  const targetCatId=Number(body?.targetCategoryId||url.searchParams.get('targetCategoryId'))||null;

  if((prodCount>0||childCount>0)&&!action){
   return jsonError(`Category contains ${prodCount} product(s)${childCount>0?` and ${childCount} sub-category(ies)`:''}. Choose to merge or delete all.`,409);
  }

  if(action==='merge'){
   if(!targetCatId||subtreeIds.includes(targetCatId))return jsonError('Please select a valid destination category outside this category tree.',400);
   const targetCat=await db().execute({sql:'SELECT id FROM categories WHERE id=?',args:[targetCatId]});
   if(!targetCat.rows.length)return jsonError('Target category not found.',404);
   const tx=await db().transaction('write');
   try{
    if(prodCount>0){
     await tx.execute({sql:`UPDATE products SET category_id=? WHERE category_id IN (${placeholders})`,args:[targetCatId,...subtreeIds]});
    }
    for(const cid of subtreeBottomUp){
     await tx.execute({sql:'DELETE FROM categories WHERE id=?',args:[cid]});
    }
    await tx.commit();
    await log(a.id,'category_merged_and_deleted','category',id,{targetCategoryId:targetCatId,mergedCount:prodCount,deletedSubcategories:childCount});
     invalidateCategories();
     invalidateProducts();
    return NextResponse.json({ok:true,mergedCount:prodCount});
   }catch(e){
    console.error('Category merge & delete failed:',e instanceof Error?e.message:e);
    await tx.rollback();
    return jsonError('Could not merge products.',500);
   }
  }

  if(action==='deleteall'||action==='delete_all'){
   const imgs=await db().execute({sql:`SELECT i.public_id FROM product_images i JOIN products p ON p.id=i.product_id WHERE p.category_id IN (${placeholders})`,args:subtreeIds});
   const tx=await db().transaction('write');
   try{
    await tx.execute({sql:`DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE category_id IN (${placeholders}))`,args:subtreeIds});
    await tx.execute({sql:`DELETE FROM products WHERE category_id IN (${placeholders})`,args:subtreeIds});
    for(const cid of subtreeBottomUp){
     await tx.execute({sql:'DELETE FROM categories WHERE id=?',args:[cid]});
    }
    await tx.commit();
    await log(a.id,'category_and_products_deleted','category',id,{deletedCount:prodCount,deletedSubcategories:childCount});
     invalidateCategories();
     invalidateProducts();
    if(imgs.rows.length){
     await destroyAssets(imgs.rows.map(x=>String(x.public_id)));
    }
    return NextResponse.json({ok:true,deletedCount:prodCount});
   }catch(e){
    console.error('Category delete all failed:',e instanceof Error?e.message:e);
    await tx.rollback();
    return jsonError('Could not delete category and products.',500);
   }
  }

  if(prodCount>0||childCount>0)return jsonError('Category contains products or sub-categories. Move or delete them first.',409);
  const r=await db().execute({sql:'DELETE FROM categories WHERE id=? RETURNING id',args:[id]});
  if(!r.rows.length)return jsonError('Category not found.',404);
  await log(a.id,'category_deleted','category',id);
  invalidateCategories();
  invalidateProducts();
  return NextResponse.json({ok:true});
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const parsed=productSchema.safeParse(await bodyJson(req));if(!parsed.success)return jsonError('Please check the product details.');const d=parsed.data;if(!await verifyOwnedAssets(d.images,a.id))return jsonError('One or more images could not be verified.',400);const tx=await db().transaction('write');try{const r=await tx.execute({sql:'INSERT INTO products(name,description,price,category_id) VALUES(?,?,?,?) RETURNING id',args:[d.name,d.description,d.price,d.categoryId]});const id=Number(r.rows[0]!.id);for(let i=0;i<d.images.length;i++)await tx.execute({sql:'INSERT INTO product_images(product_id,public_id,version,sort_order) VALUES(?,?,?,?)',args:[id,d.images[i]!.publicId,d.images[i]!.version,i]});for(const im of d.images)await tx.execute({sql:'UPDATE uploaded_assets SET claimed=1 WHERE public_id=? AND admin_id=?',args:[im.publicId,a.id]});await tx.commit();await log(a.id,'product_created','product',id);invalidateCategories();invalidateProducts();return NextResponse.json({id},{status:201})}catch{await tx.rollback();return jsonError('Could not save the product.',400)}
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&segments[2]&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]),parsed=productSchema.safeParse(await bodyJson(req));if(!Number.isSafeInteger(id)||!parsed.success)return jsonError('Please check the product details.');const d=parsed.data;if(!await verifyOwnedAssets(d.images,a.id,id))return jsonError('One or more images could not be verified.',400);const product=await db().execute({sql:'SELECT id FROM products WHERE id=?',args:[id]});if(!product.rows.length)return jsonError('Product not found.',404);const old=await db().execute({sql:'SELECT public_id FROM product_images WHERE product_id=?',args:[id]});const tx=await db().transaction('write');try{await tx.execute({sql:'UPDATE products SET name=?,description=?,price=?,category_id=? WHERE id=?',args:[d.name,d.description,d.price,d.categoryId,id]});await tx.execute({sql:'DELETE FROM product_images WHERE product_id=?',args:[id]});for(let i=0;i<d.images.length;i++){await tx.execute({sql:'INSERT INTO product_images(product_id,public_id,version,sort_order) VALUES(?,?,?,?)',args:[id,d.images[i]!.publicId,d.images[i]!.version,i]});await tx.execute({sql:'UPDATE uploaded_assets SET claimed=1 WHERE public_id=? AND admin_id=?',args:[d.images[i]!.publicId,a.id]})}await tx.commit();await log(a.id,'product_updated','product',id);invalidateCategories();invalidateProducts()}catch{await tx.rollback();return jsonError('Could not update the product.',400)}await destroyAssets(old.rows.map(r=>String(r.public_id)).filter(id=>!d.images.some(i=>i.publicId===id)));return NextResponse.json({ok:true})
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&segments[2]&&method==='DELETE'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]),old=await db().execute({sql:'SELECT public_id FROM product_images WHERE product_id=?',args:[id]});const r=await db().execute({sql:'DELETE FROM products WHERE id=? RETURNING id',args:[id]});if(!r.rows.length)return jsonError('Product not found.',404);await log(a.id,'product_deleted','product',id);invalidateCategories();invalidateProducts();await destroyAssets(old.rows.map(x=>String(x.public_id)));return NextResponse.json({ok:true})
 }
 if(segments[0]==='admin'&&segments[1]==='settings'&&method==='GET'){const r=await db().execute({sql:'SELECT value FROM app_settings WHERE key=?',args:['whatsapp']});return NextResponse.json({whatsapp:r.rows[0]?.value||''},{headers:{'Cache-Control':'no-store'}})}
 if(segments[0]==='admin'&&segments[1]==='settings'&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const parsed=z.object({whatsapp:z.string().regex(/^\d{10,15}$/)}).safeParse(await bodyJson(req));if(!parsed.success)return jsonError('Enter a WhatsApp number with country code.');await db().execute({sql:'INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',args:['whatsapp',parsed.data.whatsapp]});invalidateSettings();return NextResponse.json({ok:true})
 }
 return jsonError('Not found.',404)
}

async function dispatch(req:Request,ctx:Ctx){try{await ensureSchema();const{segments=[]}=await ctx.params;if(segments[0]==='admin'&&segments[1]==='login'&&req.method==='POST')return userRoute(req,segments);if(segments[0]==='admin'&&segments[1]==='logout'&&req.method==='POST'){if(!await csrf(req))return jsonError('Invalid request origin.',403);const p=await requireRole('admin');if(!p)return jsonError('Administrator access required.',403);const out=NextResponse.json({ok:true});await clearSession(out);return out}if(segments[0]==='uploads')return adminRoute(req,segments);if(segments[0]==='admin'||segments[0]==='uploads')return adminRoute(req,segments);return userRoute(req,segments)}catch(e){return fail(e)}}
export const GET=dispatch;export const POST=dispatch;export const PUT=dispatch;export const DELETE=dispatch;
