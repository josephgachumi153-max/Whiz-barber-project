# Whiz Barbershop Management System (Vercel Edition)

A walk-in barbershop management web app built with React 19, Vite, Fastify 5, Prisma 6, and PostgreSQL, architected for zero-configuration deployment to **Vercel Serverless Functions**.

---

## Architecture for Vercel

- **Frontend**: React 19 SPA built with Vite, served via Vercel's Edge CDN.
- **Backend**: Fastify 5 API running as a unified Vercel Serverless Function (`/api/index.ts`).
- **Database**: External PostgreSQL (Neon, Supabase, or Vercel Postgres) connected via Prisma 6 with connection pooling.
- **Security**: JWT authentication, `bcryptjs` password hashing (pure JavaScript, avoiding native C++ build errors in serverless containers).
- **Invariants**: 1 active order per barber enforced via database partial unique index; atomic order completion and sales transaction recording.

---

## 5-Minute Deployment Guide to Vercel

### Step 1: Set Up a Serverless PostgreSQL Database
Because Vercel is a serverless platform, it requires a hosted cloud PostgreSQL database with connection pooling:
- **Neon** (Recommended, Free): https://neon.tech
  - Create a project `whiz-barbershop`.
  - Copy the **Pooled connection string** (ends in `-pooler.neon.tech`).
  - Copy the **Direct connection string** (unpooled).
- **Supabase** (Alternative, Free): https://supabase.com
  - Create a project and obtain the connection string on port `6543` (`?pgbouncer=true`).

### Step 2: Push to GitHub / GitLab / Bitbucket
Initialize a Git repository and push your project:
```bash
git init
git add .
git commit -m "feat: whiz barbershop for vercel"
git branch -M main
git remote add origin https://github.com/<your-username>/whiz-barbershop.git
git push -u origin main
```

### Step 3: Import into Vercel
1. Log in to [Vercel](https://vercel.com) and click **"Add New..." > "Project"**.
2. Select your `whiz-barbershop` repository.
3. Framework Preset: **Vite** (automatically detected).
4. Root Directory: `./` (leave default).
5. In **Environment Variables**, add:
   - `DATABASE_URL`: Your pooled database connection string.
   - `DIRECT_URL`: Your direct/unpooled connection string. Prisma requires this variable during the Vercel build; use the direct database endpoint for migrations.
   - `JWT_SECRET`: A secure random string (at least 32 characters).
   - `LOYALTY_POINTS_PER_KES`: `0.01`
6. Click **Deploy**.

### Step 4: Run Database Migrations and Seed
Once your database is created, run the migrations and seed data locally against your hosted database:
```bash
# 1. Install dependencies locally
npm install

# 2. Set both hosted connection strings in .env, then deploy migrations:
npx prisma migrate deploy

# 3. Seed demo users and the 20 catalogue services:
npm run db:seed
```

### Environment variable checklist

Set these variables in the Vercel project for all environments that should run the app:

- `DATABASE_URL`: pooled PostgreSQL connection string for serverless requests.
- `DIRECT_URL`: direct PostgreSQL connection string for Prisma migrations and build-time validation.
- `JWT_SECRET`: a unique random value of at least 32 characters.

Do not commit `.env`; it is ignored by Git. Vercel environment variables are configured in Project Settings rather than in the repository.

---

## Demo Accounts

| Role | Username | Password | Access & Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin@12345` | Global visibility across all managers and barbers |
| **Manager** | `manager` | `Manager@12345` | Scoped customers, service catalogue, create/cancel orders |
| **Barber** | `barber` | `Barber@12345` | Shared staff pool; start and complete assigned orders |
| **Shampoo Assistant** | `shampoo` | `Shampoo@12345` | Staff pool service provider (20% commission default) |

---

## Local Development

You can run the full stack locally using either the Vercel CLI or Vite + Node:

### Option A: Using Vercel CLI (Simulates Vercel Locally)
```bash
npm install -g vercel
vercel dev
```
Open `http://localhost:3000`.

### Option B: Using Vite + Standalone API
Terminal 1 (API server on port 3000):
```bash
npm run dev:api
```

Terminal 2 (Vite web server on port 5173 with proxy):
```bash
npm run dev
```
Open `http://localhost:5173`.

---

## Project Structure

```
whiz-barbershop/
├── api/
│   ├── index.ts               # Fastify API entry & Vercel serverless handler
│   └── lib/
│       ├── auth.ts            # bcryptjs password hashing & verification
│       └── prisma.ts          # Prisma Client connection-pool singleton
├── prisma/
│   ├── schema.prisma          # Data models with Vercel RHEL engine target
│   ├── seed.ts                # Database seeder (demo users + 20 services)
│   └── migrations/            # Initial migration with partial unique index
├── src/
│   ├── App.tsx                # React 19 operational UI
│   ├── main.tsx               # React mount
│   └── styles.css             # Responsive layout styling
├── index.html                 # Vite HTML entry
├── package.json               # Full-stack dependencies & scripts
├── tsconfig.json              # TypeScript compilation configuration
├── vercel.json                # Vercel rewrites & build configuration
├── vite.config.ts             # Vite build & local proxy settings
└── .env.example               # Environment variables template
```
