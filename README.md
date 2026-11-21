# Pro Tech Enterprises – Product Showcase Platform

A simple, fast, and secure product showcase web platform built for **Pro Tech Enterprises**.

---

## 🌟 Key Highlights & Features

- **Mandatory Customer Sign-In**: Visitors must register and log in with their Name, Mobile Number (as User ID), and a secure password before viewing the catalog.
- **Server-Side Price Visibility Control**:
  - By default, prices are hidden from customers (*"Price on request"*).
  - Admins can toggle price visibility ON/OFF for each customer individually.
  - **Auto-Off Timer**: Admins can set prices to turn off automatically after configurable hours/days (1h, 2h, 6h, 12h, 24h, 2d, 7d, 30d). The server checks expiration on every request—no cron required.
  - **Zero Price Leaks**: The server API completely omits price data from JSON responses for unauthorized users.
- **Cart & WhatsApp Buy Flow**: Customers select products and quantities, and click "Buy" to launch a pre-filled WhatsApp chat (`wa.me`) directed to the configurable admin WhatsApp number.
- **Large Scale Catalog Ready (3,000+ Products / 9,000+ Images)**:
  - Fast pagination (24 products per page) and FTS5 full-text search.
  - Zero image binaries or base64 stored in the database. Only Cloudinary `public_id` and `version` are stored in Turso.
  - Client-side pre-compression via `browser-image-compression` (< 0.35 MB WebP) to bypass Vercel's 4.5 MB request limit.
  - Direct browser-to-Cloudinary signed upload: photos upload straight to Cloudinary without passing through serverless compute.
- **Full Admin Control Panel**:
  - Simple Dashboard (Total Products, Total Users).
  - Users Management: View latest registrations on top, search, toggle price visibility, set auto-off timers, and issue one-time temporary password resets.
  - Products Management: Add/edit products (name, category, price, ~30-word description, 3–5 photos), edit categories, delete products (automatically cleans up Cloudinary storage).
  - Admin WhatsApp Number setting.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack, React 19) |
| **Styling** | Tailwind CSS v4 (Mobile-first, `#1D4ED8` primary blue, Inter font) |
| **Database** | Turso (libSQL) via `@libsql/client` (Parameterized queries, transactions, FTS5) |
| **Image Storage** | Cloudinary (Signed direct browser uploads, responsive transformations) |
| **Authentication** | JWT via `jose` in `httpOnly`, `Secure`, `SameSite=Strict` cookies |
| **Password Hashing** | bcrypt (Cost 12) |
| **Validation** | Zod input validation on all routes |
| **Security** | CSRF origin validation, rate-limiting, strict security headers (CSP, HSTS, X-Frame-Options) |
| **Deployment Target** | Vercel |

---

## 📐 Cloudinary Free Tier Storage & Bandwidth Math

For a scale of **3,000 products** with **3 to 5 images each** (~9,000 to 15,000 images):

1. **Storage Math**:
   - Client pre-compresses photos in the browser to max 1000px WebP before upload (~200–350 KB).
   - Cloudinary upload preset applies incoming transformation: `c_limit,w_800,h_800,q_auto:good,f_webp`.
   - Resulting stored image size: **~50 KB to 70 KB** each.
   - **9,000 images × ~65 KB = ~585 MB total storage**.
   - Cloudinary Free Plan provides **25 Credits/month** (1 Credit = 1 GB storage or 1 GB net bandwidth or 1,000 transformations).
   - ~585 MB storage consumes only **~0.6 Credits** out of your 25 monthly free credits!
2. **Bandwidth Optimization**:
   - Product Grid Thumbnails: `w_300,c_fill,q_auto,f_auto` (~10–15 KB per thumbnail).
   - Detail Gallery: `w_800,q_auto,f_auto` (~50–60 KB).
   - Lazy loading and 24-product pagination ensure minimal monthly bandwidth.
3. **Vercel 4.5 MB Limit Bypass**:
   - The admin browser calls `/api/uploads/signature` to get a signed cryptographic token.
   - The browser uploads directly to `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload`.
   - The image payload **never** passes through Vercel serverless functions, completely avoiding payload limits.

---

## 🚀 Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd "Protech Enterprises"
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your configuration:
```env
# Database: Local SQLite or Turso libSQL
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=

# JWT Secrets (At least 32 characters)
JWT_SECRET=super-secret-jwt-key-minimum-32-chars-long-for-production!

# Admin WhatsApp for Orders (Country code + mobile number, no spaces or +)
ADMIN_WHATSAPP_NUMBER=919999999999

# Initial Admin Credentials (Seeded automatically)
ADMIN_USERNAME=admin
ADMIN_INITIAL_PASSWORD=admin123

# Cloudinary Credentials (from https://cloudinary.com/console)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=protech_products
```

### 3. Initialize & Seed Database
```bash
npm run seed
```
This applies the SQL schema, creates categories, seeds 8 featured products (with 3 images each), and creates the initial admin user.

### 4. Run Automated Test Suite
```bash
npm test
```
Runs 26 automated unit and security checks verifying password rules, lockout policy, price visibility timers, public ID verification, and pagination.

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- Customer sign-in/register: `http://localhost:3000/auth`
- Admin portal: `http://localhost:3000/admin/login` (Default: `admin` / `admin123`)

---

## 🗄️ Turso Database Setup Guide

When ready to connect Turso for production:

1. Install the Turso CLI:
   ```bash
   # Windows (PowerShell)
   irm https://get.tur.so/install.ps1 | iex
   ```
2. Log in and create your database:
   ```bash
   turso auth login
   turso db create protech-db
   ```
3. Retrieve database URL and create an access token:
   ```bash
   turso db show protech-db --url
   # Output: libsql://protech-db-username.turso.io

   turso db tokens create protech-db
   # Output: eyJhbGciOi... (your auth token)
   ```
4. Set these in your `.env.local` or Vercel Environment Variables:
   ```env
   TURSO_DATABASE_URL=libsql://protech-db-username.turso.io
   TURSO_AUTH_TOKEN=eyJhbGciOi...
   ```
5. Run the seed script against Turso:
   ```bash
   npm run seed
   ```

---

## ☁️ Cloudinary Signed Preset Setup

1. In Cloudinary Console: Go to **Settings** → **Upload** → **Upload presets**.
2. Click **Add upload preset**:
   - **Name**: `protech_products` (matches `CLOUDINARY_UPLOAD_PRESET`)
   - **Signing Mode**: `Signed`
   - **Folder**: `protech/products`
   - **Allowed formats**: `jpg,png,webp`
   - **Transformation** → **Incoming Transformation**:
     - Mode: `Fit / Limit`
     - Width: `800`, Height: `800`
     - Quality: `auto:good`
     - Format: `webp`
3. Save the preset.

---

## 🚢 Vercel Deployment Steps

1. Push your code to GitHub / GitLab / Bitbucket.
2. In the [Vercel Dashboard](https://vercel.com):
   - Click **Add New** → **Project** → Import your repository.
   - Framework Preset: **Next.js**.
3. In **Environment Variables**, add:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `JWT_SECRET` (generate random 32+ char string)
   - `ADMIN_WHATSAPP_NUMBER` (e.g. `919876543210`)
   - `ADMIN_USERNAME` (e.g. `admin`)
   - `ADMIN_INITIAL_PASSWORD` (strong password)
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `CLOUDINARY_UPLOAD_PRESET` (`protech_products`)
   - `APP_ORIGIN` (e.g. `https://your-domain.vercel.app`)
4. Click **Deploy**.
5. Once deployed, run the seed script once pointing to your Turso DB URL to populate default products.

---

## 🛡️ Post-Deploy Verification & Security Checklist

### Verification Pass 1: Architecture & Functionality
- [x] **Registration**: Validates 10-digit mobile number, enforces strong passwords, prevents duplicate mobiles.
- [x] **Login**: Generic error messages on invalid credentials; locks account temporarily for 15 minutes after 5 consecutive failures.
- [x] **Navigation**: Brand "Pro Tech Enterprises" on left; only "Products" and "User" menu on right.
- [x] **Mobile UX**: 3-line hamburger menu on mobile; 4-column compact grid on mobile home page.
- [x] **Home Page**: Tagline, 5–10 featured products in compact grid, "View All Products" button.
- [x] **Products Page**: Debounced search, category chips, 24 products per page pagination, product modal with 3–5 image gallery.
- [x] **Cart / WhatsApp Buy**: Calculates quantities, generates URL-encoded WhatsApp link with customer details; never includes passwords.
- [x] **Admin Dashboard**: Shows Total Products, Total Users, with big links to Users and Products.
- [x] **Admin Users Page**: Latest registrations on top, search, Price ON/OFF toggle, auto-off duration timer (1h to 30d), remaining time display, random temporary password reset.
- [x] **Admin Products Page**: Product creation with 3–5 image uploads, category manager, price search, delete with Cloudinary asset cleanup.

### Verification Pass 2: Security & Performance Audit
- [x] **SQL Injection**: 100% parameterized queries via libSQL prepared statements (`{ sql, args }`). No string interpolation.
- [x] **Server Price Leak Prevention**: Server API (`GET /api/products`, `GET /api/products/[id]`) checks `price_visible` and `price_expires_at` directly from the database on every request. If not allowed, the SQL query completely omits the `price` column.
- [x] **XSS Prevention**: React escaping throughout; zero instances of `dangerouslySetInnerHTML`.
- [x] **CSRF & Origin Protection**: `validOrigin()` checks verify `Origin` and `Host` headers on mutating requests.
- [x] **Cookie Security**: `httpOnly: true`, `secure: true` (in production), `sameSite: 'strict'`, `path: '/'`.
- [x] **Security Headers**: Custom CSP (restricting images to Cloudinary and Unsplash), HSTS (63072000), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`.
- [x] **Rate Limiting**: Sliding window rate limits on `register`, `login`, `admin-login`, `search`, and `upload`.
- [x] **Audit Logging**: Admin actions (`price_access_changed`, `password_reset`, `product_created`, `product_deleted`, `category_created`) logged to `admin_audit_log`.
- [x] **Performance (Lighthouse 90+)**: Thumbnails compressed to ~10–15 KB, lazy loading on grid images, 24 items per page pagination, minimal bundle JS.
