# SISTER PAK Industrial Starter

Prototype industri untuk portal mandiri dosen: register, login, dashboard dosen, upload dokumen, dashboard admin, verifikasi dokumen, Supabase PostgreSQL, Prisma 7, JWT HTTP-only cookie, dan target deployment Vercel.

## Stack

- Next.js App Router + TypeScript/TSX
- Tailwind CSS
- Prisma 7 + @prisma/adapter-pg
- Supabase PostgreSQL + Supabase Storage
- bcryptjs untuk password hashing
- jose untuk JWT HTTP-only cookie
- zod untuk validasi API

## Setup dari nol

```bash
npm install
cp .env.example .env
```

Isi `.env` dari Supabase:

- `DATABASE_URL`: Supabase Transaction Pooler port 6543 untuk runtime/Vercel.
- `DIRECT_URL`: Supabase Session Pooler port 5432 untuk Prisma migration.
- `SUPABASE_URL`: Project URL Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key, hanya untuk server/API.
- `SUPABASE_STORAGE_BUCKET`: contoh `documents`.
- `JWT_SECRET`: buat dengan `openssl rand -base64 32`.

Buat bucket Supabase Storage bernama `documents`. Untuk keamanan, rekomendasi bucket private.

```bash
npx prisma generate
npx prisma migrate dev --name init_industrial_system
npx prisma db seed
npm run dev
```

## Deploy Vercel

Tambahkan environment variables ke Vercel Project Settings:

```txt
DATABASE_URL
DIRECT_URL
JWT_SECRET
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
NEXT_PUBLIC_APP_NAME
```
