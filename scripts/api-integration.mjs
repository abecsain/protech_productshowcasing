import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.TEST_PORT||3197),origin=`http://localhost:${port}`;
const dbRel=`./data/api-test-${process.pid}.db`,dbPath=path.resolve(root,'data',`api-test-${process.pid}.db`);
const env={...process.env,TURSO_DATABASE_URL:`file:${dbRel}`,JWT_SECRET:'api-integration-secret-only-not-for-production-2026',ADMIN_USERNAME:'test-admin',ADMIN_INITIAL_PASSWORD:'SafeAdminPass2026!',APP_ORIGIN:origin,NODE_ENV:'development'};
const nextCli=path.join(root,'node_modules','next','dist','bin','next');
const server=spawn(process.execPath,[nextCli,'dev',`--port=${port}`],{cwd:root,env,stdio:'ignore',windowsHide:true});
const check=(condition,message)=>{assert.ok(condition,message);console.log(`PASS ${message}`)};
const request=async(pathname,{method='GET',body,cookie,originHeader=origin,clientIp}={})=>fetch(origin+pathname,{method,headers:{...(originHeader?{Origin:originHeader}:{}),...(clientIp?{'X-Forwarded-For':clientIp}:{}),...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
const cookieOf=response=>response.headers.get('set-cookie')?.split(';',1)[0]||'';

try{
 await fs.mkdir(path.join(root,'data'),{recursive:true});let ready=false;
 for(let i=0;i<90;i++){try{const r=await fetch(`${origin}/api/auth/me`);if(r.status===401||r.status===200){ready=true;break}}catch{}await delay(1000)}
 assert.ok(ready,'Next development server did not start in 90 seconds');
 let r=await request('/api/products');check(r.status===401,'anonymous customers cannot load products');
 r=await request('/api/auth/register',{method:'POST',body:{name:'API Test User',mobile:'5551112233',password:'CustomerPass2026!',confirmPassword:'CustomerPass2026!'}});check(r.status===201,'customer registration creates a session');let userCookie=cookieOf(r);
 r=await request('/api/auth/register',{method:'POST',body:{name:'Duplicate User',mobile:'5551112233',password:'CustomerPass2026!',confirmPassword:'CustomerPass2026!'}});check(r.status===409,'duplicate mobile registration is rejected');
 r=await request('/api/products?limit=999&page=-4',{cookie:userCookie});let data=await r.json();check(r.ok&&data.limit===24&&data.page===1&&data.products.length>0,'customer product list is paginated and clamps limits');check(!Object.hasOwn(data.products[0],'price'),'unauthorized product JSON omits price');
 r=await request('/api/products?limit=24&q=%27%20OR%201=1%20--',{cookie:userCookie});data=await r.json();check(r.ok&&data.total===0,'search treats SQL punctuation as data');
 r=await request('/api/products/1',{cookie:userCookie});data=await r.json();check(r.ok&&!Object.hasOwn(data.product,'price')&&data.product.images.length>=3,'product detail omits unauthorized price and returns image gallery');
 r=await request('/api/admin/login',{method:'POST',body:{username:'test-admin',password:'SafeAdminPass2026!'}});check(r.ok,'admin login creates a separate admin session');const adminCookie=cookieOf(r);
 r=await request('/api/admin/dashboard',{cookie:userCookie});check(r.status===403,'customer cannot access admin API');
 r=await request('/api/uploads/signature',{method:'POST',body:{},cookie:userCookie});check(r.status===403,'customer cannot request signed Cloudinary uploads');
 r=await request('/api/admin/settings',{method:'PUT',body:{whatsapp:'919876543210'},cookie:adminCookie,originHeader:'https://attacker.example'});check(r.status===403,'cross-origin admin mutation is rejected');
 r=await request('/api/admin/users',{cookie:adminCookie});data=await r.json();const customer=data.users.find(u=>u.mobile==='5551112233');check(r.ok&&Boolean(customer),'admin can search and paginate registered users');
 r=await request(`/api/admin/users/${customer.id}/price`,{method:'PUT',body:{enabled:true,hours:null},cookie:adminCookie});check(r.ok,'admin can enable no-expiry price access');
 r=await request('/api/products',{cookie:userCookie});data=await r.json();check(typeof data.products[0].price==='number','authorized API response includes prices');
 r=await request(`/api/admin/users/${customer.id}/price`,{method:'PUT',body:{enabled:false,hours:null},cookie:adminCookie});check(r.ok,'manual price disable succeeds');
 r=await request('/api/products',{cookie:userCookie});data=await r.json();check(!Object.hasOwn(data.products[0],'price'),'manual price disable removes price from API payload');
 const sql=createClient({url:`file:${dbRel}`});await sql.execute({sql:'UPDATE users SET price_visible=1,price_expires_at=? WHERE id=?',args:[new Date(Date.now()-60000).toISOString(),customer.id]});
 r=await request('/api/products',{cookie:userCookie});data=await r.json();check(!Object.hasOwn(data.products[0],'price'),'expired price access is removed server-side');
 r=await request(`/api/admin/users/${customer.id}/reset-password`,{method:'POST',body:{},cookie:adminCookie});data=await r.json();const tempPassword=data.temporaryPassword;check(r.ok&&tempPassword.length>=8,'admin reset returns a one-time temporary password');
 r=await request('/api/auth/me',{cookie:userCookie});check(r.status===401,'password reset invalidates the old customer session');
 r=await request('/api/auth/login',{method:'POST',body:{mobile:'5551112233',password:data.temporaryPassword}});const resetCookie=cookieOf(r);check(r.ok,'temporary password permits next login');
 r=await request('/api/auth/me',{cookie:resetCookie});data=await r.json();check(data.user.mustChange===true,'temporary password forces a password change');
 r=await request('/api/products',{cookie:resetCookie});check(r.status===403,'forced password change blocks product data');
 r=await request('/api/auth/password',{method:'PUT',cookie:resetCookie,body:{oldPassword:tempPassword,newPassword:'RenewedPass2026!',confirmPassword:'RenewedPass2026!'}});check(r.ok,'customer can replace the temporary password');const changedCookie=cookieOf(r);
 r=await request('/api/products',{cookie:changedCookie});check(r.ok,'password change renews the customer session');
 const second=await request('/api/auth/register',{method:'POST',body:{name:'Lockout Test',mobile:'5551112244',password:'CustomerPass2026!',confirmPassword:'CustomerPass2026!'}});check(second.status===201,'second customer can register for lockout checks');
 for(let i=0;i<5;i++)r=await request('/api/auth/login',{method:'POST',body:{mobile:'5551112244',password:'WrongPass2026!'},clientIp:'198.51.100.77'});
 const lockState=await sql.execute({sql:'SELECT locked_until FROM users WHERE mobile=?',args:['5551112244']});check(Boolean(lockState.rows[0]?.locked_until),'five failed logins lock the account temporarily');
 await sql.close();
}finally{
 const exited=server.exitCode!==null||server.signalCode!==null?Promise.resolve():new Promise(resolve=>server.once('exit',resolve));server.kill();
 await Promise.race([exited,delay(5000)]);
 if(process.platform==='win32'&&server.pid)spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore'});
 await delay(800);
 for(let attempt=0;attempt<12;attempt++){
  try{await fs.rm(dbPath,{force:true});await fs.rm(`${dbPath}-shm`,{force:true});await fs.rm(`${dbPath}-wal`,{force:true});break}
  catch(error){if(attempt===11)break;await delay(250)}
 }
}
