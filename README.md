# Whiz Barbershop Management System

A walk-in barbershop management web app built with React 19, Vite, Fastify 5, Prisma 6, and PostgreSQL.

---

## Deployment architecture

- **Frontend**: React 19 SPA built with Vite and deployed to Vercel.
- **Backend**: Fastify 5 API deployed as a Vercel serverless function from `api/index.ts`.
- **Database**: Supabase PostgreSQL connected to the Vercel API through Prisma 6.
- **Frontend/API connection**: Same-origin `/api` routes are handled by the Vercel function.
- **Security**: JWT authentication, `bcryptjs` password hashing (pure JavaScript, avoiding native C++ build errors in serverless containers).
- **Invariants**: 1 active order per barber enforced via database partial unique index; atomic order completion and sales transaction recording.

---

## Deployment guide

### 1. Configure Supabase

Create a Supabase PostgreSQL project and connect it to the Vercel project through the Supabase integration. Prisma uses Vercel's provisioned `POSTGRES_PRISMA_URL` for runtime queries and `POSTGRES_URL_NON_POOLING` for migrations.

Run migrations and bootstrap the first Admin from a secure machine with those variables in `.env`:

```bash
npm install
npx prisma migrate deploy
ADMIN_USERNAME=your-admin ADMIN_PASSWORD='use-a-unique-password-at-least-12-characters' npm run db:seed
```

The production seeder creates or updates only the explicitly supplied Admin account. It does not create demo users, customers, barbers, or services. Create real staff, customers, services, and inventory through the application after signing in.

### 2. Deploy to Vercel

1. Log in to [Vercel](https://vercel.com) and click **"Add New..." > "Project"**.
2. Select the repository.
3. Framework Preset: **Vite** (automatically detected).
4. Root Directory: `./` (leave default).
5. In **Environment Variables**, confirm the Supabase integration has supplied `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`.
6. Add `JWT_SECRET`, `JWT_EXPIRES_IN`, `LOYALTY_POINTS_PER_KES`, and `ALLOWED_ORIGIN`.
7. Click **Deploy**.

### Environment variable checklist

Set these variables on Vercel:

- `POSTGRES_PRISMA_URL`: Supabase transaction-pooler connection string supplied by the Vercel integration.
- `POSTGRES_URL_NON_POOLING`: Supabase session/direct connection string supplied by the Vercel integration.
- `JWT_SECRET`: a unique random value of at least 32 characters.
- `JWT_EXPIRES_IN`: for example, `8h`.
- `LOYALTY_POINTS_PER_KES`: for example, `0.01`.
- `ALLOWED_ORIGIN`: the Vercel deployment URL.

Do not commit `.env`; it is ignored by Git. Vercel environment variables are configured in Project Settings rather than in the repository.

---

## Production bootstrap

There are no default or demo credentials. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` only for the initial bootstrap command, then remove them from the shell or secret store. Admin passwords are stored as bcrypt hashes and are never stored in plaintext by the application.

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
│   ├── seed.ts                # Production-only Admin bootstrap seeder
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
