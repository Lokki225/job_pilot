# JobPilot MVP - Quick Roadmap (Stephane)

> Goal: get the MVP running fast (auth + resume upload/parsing + AI cover letters + job tracking).

## 1) Get the code

Why: fetch the exact branch that already has the MVP schema.

```bash
git clone https://github.com/Lokki225/job_pilot.git
cd job_pilot
git checkout Stephane-graduation-version
npm install
```

## 2) Create .env.local (copy/paste)

Why: the app won’t start without keys. Replace the placeholders.

```env
# Supabase (supabase.com → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_KEY"

# Database (supabase.com → Project Settings → Database → Connection strings)
DATABASE_URL="postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:5432/postgres"

# OpenAI (platform.openai.com → API Keys)
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

Tips to find keys:
- Supabase URL/keys: Project Settings → API (copy URL + anon + service role)
- DB URLs: Project Settings → Database → Connection strings → pgbouncer URL for DATABASE_URL, direct URL for DIRECT_URL
- OpenAI: platform.openai.com → API Keys → create new secret key

## 3) Prepare the database

Why: sync the MVP schema to your Supabase database.

```bash
npx prisma generate
npx prisma db push
```

## 4) Run the app

```bash
npm run dev
```

Visit: http://localhost:3000

## 5) Smoke test (5 minutes)

1. Sign up / log in
2. Upload a PDF/DOCX resume → Profile should auto-fill
3. Add a job (paste details) → Status = Wishlist
4. Generate cover letter (uses OpenAI key)
5. Update status: Wishlist → Applied → Interviewing → Offered

## 6) If something breaks

- **DB errors**: re-check `DATABASE_URL` / `DIRECT_URL`, then `npx prisma generate`
- **OpenAI errors**: verify key, ensure credits; try GPT-3.5 if GPT-4 quota is low
- **Resume parsing**: use valid PDF/DOCX under 5MB

## Done

That’s everything needed to run and demo the MVP. 🎓
