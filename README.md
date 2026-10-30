# FraMETUp

Evidence-based filmmaking skill development platform for METU film directing students. It is an independent tool, not an official university system.

## Try it in your browser (no install)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/xdkoky/FraMETUp?ref=claude/director-os-platform-pkinre)

The first start takes about 3–5 minutes: it installs packages, sets up the database and seeds demo data. The app then opens on port 3000.

## Run locally

You need Node 20+ and PostgreSQL 14+.

```bash
cp .env.example .env          # set DATABASE_URL
npm install
npx prisma migrate deploy
npm run db:seed               # taxonomy + clearly labelled demo accounts
npm run dev                   # http://localhost:3000
```

Demo login: `demo@frametup.local` / `frametup-demo` (all demo data is fictional).
Admin demo: `admin@frametup.local` / `frametup-admin`.

AI is optional. Without `ANTHROPIC_API_KEY`, a local keyword heuristic is used and no data leaves the server.

## Deploy (Vercel + Supabase, free tiers)

1. **Supabase:** create a new project. In **Connect**, copy:
   - the *Transaction pooler* URI (port 6543): add `?pgbouncer=true&connection_limit=1` and use it as `DATABASE_URL`
   - the *Session pooler* URI (port 5432): use it as `DIRECT_URL`

   In **Project Settings → API**, copy the project URL (`SUPABASE_URL`) and the `service_role` key (`SUPABASE_SERVICE_ROLE_KEY`). Keep that key secret.
2. **Vercel:** import this GitHub repo, choose the branch, and add the four variables above as Environment Variables. Don't set `SEED_DEMO_ADMIN` on a public site.
3. Deploy. The `vercel-build` script runs database migrations, seeds the taxonomy and demo student, and builds the app. Uploads go to a private `evidence` bucket that is created automatically.
4. To make yourself admin: register on the live site, set `SEED_ADMIN_EMAIL` to your email in Vercel, and redeploy.

Notes: Supabase free projects pause after 7 days without activity (restore them from the dashboard). Rate limiting is per server instance, so replace it with a shared store before wide use.

## Checks

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e   # needs a seeded database
```
