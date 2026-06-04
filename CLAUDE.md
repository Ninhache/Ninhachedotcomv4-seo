# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server, Turbopack, port 3001
npm run build    # Production build
npm run start    # Production server, port 3000
npm run lint     # next lint (eslint, next/core-web-vitals) — this is what CI runs
```

There is no test suite. CI (`.github/workflows/ci.yml`) only runs `npm run lint` on push/PR to `main`.

Docker: `docker build -t portfolio . && docker run -p 3000:3000 portfolio`.

> Note: `yarn.lock` is present but the README, Dockerfile, and CI all use `npm`. Prefer `npm`. A `biome.json` exists (4-space indent, single quotes) but no script wires it up — linting goes through `next lint`/eslint + Prettier.

## Big Picture

This is the **frontend only**. All content data comes from a separate backend repo, `Ninhachedotcomv4-back`, reached via `NEXT_BACKOFFICE_URL` (default `http://localhost:5000`, see `lib/baseurl.ts`). Run the backend locally to get real data.

The single Next.js 16 App Router app (React 19, Tailwind v4) hosts **two distinct sub-apps**, each with its own root `<html>` layout:

1. **Public portfolio** — `app/[locale]/`
   - Internationalized with `next-intl` (locales `fr` default / `en`, see `config.ts` + `i18n/routing.ts`).
   - Server-rendered with ISR (`export const revalidate = 3600`). The page fetches all sections in parallel via `lib/portfolio.ts` (plain `fetch`, **no auth**, server-side), filters by `isVisible`, then converts backend DTOs to view models via `lib/mappers.ts` before rendering `app/_components/*`.

2. **Admin** — `app/admin/`
   - Client-side CRUD dashboard, **not** internationalized, French UI copy hardcoded.
   - Protected by NextAuth (Credentials provider, `app/api/auth/[...nextauth]/route.ts`). Login hits the backend `/auth/login`; the returned `access_token` is threaded through the JWT → session → axios `Authorization: Bearer` header.
   - `app/admin/(auto)/` is a route group; each resource (projects, skills, experiences, tags, contacts, profile, resume, categories, users) is one `page.tsx` following the same shape: `useState` list + `ProjectApi.findAll()` in `useEffect`, search filter, table with optimistic visibility toggle, edit/create dialog wrapping a form from `components/<resource>/form.tsx`.

### Data layer (`lib/`)

Per-resource folders follow a consistent convention:

- `lib/<resource>/<resource>.api.ts` — the real HTTP client. Uses a shared **axios** instance with a request interceptor that injects the NextAuth bearer token (via `getSession()`); a second `uploadApi` instance handles multipart media uploads. Responses are unwrapped with a local `unwrap()` helper.
- `lib/<resource>/<resource>.service.ts` — thin `'use client'` wrappers over the api (not all resources have one).
- `lib/types.ts` — all backend **DTO** types (the wire format). Note the GET-vs-write asymmetry: responses include full `tags`/`techTags` objects, while POST/PATCH bodies use `tagIds`/`techTagIds`.
- `lib/portfolio.ts` — the unauthenticated server-side read path used by the public site only.
- `lib/mappers.ts` — converts DTOs (`lib/types.ts`) into the **legacy view-model types** defined in `jsons/jsonUtils.ts`. This bridge exists because the public components were originally built against static JSON (`jsons/*.json`) and now consume live backend data through these mappers.

### i18n wiring

- `middleware.ts` runs `next-intl` middleware but its matcher **excludes** `/admin`, `/api`, and static assets — only the public site is locale-routed.
- `i18n/request.ts` loads messages from `app/_translations/{en,fr}.json` (note: **not** the top-level `messages/` directory, despite that directory existing).
- Use the locale-aware `Link`, `redirect`, `useRouter`, `usePathname` from `navigation.ts` (wraps `next-intl/navigation`) for public-site navigation.

## Conventions

- Path alias: `@/*` → repo root (`tsconfig.json`).
- UI primitives in `components/ui/` are shadcn-style wrappers over Radix; `cn()` from `lib/utils.ts` (or `utils.ts`) merges classes. `lucide-react` for icons.
- Forms use `react-hook-form` + `zod` (`@hookform/resolvers`).
- SVGs import as React components via `@svgr/webpack` (configured in `next.config.js`).
- The repo is mid-migration from static JSON content (`jsons/`) to the live backend; the legacy view types in `jsons/jsonUtils.ts` are still the shape public components expect — go through `lib/mappers.ts` rather than passing DTOs directly.
