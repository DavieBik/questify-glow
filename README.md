# Skillbridge LMS Platform

A Supabase + React (Vite) Learning Management System designed for single-tenant deployments. This document covers system architecture, environment setup, deployment instructions, core features, and operational checklists so you can take the project to staging/production with confidence.

---

## 1. System Overview

| Layer | What it does | Key Tech |
| --- | --- | --- |
| Frontend | Learner/admin UI, SCORM playback, auth flows, analytics dashboards | React 18, TypeScript, Vite, Tailwind CSS |
| Backend (API) | Data layer, row-level security, RPC functions | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Background Workers | Notifications, CSV imports, SCORM processing | Supabase Edge Functions (Deno) |
| Infrastructure | Static hosting + Supabase project | Vercel (recommended) + Supabase project |

The application assumes a single-tenant SaaS setup: each deployed instance targets its own Supabase project. Multi-tenant support can be layered on later using the existing org tables.

---

## 2. Repository Structure

```
.
+- public/
+- src/
¦  +- components/
¦  +- config/
¦  +- contexts/
¦  +- hooks/
¦  +- integrations/supabase/
¦  +- pages/
¦  +- routes/
¦  +- utils/
+- supabase/
¦  +- config.toml
¦  +- functions/
¦  +- migrations/
+- package.json
+- tsconfig*.json
+- vite.config.ts
+- tailwind.config.ts
+- Dockerfile / docker-compose.yml (optional)
```

---

## 3. Prerequisites

- Node.js 18+
- Supabase CLI (`npm install -g supabase`)
- Git
- Optional: Docker Desktop for local Supabase

---

## 4. Initial Setup

1. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
3. (Optional) Run Supabase locally:
   ```bash
   supabase init
   supabase start
   supabase db reset
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

---

## 5. Database & Supabase Configuration

- Apply migrations to your Supabase project.
- Update TypeScript database types whenever the schema changes:
  ```bash
  supabase gen types typescript --project-id <project-ref> --schema public > src/integrations/supabase/types.ts
  ```
- Ensure storage buckets (`videos`, `scorm`, `imports`) exist with matching policies.
- Review RLS policies in migrations before modifying access.

---

## 6. Edge Functions

Located in `supabase/functions/`. Key functions:

| Function | Purpose |
| --- | --- |
| scorm-manifest-parser | Parses uploaded SCORM packages |
| scorm-proxy | Serves SCORM assets securely |
| notifications-service / notifications-cron | Deliver scheduled reminders |
| import-* | CSV course/user import pipeline |
| video-create-upload / video-webhook / video-progress | Video ingestion & tracking |
| setup-test-users | Seed staging data |

Deploy with:
```bash
supabase functions deploy <function-name>
```

---

## 7. Tests (if enabled)

Playwright E2E suites live under `tests/` (restore them if you want automated testing):
```bash
npx playwright test
```

---

## 8. Production Build

```bash
npm run build
```
Outputs production assets to `dist/`. Deploy to Vercel/Netlify/any static host and set environment variables accordingly.

---

## 9. Deployment Checklist

- Supabase project has all migrations applied.
- Storage buckets and access policies configured.
- Edge functions deployed with secrets set.
- Hosting environment variables (see `.env.example`).
- Branding updated in `src/config/organization.ts` and `public/` assets.
- Optional: seed data, verify notifications, SCORM workflows.

---

## 10. Operations & Maintenance

- Monitor Supabase + hosting logs.
- Rotate service keys periodically.
- Snapshot database regularly (Supabase backups or pg_dump).
- Scale Supabase plan as usage grows; frontend is static and easy to scale.

---

## 11. Common Commands

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Dev server | `npm run dev` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Supabase local | `supabase start` |
| Apply migrations | `supabase db push` |

---

## 12. Next Steps

- Extend to multi-tenant by enhancing `organizations` / `org_members`.
- Integrate payments on top of `organization_subscriptions`.
- Re-enable Playwright tests for automated QA.

For deeper dives, inspect `supabase/migrations/` (schema + RLS) and `src/pages/` for UI flows. This README should guide you from setup to deployment.
