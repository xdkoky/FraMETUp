# DIRECTOR OS

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

Demo login: `demo@director-os.local` / `director-demo` (all demo data is fictional).
Admin demo: `admin@director-os.local` / `director-admin`.

AI is optional. Without `ANTHROPIC_API_KEY`, a local keyword heuristic is used and no data leaves the server.

## Checks

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e   # needs a seeded database
```
