# BarMetrics Production Deployment Guide

Complete guide to deploying BarMetrics to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Option 1: Deploy to Vercel (Recommended)](#option-1-deploy-to-vercel-recommended)
3. [Option 2: Deploy to Railway](#option-2-deploy-to-railway)
4. [Option 3: Deploy to any VPS](#option-3-deploy-to-vps)
5. [Database Options](#database-options)
6. [Post-Deployment Configuration](#post-deployment-configuration)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All QA tests pass (`npx tsx scripts/qa-automated-tests.ts`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables configured
- [ ] Database chosen and configured
- [ ] Initial data seeded (products, SKUs, locations, users)
- [ ] Git repository is up to date

### Verify Build Locally

```bash
npm run build
npm run start
```

Visit `http://localhost:3000` and verify:
- Landing page loads
- Login works
- Dashboard accessible
- Products/SKUs display
- QR scanning works
- Label generation works

---

## Option 1: Deploy to Vercel (Recommended)

Vercel is the easiest option for Next.js apps and offers:
- Zero-config deployment
- Automatic HTTPS
- Edge functions
- Preview deployments for PRs

### Steps

#### 1. Install Vercel CLI (optional)

```bash
npm i -g vercel
```

#### 2. Deploy via GitHub Integration (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Select your `Noble-BarMetrics` repository
5. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `barmetrics`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
6. Add environment variables (see below)
7. Click "Deploy"

#### 3. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
DATABASE_URL=<your-production-database-url>
SESSION_SECRET=<generate-with-openssl-rand-base64-32>
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=BarMetrics
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### 4. Set Up Database

**Option A: Vercel Postgres** (easiest)
```bash
vercel postgres create
```

**Option B: Turso** (SQLite at the edge)
1. Sign up at [turso.tech](https://turso.tech)
2. Create database:
   ```bash
   turso db create barmetrics
   turso db show barmetrics --url
   turso db tokens create barmetrics
   ```
3. Add to Vercel env vars:
   ```env
   DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your-token
   ```

**Option C: Neon** (serverless Postgres)
1. Sign up at [neon.tech](https://neon.tech)
2. Create project and get connection string
3. Add to Vercel env vars

#### 5. Seed Production Database

After deploying, run migrations and seed:

```bash
# Update prisma/schema.prisma datasource for production
# Then run:
npx prisma db push
npx tsx scripts/import-products.ts
npx tsx scripts/create-skus-from-products.ts
npx tsx scripts/seed-locations.ts
npx tsx scripts/setup-test-users.ts
```

Or run from Vercel CLI:
```bash
vercel env pull
npm run db:push
npm run db:seed
```

#### 6. Enable Production Deployment

Your app is now live at `https://your-app.vercel.app`!

---

## Option 2: Deploy to Railway

Railway offers:
- Simple PostgreSQL integration
- Automatic HTTPS
- Environment variable management

### Steps

1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add PostgreSQL database (Railway automatically provides `DATABASE_URL`)
4. Add environment variables:
   ```env
   SESSION_SECRET=<generate-with-openssl-rand-base64-32>
   NODE_ENV=production
   NEXT_PUBLIC_APP_NAME=BarMetrics
   NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
   ```
5. Deploy and run migrations:
   ```bash
   railway run npx prisma db push
   railway run npx tsx scripts/import-products.ts
   railway run npx tsx scripts/create-skus-from-products.ts
   railway run npx tsx scripts/seed-locations.ts
   railway run npx tsx scripts/setup-test-users.ts
   ```

---

## Option 3: Deploy to VPS

For self-hosting on Ubuntu/Debian VPS:

### Prerequisites

- Ubuntu 22.04+ server
- Domain name pointed to server IP
- SSH access

### Steps

#### 1. Install Dependencies

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx
sudo apt install nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

#### 2. Set Up Database

```bash
sudo -u postgres psql
CREATE DATABASE barmetrics;
CREATE USER barmetrics_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE barmetrics TO barmetrics_user;
\q
```

#### 3. Clone and Build

```bash
cd /var/www
sudo git clone https://github.com/AbelTimo/Noble-BarMetrics.git
cd Noble-BarMetrics/barmetrics
sudo npm install
sudo npm run build
```

#### 4. Configure Environment

```bash
sudo nano .env.local
```

Add:
```env
DATABASE_URL="postgresql://barmetrics_user:your_password@localhost:5432/barmetrics"
SESSION_SECRET="<generate-with-openssl-rand-base64-32>"
NODE_ENV="production"
NEXT_PUBLIC_APP_NAME="BarMetrics"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

#### 5. Run Migrations and Seed

```bash
npx prisma db push
npx tsx scripts/import-products.ts
npx tsx scripts/create-skus-from-products.ts
npx tsx scripts/seed-locations.ts
npx tsx scripts/setup-test-users.ts
```

#### 6. Start with PM2

```bash
pm2 start npm --name "barmetrics" -- start
pm2 save
pm2 startup
```

#### 7. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/barmetrics
```

Add:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/barmetrics /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. Enable HTTPS with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Database Options

### PostgreSQL (Recommended for production)

**Pros:**
- Excellent concurrency handling
- ACID compliant
- Mature ecosystem

**Providers:**
- Vercel Postgres (easiest with Vercel)
- Neon (serverless, generous free tier)
- Supabase (includes auth, storage)
- Railway (simple setup)
- DigitalOcean Managed Databases

**Update Prisma:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Turso (SQLite at the edge)

**Pros:**
- Built on SQLite (simple schema)
- Low latency (edge deployment)
- Free tier available

**Cons:**
- Newer technology
- Limited concurrent writes

**Setup:**
```bash
npm install @libsql/client
```

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

### SQLite (Development only)

SQLite works fine for development but is NOT recommended for production due to:
- No concurrent write handling
- File-based (harder to backup/replicate)
- No built-in user management

---

## Post-Deployment Configuration

### 1. Create Admin User

Login to your production app and create the first manager user:

```bash
# Or via script:
npx tsx scripts/setup-test-users.ts
```

**Important:** Change default PINs immediately for production!

### 2. Import Production Data

```bash
# Import your actual product list
npx tsx scripts/import-products.ts

# Generate SKUs
npx tsx scripts/create-skus-from-products.ts

# Set up locations
npx tsx scripts/seed-locations.ts
```

### 3. Configure Locations

Visit `/settings` and update locations to match your bar:
- Main Bar
- Back Bar
- Storage Room
- Cellar
- Kitchen
- etc.

### 4. Generate First Labels

1. Go to `/labels/generate`
2. Select SKU
3. Set quantity
4. Print labels

### 5. Test QR Scanning

1. Print a test label
2. Go to `/scan`
3. Scan with camera or enter code manually
4. Verify data displays correctly

### 6. Set Up Backups

**For PostgreSQL:**
```bash
# Daily backup cron job
0 2 * * * pg_dump barmetrics > /backups/barmetrics-$(date +\%Y\%m\%d).sql
```

**For Turso:**
```bash
turso db shell barmetrics .dump > backup.sql
```

### 7. Monitor Errors

Set up error tracking (recommended):
- [Sentry](https://sentry.io) for error monitoring
- Vercel Analytics for performance monitoring
- Custom logging for audit trail

---

## Troubleshooting

### Build Fails

**Error:** "Module not found"
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error:** "Prisma Client not generated"
```bash
npx prisma generate
npm run build
```

### Database Connection Fails

**Check connection string format:**

PostgreSQL:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

Turso:
```
libsql://DATABASE.turso.io
```

**Test connection:**
```bash
npx prisma db pull
```

### Camera Not Working for QR Scan

- Ensure HTTPS is enabled (camera requires secure context)
- Check browser permissions
- Test manual code entry as fallback

### Labels Not Printing

- Ensure thermal printer drivers installed
- Test with print preview first
- Check printer page size settings (50x25mm for thermal labels)

### Performance Issues

**Slow queries:**
- Add database indexes (check `prisma/schema.prisma`)
- Enable query logging: `DEBUG="prisma:query"`

**Slow page loads:**
- Enable Next.js caching
- Use Vercel Edge Functions
- Optimize images with Next.js Image component

---

## Security Checklist

Before going live:

- [ ] Change all default PINs
- [ ] Use strong SESSION_SECRET (32+ characters)
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Restrict admin access
- [ ] Enable audit logging
- [ ] Set up monitoring/alerts
- [ ] Review user permissions
- [ ] Test disaster recovery
- [ ] Document access procedures

---

## Support

For issues:
1. Check [QA-TEST-PLAN.md](./QA-TEST-PLAN.md) for testing procedures
2. Run automated tests: `npx tsx scripts/qa-automated-tests.ts`
3. Check application logs
4. Review GitHub issues: https://github.com/AbelTimo/Noble-BarMetrics/issues

---

**Your BarMetrics production deployment is complete!** 🎉

Visit your app and start tracking inventory with confidence.
