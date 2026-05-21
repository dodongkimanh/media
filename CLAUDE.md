# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js Version Warning

**This project uses Next.js 16 with React 19 — APIs and conventions differ from training data.** Read `node_modules/next/dist/docs/` before writing any Next.js-specific code. Heed deprecation notices.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # Run ESLint
```

No test suite is configured.

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Architecture

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + Supabase (PostgreSQL + Auth + Realtime) + Zustand

### Routing

- `src/app/login/` — public login page
- `src/app/auth/callback/` — Supabase OAuth callback
- `src/app/(dashboard)/` — protected routes, wrapped by `DashboardLayout` with sidebar nav
  - `/` — real-time team chat (Supabase Realtime subscriptions)
  - `/products`, `/products/[id]` — product catalog with specs and media
  - `/categories` — product category management
  - `/knowledge` — articles (types: `policy`, `product`, `training`)
  - `/quiz` — quiz templates, questions, assignments, submissions
  - `/staff` — staff/user management
  - `/media` — media albums organized by category

### Authentication & Middleware

Auth is handled via Supabase SSR. Middleware is in `src/proxy.ts` (not `middleware.ts`). Two Supabase client instances exist:
- `src/lib/supabase/client.ts` — browser client (singleton)
- `src/lib/supabase/server.ts` — server client (uses cookies)

Role-based access: users have `admin`, `lead`, or `staff` role stored in the `profiles` table. The `useAuth` hook (`src/hooks/useAuth.ts`) exposes `isAdmin`, `isLead`, and `canManage` (true for admin or lead).

### Database (Supabase/PostgreSQL)

Schema is in `supabase-schema.sql` (idempotent, safe to re-run). Key tables:

| Table | Purpose |
|---|---|
| `profiles` | Extends auth.users; stores role, display name, avatar color |
| `categories` | Product categories with sort order |
| `products` | Product listings with status (`active`/`draft`/`out`), images/videos as JSON arrays |
| `product_specs` | Height/weight/price variants per product |
| `articles` | Knowledge base articles |
| `media_albums` / `media_items` | Gallery albums and their files |
| `messages` | Real-time chat messages |
| `quizzes`, `quiz_questions`, `quiz_assignments`, `quiz_submissions` | Full quiz lifecycle |

Row-level security (RLS) is enabled. A database trigger auto-creates a `profiles` row on new user signup.

TypeScript types for all tables are in `src/lib/types.ts`.

### State Management

Zustand is used for client-side state. Global stores live in `src/lib/` or co-located with features.

### Styling

Tailwind CSS 4 via `@tailwindcss/postcss`. Custom design tokens and reusable component classes (badges, buttons, forms, cards, tables, modals, toast, upload zones, lightbox, chat bubbles) are defined as CSS classes in `src/app/globals.css`. Primary brand color: `#1D9E75`. UI text is in Vietnamese.

### Image Hosting

`next.config.ts` is configured to allow images from `*.supabase.co` via `remotePatterns`.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on push to `main` and deploys to Vercel. Supabase credentials are injected as Vercel environment secrets.
