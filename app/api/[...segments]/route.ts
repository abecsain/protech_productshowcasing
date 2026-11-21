import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'node:crypto';
import { db, ensureSchema } from '@/lib/db';
import { clearSession, jsonError, principal, requireRole, setSession, validOrigin } from '@/lib/security';
import { pagination, validPassword, cloudinaryProductId, lockoutState, canRequestUpload } from '@/lib/policy.mjs';

export const runtime='nodejs';
type Ctx={params:Promise<{segments:string[]}>};
const mobileSchema=z.string().transform((val)=>{let d=val.replace(/\D/g,'');if(d.length===12&&d.startsWith('91'))d=d.slice(2);if(d.length===11&&d.startsWith('0'))d=d.slice(1);return d;}).pipe(z.string().regex(/^\d{10}$/));
const nameSchema=z.string().trim().min(2).max(80);
const passwordSchema=z.string().min(8).max(72);
const productSchema=z.object({name:z.string().trim().min(2).max(100),description:z.string().trim().max(200),price:z.number().finite().min(0).max(100000000),categoryId:z.number().int().positive(),images:z.array(z.object({publicId:z.string().min(1),version:z.string().regex(/^\d+$/)})).min(0).max(5).default([])});
const cloud=()=>{const {CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,CLOUDINARY_API_SECRET}=process.env;if(!CLOUDINARY_CLOUD_NAME||!CLOUDINARY_API_KEY||!CLOUDINARY_API_SECRET)throw new Error('Image storage is not configured.');cloudinary.config({cloud_name:CLOUDINARY_CLOUD_NAME,api_key:CLOUDINARY_API_KEY,api_secret:CLOUDINARY_API_SECRET,secure:true});return cloudinary};
const fail=(e:unknown)=>{console.error('API request failed:',e instanceof Error?e.message:'unknown');return jsonError('The request could not be completed.',500)};
async function bodyJson(req:Request){try{return await req.json()}catch{return null}}
async function csrf(req:Request){return await validOrigin(req)}
async function allow(bucket:string,limit=5,windowSec=60){await ensureSchema();const now=Math.floor(Date.now()/1000),key=crypto.createHash('sha256').update(bucket).digest('hex');const r=await db().execute({sql:`INSERT INTO rate_limits(bucket,window_start,count) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN rate_limits.window_start<=? THEN 1 ELSE rate_limits.count+1 END,window_start=CASE WHEN rate_limits.window_start<=? THEN excluded.window_start ELSE rate_limits.window_start END RETURNING count,window_start`,args:[key,now-windowSec,now-windowSec,now-windowSec]});const row=r.rows[0];return row&&Number(row.count)<=limit}
function ip(req:Request){return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-real-ip')||'unknown'}
async function log(adminId:number,action:string,targetType:string,targetId:string|number|null,details:Record<string,unknown>={}){await db().execute({sql:'INSERT INTO admin_audit_log(admin_id,action,target_type,target_id,details) VALUES(?,?,?,?,?)',args:[adminId,action,targetType,targetId===null?null:String(targetId),JSON.stringify(details)]})}
function cloudUrl(publicId:string,version:string,width=300){if(!publicId)return '/product-placeholder.svg';if(publicId.startsWith('http://')||publicId.startsWith('https://'))return publicId;if(publicId.startsWith('seed/')||publicId.startsWith('unsplash/')){const raw=publicId.split('#')[0].replace(/^(seed|unsplash)\//,'');const match=raw.match(/photo-[a-zA-Z0-9-]+/);if(match){const cleanId=match[0].replace(/-\d+$/,'');return `https://images.unsplash.com/${cleanId}?auto=format&fit=crop&w=${width}&q=80`}return '/product-placeholder.svg'}const cname=process.env.CLOUDINARY_CLOUD_NAME;if(!cname||cname==='your_cloud_name')return '/product-placeholder.svg';return `https://res.cloudinary.com/${cname}/image/upload/f_auto,q_auto,w_${width},c_limit/${version}/${publicId}`}
async function verifyOwnedAssets(ids:{publicId:string;version:string}[],adminId:number,existingProductId?:number){for(const item of ids){if(!cloudinaryProductId(item.publicId))return false;if(existingProductId){const old=await db().execute({sql:'SELECT 1 FROM product_images WHERE product_id=? AND public_id=? AND version=?',args:[existingProductId,item.publicId,item.version]});if(old.rows.length)continue;}const a=await db().execute({sql:'SELECT 1 FROM uploaded_assets WHERE public_id=? AND admin_id=? AND claimed=0',args:[item.publicId,adminId]});if(!a.rows.length)return false;const asset=await cloud().api.resource(item.publicId,{resource_type:'image'});if(asset.resource_type!=='image'||String(asset.version)!==item.version||!['webp','jpg','jpeg','png'].includes(asset.format)||!item.publicId.startsWith('protech/products/'))return false;}return true}
async function destroyAssets(ids:string[]){for(const id of ids){try{await cloud().uploader.destroy(id,{resource_type:'image',invalidate:true})}catch(e){console.error('Cloudinary cleanup failed for asset',id,e instanceof Error?e.message:'unknown');await db().execute({sql:'INSERT INTO admin_audit_log(admin_id,action,target_type,target_id,details) VALUES(0,?,?,?,?)',args:['cleanup_failed','image',id,'{}']}).catch(()=>{})}}}
async function userRoute(req:Request,segments:string[]){
 await ensureSchema();const method=req.method;
 if(segments.join('/')==='auth/register'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const b=await bodyJson(req),schema=z.object({name:nameSchema,mobile:mobileSchema,password:passwordSchema,confirmPassword:passwordSchema});const parsed=schema.safeParse(b);if(!parsed.success)return jsonError('Please check your registration details.');const {name,mobile,password,confirmPassword}=parsed.data;if(!validPassword(password,mobile)||confirmPassword!==password)return jsonError('Use a strong password and make sure the passwords match.');if(!await allow(`register:ip:${ip(req)}`)||!await allow(`register:mobile:${mobile}`))return jsonError('Too many attempts. Try again in a minute.',429);const hash=await bcrypt.hash(password,12);try{const r=await db().execute({sql:'INSERT INTO users(name,mobile,password_hash) VALUES(?,?,?) RETURNING id,token_version',args:[name,mobile,hash]});const out=NextResponse.json({user:{name,mobile,role:'user'}},{status:201,headers:{'Cache-Control':'no-store'}});await setSession(out,'user',Number(r.rows[0]!.id),Number(r.rows[0]!.token_version));return out}catch{return jsonError('An account could not be created with those details.',409)}
 }
 if(segments.join('/')==='auth/login'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const b=await bodyJson(req),parsed=z.object({mobile:mobileSchema,password:passwordSchema}).safeParse(b);if(!parsed.success)return jsonError('Invalid mobile or password.',401);const {mobile,password}=parsed.data;if(!await allow(`login:ip:${ip(req)}`)||!await allow(`login:mobile:${mobile}`))return jsonError('Too many attempts. Try again in a minute.',429);const r=await db().execute({sql:'SELECT id,password_hash,failed_attempts,locked_until,token_version FROM users WHERE mobile=?',args:[mobile]});const u=r.rows[0];if(!u)return jsonError('Invalid mobile or password.',401);if(u.locked_until&&Date.parse(String(u.locked_until))>Date.now())return jsonError('Invalid mobile or password.',401);if(!await bcrypt.compare(password,String(u.password_hash))){const state=lockoutState(Number(u.failed_attempts),u.locked_until?String(u.locked_until):null);await db().execute({sql:'UPDATE users SET failed_attempts=?,locked_until=? WHERE id=?',args:[state.failed,state.lockedUntil||null,u.id]});return jsonError('Invalid mobile or password.',401)}await db().execute({sql:'UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=?',args:[u.id]});const out=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});await setSession(out,'user',Number(u.id),Number(u.token_version));return out;
 }
 if(segments.join('/')==='admin/login'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const b=await bodyJson(req),parsed=z.object({username:z.string().min(1).max(80),password:passwordSchema}).safeParse(b);if(!parsed.success)return jsonError('Invalid username or password.',401);if(!await allow(`admin-login:ip:${ip(req)}`))return jsonError('Too many attempts. Try again in a minute.',429);const r=await db().execute({sql:'SELECT id,password_hash,failed_attempts,locked_until,token_version FROM admin_users WHERE username=?',args:[parsed.data.username]});const u=r.rows[0];if(!u||u.locked_until&&Date.parse(String(u.locked_until))>Date.now()||!await bcrypt.compare(parsed.data.password,String(u?.password_hash||'$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'))){if(u){const state=lockoutState(Number(u.failed_attempts),u.locked_until?String(u.locked_until):null);await db().execute({sql:'UPDATE admin_users SET failed_attempts=?,locked_until=? WHERE id=?',args:[state.failed,state.lockedUntil||null,u.id]})}return jsonError('Invalid username or password.',401)}await db().execute({sql:'UPDATE admin_users SET failed_attempts=0,locked_until=NULL WHERE id=?',args:[u.id]});const out=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});await setSession(out,'admin',Number(u.id),Number(u.token_version));return out;
 }
 if(segments.join('/')==='auth/logout'&&method==='POST'){if(!await csrf(req))return jsonError('Invalid request origin.',403);const out=NextResponse.json({ok:true});await clearSession(out);return out}
 if(segments.join('/')==='auth/me'&&method==='GET'){const p=await principal();if(!p)return jsonError('Sign in required.',401);return NextResponse.json({user:p},{headers:{'Cache-Control':'no-store'}})}
 if(segments.join('/')==='auth/password'&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const p=await requireRole('user');if(!p)return jsonError('Sign in required.',401);const parsed=z.object({oldPassword:passwordSchema,newPassword:passwordSchema,confirmPassword:passwordSchema}).safeParse(await bodyJson(req));if(!parsed.success)return jsonError('Please check your password details.');const v=parsed.data;if(v.newPassword!==v.confirmPassword||!validPassword(v.newPassword,p.mobile!))return jsonError('Choose a strong password and make sure the passwords match.');const u=await db().execute({sql:'SELECT password_hash,token_version FROM users WHERE id=?',args:[p.id]});if(!await bcrypt.compare(v.oldPassword,String(u.rows[0]!.password_hash)))return jsonError('Current password is incorrect.',403);const hash=await bcrypt.hash(v.newPassword,12);await db().execute({sql:'UPDATE users SET password_hash=?,must_change_password=0,token_version=token_version+1 WHERE id=?',args:[hash,p.id]});const out=NextResponse.json({ok:true});await setSession(out,'user',p.id,p.version+1);return out;
 }
 const p=await principal();if(!p||(p.role!=='user'&&p.role!=='admin'))return jsonError('Sign in required.',401);if(p.role==='user'&&p.mustChange&&segments[0]!=='auth')return jsonError('Password change required.',403);
 if(segments[0]==='categories'&&method==='GET'){const r=await db().execute('SELECT id,name FROM categories ORDER BY name COLLATE NOCASE');return NextResponse.json({categories:r.rows},{headers:{'Cache-Control':'private, no-store'}})}
 if(segments[0]==='products'&&segments.length===1&&method==='GET'){
  const url=new URL(req.url),{page,limit,offset}=pagination(url.searchParams.get('page'),url.searchParams.get('limit'),24),q=(url.searchParams.get('q')||'').trim().slice(0,100),cat=Number(url.searchParams.get('category'))||null;if(q&&!await allow(`search:${ip(req)}`,60))return jsonError('Search limit reached. Try again shortly.',429);
  const where=[] as string[],args:(string|number)[]=[];if(q){where.push('(p.name LIKE ? OR p.description LIKE ?)');args.push(`${q}%`,`%${q}%`)}if(cat){where.push('p.category_id=?');args.push(cat)}const w=where.length?`WHERE ${where.join(' AND ')}`:'';const count=await db().execute({sql:`SELECT COUNT(*) AS n FROM products p ${w}`,args});const price=p.canSeePrices?'p.price,':'';const list=await db().execute({sql:`SELECT p.id,p.name,p.description,${price} c.name AS category,c.id AS categoryId,p.created_at AS createdAt,MIN(i.public_id) AS publicId,MIN(i.version) AS imageVersion,COUNT(i.id) AS imageCount FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN product_images i ON i.product_id=p.id ${w} GROUP BY p.id ORDER BY p.id DESC LIMIT ? OFFSET ?`,args:[...args,limit,offset]});const items=list.rows.map(r=>({id:r.id,name:r.name,description:r.description,category:r.category,categoryId:r.categoryId,createdAt:r.createdAt,image:cloudUrl(String(r.publicId||''),String(r.imageVersion||'1'),300),imageCount:Number(r.imageCount),...(p.canSeePrices?{price:r.price}:{})}));return NextResponse.json({products:items,page,limit,total:Number(count.rows[0]?.n||0),canSeePrices:p.canSeePrices},{headers:{'Cache-Control':'private, no-store'}})
 }
 if(segments[0]==='products'&&segments[1]&&method==='GET'){const id=Number(segments[1]);if(!Number.isSafeInteger(id)||id<1)return jsonError('Product not found.',404);const price=p.canSeePrices?'p.price,':'';const r=await db().execute({sql:`SELECT p.id,p.name,p.description,${price}c.name AS category,c.id AS categoryId FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=?`,args:[id]});if(!r.rows.length)return jsonError('Product not found.',404);const imgs=await db().execute({sql:'SELECT public_id,version FROM product_images WHERE product_id=? ORDER BY sort_order',args:[id]});return NextResponse.json({product:{...r.rows[0],images:imgs.rows.map(i=>cloudUrl(String(i.public_id),String(i.version),800))}},{headers:{'Cache-Control':'private, no-store'}})}
 if(segments[0]==='settings'&&method==='GET'){const r=await db().execute({sql:'SELECT value FROM app_settings WHERE key=?',args:['whatsapp']});return NextResponse.json({whatsapp:r.rows[0]?.value||''},{headers:{'Cache-Control':'private, no-store'}})}
 return jsonError('Not found.',404)
}

async function adminRoute(req:Request,segments:string[]){await ensureSchema();const method=req.method;
 if(segments.join('/')==='uploads/signature'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const a=await requireRole('admin');if(!canRequestUpload(a?.role))return jsonError('Administrator access required.',403);if(!a)return jsonError('Administrator access required.',403);if(!await allow(`upload:${ip(req)}`,12))return jsonError('Upload limit reached. Try again later.',429);const cl=cloud(),timestamp=Math.floor(Date.now()/1000),publicId=`protech/products/${crypto.randomUUID()}`,folder='protech/products',preset=process.env.CLOUDINARY_UPLOAD_PRESET;if(!preset)return jsonError('Image upload is not configured.',503);const params={timestamp,folder,public_id:publicId,upload_preset:preset};const signature=cl.utils.api_sign_request(params,process.env.CLOUDINARY_API_SECRET!);await db().execute({sql:'INSERT INTO uploaded_assets(public_id,admin_id) VALUES(?,?)',args:[publicId,a.id]});return NextResponse.json({cloudName:process.env.CLOUDINARY_CLOUD_NAME,apiKey:process.env.CLOUDINARY_API_KEY,signature,timestamp,folder,publicId,uploadPreset:preset},{headers:{'Cache-Control':'no-store'}})
 }
 if(segments.join('/')==='uploads/verify'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const a=await requireRole('admin');if(!a)return jsonError('Administrator access required.',403);const parsed=z.object({publicId:z.string().min(1),version:z.string().regex(/^\d+$/)}).safeParse(await bodyJson(req));if(!parsed.success)return jsonError('Invalid uploaded image.');try{if(!await verifyOwnedAssets([parsed.data],a.id))return jsonError('Uploaded image could not be verified.',400);const asset=await cloud().api.resource(parsed.data.publicId,{resource_type:'image'});if(Number(asset.bytes)>350000||asset.width>800||asset.height>800)return jsonError('Image must be resized before upload.',400);return NextResponse.json({ok:true})}catch{return jsonError('Uploaded image could not be verified.',400)}
 }
 const a=await requireRole('admin');if(!a)return jsonError('Administrator access required.',403);
 if(segments[0]==='admin'&&segments[1]==='dashboard'&&method==='GET'){const [p,u]=await Promise.all([db().execute('SELECT COUNT(*) n FROM products'),db().execute('SELECT COUNT(*) n FROM users')]);return NextResponse.json({products:Number(p.rows[0]?.n),users:Number(u.rows[0]?.n)},{headers:{'Cache-Control':'no-store'}})}
 if(segments[0]==='admin'&&segments[1]==='users'&&segments.length===2&&method==='GET'){const url=new URL(req.url),{page,limit,offset}=pagination(url.searchParams.get('page'),url.searchParams.get('limit'),50),q=(url.searchParams.get('q')||'').trim().slice(0,80);if(q&&!await allow(`admin-search:${ip(req)}`,60))return jsonError('Search limit reached.',429);const term=q?`WHERE name LIKE ? OR mobile LIKE ?`:'';const args=q?[`${q}%`,`${q}%`]:[];const count=await db().execute({sql:`SELECT COUNT(*) n FROM users ${term}`,args});const users=await db().execute({sql:`SELECT id,name,mobile,created_at AS createdAt,price_visible AS priceVisible,price_expires_at AS expiresAt FROM users ${term} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,args:[...args,limit,offset]});return NextResponse.json({users:users.rows.map(u=>({...u,priceVisible:Boolean(u.priceVisible&&(!u.expiresAt||Date.parse(String(u.expiresAt))>Date.now())),remainingMs:u.expiresAt?Math.max(0,Date.parse(String(u.expiresAt))-Date.now()):null})),total:Number(count.rows[0]?.n||0),page,limit},{headers:{'Cache-Control':'no-store'}})}
 if(segments[0]==='admin'&&segments[1]==='users'&&segments[2]&&segments[3]==='price'&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]),parsed=z.object({enabled:z.boolean(),hours:z.number().min(0.01).max(24*365).nullable()}).safeParse(await bodyJson(req));if(!Number.isSafeInteger(id)||!parsed.success)return jsonError('Invalid price setting.');const expiry=parsed.data.enabled&&parsed.data.hours?new Date(Date.now()+parsed.data.hours*3600000).toISOString():null;const r=await db().execute({sql:'UPDATE users SET price_visible=?,price_expires_at=? WHERE id=? RETURNING id',args:[parsed.data.enabled?1:0,expiry,id]});if(!r.rows.length)return jsonError('User not found.',404);await log(a.id,'price_access_changed','user',id,{enabled:parsed.data.enabled,expiry});return NextResponse.json({ok:true})
 }
 if(segments[0]==='admin'&&segments[1]==='users'&&segments[2]&&segments[3]==='reset-password'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]);if(!Number.isSafeInteger(id))return jsonError('Invalid user.');const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';const temp=Array.from(crypto.randomBytes(16),b=>alphabet[b%alphabet.length]).join('');const hash=await bcrypt.hash(temp,12);const r=await db().execute({sql:'UPDATE users SET password_hash=?,must_change_password=1,token_version=token_version+1,failed_attempts=0,locked_until=NULL WHERE id=? RETURNING id',args:[hash,id]});if(!r.rows.length)return jsonError('User not found.',404);await log(a.id,'password_reset','user',id);return NextResponse.json({temporaryPassword:temp},{headers:{'Cache-Control':'no-store'}})
 }
 if(segments[0]==='admin'&&segments[1]==='users'&&segments[2]&&segments.length===3&&method==='DELETE'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]);if(!Number.isSafeInteger(id)||id<1)return jsonError('Invalid user ID.');const userRow=await db().execute({sql:'SELECT id,name,mobile FROM users WHERE id=?',args:[id]});if(!userRow.rows.length)return jsonError('User not found.',404);const u=userRow.rows[0];const r=await db().execute({sql:'DELETE FROM users WHERE id=? RETURNING id',args:[id]});if(!r.rows.length)return jsonError('User not found.',404);await log(a.id,'user_deleted','user',id,{name:u?.name,mobile:u?.mobile});return NextResponse.json({ok:true,deletedUser:{id,name:u?.name,mobile:u?.mobile}},{headers:{'Cache-Control':'no-store'}});
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&segments[2]&&method==='GET'){
  const id=Number(segments[2]);if(!Number.isSafeInteger(id)||id<1)return jsonError('Product not found.',404);const r=await db().execute({sql:'SELECT p.id,p.name,p.description,p.price,p.category_id AS categoryId,c.name AS category,p.created_at AS createdAt FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=?',args:[id]});if(!r.rows.length)return jsonError('Product not found.',404);const images=await db().execute({sql:'SELECT public_id AS publicId,version FROM product_images WHERE product_id=? ORDER BY sort_order',args:[id]});return NextResponse.json({product:{...r.rows[0],imageAssets:images.rows.map(i=>({...i,previewUrl:cloudUrl(String(i.publicId),String(i.version),300)}))}},{headers:{'Cache-Control':'no-store'}})
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&segments.length===2&&method==='GET'){
  const url=new URL(req.url),{page,limit,offset}=pagination(url.searchParams.get('page'),url.searchParams.get('limit'),50),q=(url.searchParams.get('q')||'').trim().slice(0,100),where=q?'WHERE p.name LIKE ? OR c.name LIKE ? OR CAST(p.price AS TEXT) LIKE ?':'',args=q?[`${q}%`,`${q}%`,`${q}%`]:[];const count=await db().execute({sql:`SELECT COUNT(DISTINCT p.id) n FROM products p JOIN categories c ON c.id=p.category_id ${where}`,args});const rows=await db().execute({sql:`SELECT p.id,p.name,p.description,p.price,p.category_id AS categoryId,c.name AS category,p.created_at AS createdAt,MIN(i.public_id) AS publicId,MIN(i.version) AS imageVersion,COUNT(DISTINCT i.id) AS imageCount FROM products p JOIN categories c ON c.id=p.category_id LEFT JOIN product_images i ON i.product_id=p.id ${where} GROUP BY p.id ORDER BY p.id DESC LIMIT ? OFFSET ?`,args:[...args,limit,offset]});return NextResponse.json({products:rows.rows.map(r=>({...r,image:cloudUrl(String(r.publicId||''),String(r.imageVersion||'1'),300),imageCount:Number(r.imageCount||0)})),total:Number(count.rows[0]?.n||0),page,limit},{headers:{'Cache-Control':'no-store'}})}
 if(segments[0]==='admin'&&segments[1]==='categories'&&method==='GET'){const r=await db().execute('SELECT c.id,c.name,COUNT(p.id) productCount FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.name');return NextResponse.json({categories:r.rows},{headers:{'Cache-Control':'no-store'}})}
 if(segments[0]==='admin'&&segments[1]==='categories'&&segments.length===2&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);
  const parsed=z.object({name:z.string().trim().min(1).max(100)}).safeParse(await bodyJson(req));
  if(!parsed.success)return jsonError('Please enter a valid category name (1-100 characters).');
  const catName=parsed.data.name;
  const existing=await db().execute({sql:'SELECT id,name FROM categories WHERE LOWER(name)=LOWER(?)',args:[catName]});
  if(existing.rows.length){
   return NextResponse.json({
    error:`A category named "${existing.rows[0]?.name}" already exists.`,
    existingCategory:{id:Number(existing.rows[0]?.id),name:String(existing.rows[0]?.name)}
   },{status:409});
  }
  try{
   const r=await db().execute({sql:'INSERT INTO categories(name) VALUES(?) RETURNING id,name',args:[catName]});
   const created=r.rows[0];
   const catObj={id:Number(created!.id),name:String(created!.name),productCount:0};
   await log(a.id,'category_created','category',catObj.id,{name:catName});
   return NextResponse.json({ok:true,category:catObj},{status:201});
  }catch{
   return jsonError('Could not save category.',400);
  }
 }
 if(segments[0]==='admin'&&segments[1]==='categories'&&segments[2]&&method==='DELETE'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);
  const id=Number(segments[2]);
  if(!Number.isSafeInteger(id)||id<1)return jsonError('Invalid category ID.',400);
  const countRow=await db().execute({sql:'SELECT COUNT(*) n FROM products WHERE category_id=?',args:[id]});
  const prodCount=Number(countRow.rows[0]?.n||0);
  const url=new URL(req.url);
  const body=await bodyJson(req);
  const action=(body?.action||url.searchParams.get('action')||'').toLowerCase();
  const targetCatId=Number(body?.targetCategoryId||url.searchParams.get('targetCategoryId'))||null;

  if(prodCount>0&&!action){
   return jsonError(`Category contains ${prodCount} product(s). Choose to merge or delete all.`,409);
  }

  if(action==='merge'){
   if(!targetCatId||targetCatId===id)return jsonError('Please select a valid destination category.',400);
   const targetCat=await db().execute({sql:'SELECT id FROM categories WHERE id=?',args:[targetCatId]});
   if(!targetCat.rows.length)return jsonError('Target category not found.',404);
   const tx=await db().transaction('write');
   try{
    await tx.execute({sql:'UPDATE products SET category_id=? WHERE category_id=?',args:[targetCatId,id]});
    await tx.execute({sql:'DELETE FROM categories WHERE id=?',args:[id]});
    await tx.commit();
    await log(a.id,'category_merged_and_deleted','category',id,{targetCategoryId:targetCatId,mergedCount:prodCount});
    return NextResponse.json({ok:true,mergedCount:prodCount});
   }catch{
    await tx.rollback();
    return jsonError('Could not merge products.',500);
   }
  }

  if(action==='deleteall'||action==='delete_all'){
   const imgs=await db().execute({sql:'SELECT i.public_id FROM product_images i JOIN products p ON p.id=i.product_id WHERE p.category_id=?',args:[id]});
   const tx=await db().transaction('write');
   try{
    await tx.execute({sql:'DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE category_id=?)',args:[id]});
    await tx.execute({sql:'DELETE FROM products WHERE category_id=?',args:[id]});
    await tx.execute({sql:'DELETE FROM categories WHERE id=?',args:[id]});
    await tx.commit();
    await log(a.id,'category_and_products_deleted','category',id,{deletedCount:prodCount});
    if(imgs.rows.length){
     await destroyAssets(imgs.rows.map(x=>String(x.public_id)));
    }
    return NextResponse.json({ok:true,deletedCount:prodCount});
   }catch{
    await tx.rollback();
    return jsonError('Could not delete category and products.',500);
   }
  }

  if(prodCount>0)return jsonError('Category contains products. Move or delete them first.',409);
  const r=await db().execute({sql:'DELETE FROM categories WHERE id=? RETURNING id',args:[id]});
  if(!r.rows.length)return jsonError('Category not found.',404);
  await log(a.id,'category_deleted','category',id);
  return NextResponse.json({ok:true});
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&method==='POST'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const parsed=productSchema.safeParse(await bodyJson(req));if(!parsed.success)return jsonError('Please check the product details.');const d=parsed.data;if(!await verifyOwnedAssets(d.images,a.id))return jsonError('One or more images could not be verified.',400);const tx=await db().transaction('write');try{const r=await tx.execute({sql:'INSERT INTO products(name,description,price,category_id) VALUES(?,?,?,?) RETURNING id',args:[d.name,d.description,d.price,d.categoryId]});const id=Number(r.rows[0]!.id);for(let i=0;i<d.images.length;i++)await tx.execute({sql:'INSERT INTO product_images(product_id,public_id,version,sort_order) VALUES(?,?,?,?)',args:[id,d.images[i]!.publicId,d.images[i]!.version,i]});for(const im of d.images)await tx.execute({sql:'UPDATE uploaded_assets SET claimed=1 WHERE public_id=? AND admin_id=?',args:[im.publicId,a.id]});await tx.commit();await log(a.id,'product_created','product',id);return NextResponse.json({id},{status:201})}catch{await tx.rollback();return jsonError('Could not save the product.',400)}
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&segments[2]&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]),parsed=productSchema.safeParse(await bodyJson(req));if(!Number.isSafeInteger(id)||!parsed.success)return jsonError('Please check the product details.');const d=parsed.data;if(!await verifyOwnedAssets(d.images,a.id,id))return jsonError('One or more images could not be verified.',400);const product=await db().execute({sql:'SELECT id FROM products WHERE id=?',args:[id]});if(!product.rows.length)return jsonError('Product not found.',404);const old=await db().execute({sql:'SELECT public_id FROM product_images WHERE product_id=?',args:[id]});const tx=await db().transaction('write');try{await tx.execute({sql:'UPDATE products SET name=?,description=?,price=?,category_id=? WHERE id=?',args:[d.name,d.description,d.price,d.categoryId,id]});await tx.execute({sql:'DELETE FROM product_images WHERE product_id=?',args:[id]});for(let i=0;i<d.images.length;i++){await tx.execute({sql:'INSERT INTO product_images(product_id,public_id,version,sort_order) VALUES(?,?,?,?)',args:[id,d.images[i]!.publicId,d.images[i]!.version,i]});await tx.execute({sql:'UPDATE uploaded_assets SET claimed=1 WHERE public_id=? AND admin_id=?',args:[d.images[i]!.publicId,a.id]})}await tx.commit();await log(a.id,'product_updated','product',id)}catch{await tx.rollback();return jsonError('Could not update the product.',400)}await destroyAssets(old.rows.map(r=>String(r.public_id)).filter(id=>!d.images.some(i=>i.publicId===id)));return NextResponse.json({ok:true})
 }
 if(segments[0]==='admin'&&segments[1]==='products'&&segments[2]&&method==='DELETE'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const id=Number(segments[2]),old=await db().execute({sql:'SELECT public_id FROM product_images WHERE product_id=?',args:[id]});const r=await db().execute({sql:'DELETE FROM products WHERE id=? RETURNING id',args:[id]});if(!r.rows.length)return jsonError('Product not found.',404);await log(a.id,'product_deleted','product',id);await destroyAssets(old.rows.map(x=>String(x.public_id)));return NextResponse.json({ok:true})
 }
 if(segments[0]==='admin'&&segments[1]==='settings'&&method==='GET'){const r=await db().execute({sql:'SELECT value FROM app_settings WHERE key=?',args:['whatsapp']});return NextResponse.json({whatsapp:r.rows[0]?.value||''},{headers:{'Cache-Control':'no-store'}})}
 if(segments[0]==='admin'&&segments[1]==='settings'&&method==='PUT'){
  if(!await csrf(req))return jsonError('Invalid request origin.',403);const parsed=z.object({whatsapp:z.string().regex(/^\d{10,15}$/)}).safeParse(await bodyJson(req));if(!parsed.success)return jsonError('Enter a WhatsApp number with country code.');await db().execute({sql:'INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',args:['whatsapp',parsed.data.whatsapp]});return NextResponse.json({ok:true})
 }
 return jsonError('Not found.',404)
}

async function dispatch(req:Request,ctx:Ctx){try{await ensureSchema();const{segments=[]}=await ctx.params;if(segments[0]==='admin'&&segments[1]==='login'&&req.method==='POST')return userRoute(req,segments);if(segments[0]==='admin'&&segments[1]==='logout'&&req.method==='POST'){if(!await csrf(req))return jsonError('Invalid request origin.',403);const p=await requireRole('admin');if(!p)return jsonError('Administrator access required.',403);const out=NextResponse.json({ok:true});await clearSession(out);return out}if(segments[0]==='uploads')return adminRoute(req,segments);if(segments[0]==='admin'||segments[0]==='uploads')return adminRoute(req,segments);return userRoute(req,segments)}catch(e){return fail(e)}}
export const GET=dispatch;export const POST=dispatch;export const PUT=dispatch;export const DELETE=dispatch;
