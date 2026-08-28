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

### Media Upload & Storage

- `src/lib/upload.ts` — uploads files to Supabase Storage buckets (`products`, `media`, `articles`) with randomized filenames; uploads from the product/quiz UIs are also mirrored into a shared "Ảnh & Video Sản Phẩm" media album via `saveUrlsToMediaLibrary`/`uploadToMediaLibrary`.
- `src/lib/videoConvert.ts` — transcodes uploaded videos to H.264 MP4 client-side using `@ffmpeg/ffmpeg` (WASM, loaded from unpkg CDN) before upload, so playback is consistent across browsers.
- `scripts/patch-ffmpeg.js` runs as a `postinstall` step to patch `@ffmpeg/ffmpeg`'s worker.js with a `webpackIgnore` comment — without it, Turbopack/Webpack breaks the WASM core's dynamic import. Re-run `npm install` if this patch is ever lost (e.g. after a clean install).

### Privileged Server Operations

`src/lib/supabase/admin.ts` creates a service-role Supabase client that bypasses RLS. It's only used inside API routes (e.g. `src/app/api/staff/route.ts`), never client-side. These routes manually re-check the caller's role from `profiles` before performing privileged actions (creating/deleting auth users), since the service-role key has no RLS protection of its own. Requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (not exposed via `NEXT_PUBLIC_`).

### PWA (installable on phones)

- `public/manifest.json` — app metadata + icons, linked from `src/app/layout.tsx` metadata (`manifest`, `icons`, `appleWebApp`).
- `public/icons/` — generated via `node scripts/generate-icons.js` (uses `sharp`, already a dependency). Re-run it if the brand monogram/colors change.
- `public/sw.js` — minimal service worker registered by `src/components/PwaRegister.tsx`. It only caches the static app shell (`offline.html`, icons) for an offline fallback on navigation — it deliberately does not cache Supabase API/auth/realtime requests, since this app's data is dynamic.
- To bump the shell cache after editing `sw.js` or the shell asset list, change the `CACHE` version string in `public/sw.js`.

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on push to `main` and deploys to Vercel. Supabase credentials are injected as Vercel environment secrets.
