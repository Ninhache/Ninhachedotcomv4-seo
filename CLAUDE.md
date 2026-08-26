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

## Blog MDX articles & components

Blog article **bodies are MDX** (stored as strings in the backend, compiled at ISR time — not `.mdx` files). Public render: `lib/markdown/render-article.tsx` (`server-only`, `@mdx-js/mdx` compile+run). Admin editor preview: `components/articles/article-preview.tsx` (client `evaluate`). Both share the component map `components/mdx/mdx-components.tsx`. Remark plugins (order): strip-imports → gfm → directive → callouts → sidenotes; rehype: slug → autolink → toc → pretty-code (Shiki `github-dark`) + `@shikijs/transformers`.

**Design/DA**: navy surfaces + cyan/blue accents, cyan-tinted hairline borders (`border-border`, never gray), `rounded-2xl` panels, fonts from `@/app/fonts` (`proximaNovaBold` section titles, `ralewaySemiBold` labels, `calibreRegular` body), fade-in-on-scroll on block components via the `withFadeIn` HOC in the map (respects `prefers-reduced-motion`). Shared tokens: `components/mdx/tokens.ts` (`CYAN`/`BLUE`, `TONE`, `toneSurface`, `PANEL_BODY` = restores list/paragraph flow inside a `not-prose` panel). **Rule: no em-dash (`—`) anywhere**, rendered text or comments.

**To add a component**: create `components/mdx/<Name>.tsx` (must be client-safe — used both server-render and client-preview), register in `mdx-components.tsx` (wrap block-level ones in `withFadeIn`, not inline/child ones), demo it in the `demo-mdx` article. The Chrome extension is often down — verify visually with the headless-Chromium/CDP recipe (see the `headless-screenshot` user-memory).

### Components (`components/mdx/`)
- **Blocks**: `<Callout type="note|info|tip|warning|danger|piège|leçon" title?>`, `<Figure src caption? credit?>`, `<Chart type="bar|line" data caption?>`, `<Steps>`/`<Step title>`, `<Compare>`/`<Side label tone="bad|good|neutral">`, `<Card title?>`, `<Grid cols=2|3|4>` (alias `<Cols>`), `<Takeaways title?>`, `<Specs>`/`<Spec label>`, `<HexDump data fields driftDemo?>`, `<Swatch hex lab?>`/`<DeltaE a b>`, `<TruthTable op="and|or">`, `<Details summary?>`, `<Timeline>`/`<TimelineItem date title>`, `<Flow nodes={[{label,sub?,edge?}]} caption?>` (simplified pipeline/architecture diagram, horizontal md+ / stacked mobile; `edge` annotates the arrow *leaving* that node, for pipelines where the transition matters as much as the state), `<Punchcard project>` (commit weekday×hour matrix) + `<CommitHeatmap project>` (GitHub-style daily calendar) — both cyan-intensity, read the `commit-data` registry (per-project JSON in `data/commits/<slug>.json`, generated **locally, no GitHub API/token** by `scripts/wakfuli-activity.mjs <slug> [repo]`; add a project = run the script + one line in `components/mdx/commit-data.ts`), `<Lead>`, `<Divider label?>`.
- **Editorial layout**: `<Split image side="left|right" ratio? caption?>text</Split>`, `<SectionHeader kicker? title subtitle?>` + `<Center>`, `<Wide src caption?>` (breakout image, `xl`+), `<Banner image? kicker? title subtitle?>` (hero, breakout), `<ArticleLink slug title? label?>` (prominent card cross-linking to another article; `slug` is a sibling slug, relative href keeps the locale), `<Repo url title? description?>` (card-style link to a GitHub repository; label defaults to the `owner/name` read off the URL; **nothing is fetched**, no GitHub API at build or runtime, same rule as the commit data).
- **Inline**: `<U type="dashed|dotted|wavy|solid|double" color?>`, `<Mark color?>`, `<Arrow dir="right|left|up|down">` (styled cyan arrow, replaces bare `→` glyphs in prose or Step titles via `title={<>a <Arrow/> b</>}`), `<Term def>` (tooltip), `<Badge tone?>`, `<Tok kind="param|nav|cond|math">`, `<Reveal>` (spoiler), `<Ext href>`, `<Sidenote n?>` (footnote).
- **Element overrides**: fenced code → `<Pre>` (copy button + language badge; meta `title="…" {1,3} showLineNumbers`, and `// [!code highlight|++|--|focus]`). Markdown tables → styled + horizontal scroll + row/column hover cross-highlight. Links → `<SmartAnchor>` (external `http(s)` open in a new tab with a trailing icon: the **GitHub mark** for `github.com` links, a `↗` arrow elsewhere; `#anchor`/relative stay plain). So an ordinary markdown link to a repo gets the GitHub icon for free, and `<Repo>` is only for when the repository *is* the point.

### Directives & footnotes
- `:::tip[Titre] … :::` renders **identically** to `<Callout type="tip" title="Titre">` (`lib/markdown/remark-callouts.ts`, kinds note/info/tip/warning/danger).
- `<Sidenote n?>note</Sidenote>` → **numbered section-bottom footnote**: an inline `¹` ref link + the note moved to an `<ol class="section-footnotes">` at the section end (before the next `h1`/`h2` and before a trailing `<Divider>`/`---`) with a `↩` back-link (`lib/markdown/remark-sidenotes.ts`).

MDX is stricter than Markdown: a bare `<` or `{` in prose breaks compilation (escape `\<`/`\{` or wrap in backticks); `import` is stripped; a compile error renders an inline error block, not a 500. The **`demo-mdx`** article showcases every component.

## Reader identity, comments and moderation

Blog articles carry reactions and comments. The identity behind them is **not**
the back-office NextAuth session and must never become it.

- **The session lives on the API.** `api.ninhache.fr` runs the Google / GitHub /
  Discord OAuth dance itself and sets its own `ninhache_reader` cookie, signed
  with `READER_JWT_SECRET`. The front's NextAuth is untouched: two cookies, two
  secrets, no way for a reader token to open `/admin`. Being signed in as a
  reader and as an admin at the same time is normal.
- **`lib/reader/reader.api.ts`** is the browser client: native `fetch` with
  `credentials: 'include'`, deliberately *not* the admin axios instance, which
  injects the NextAuth bearer token. Login buttons are full-page `<a>`
  navigations to `${baseUrl}/reader/auth/<provider>?returnTo=…`, because an OAuth
  consent screen needs a top-level navigation. `baseUrl` (`lib/baseurl.ts`,
  `NEXT_PUBLIC_BACKOFFICE_URL`) is already the API origin, so there is no second
  public API env var.
- **Where it renders.** `ArticleView` has a `footer?: ReactNode` slot filled only
  by `app/[locale]/blog/[slug]/page.tsx` with `<ArticleFooter>`; the private
  review route `/blog/preview/[token]` leaves it empty, so a draft shows neither
  widget without needing a flag. The slot sits **outside** `<article>`: the
  reading-progress bar measures `#blog-article` and would count a comment thread
  as article left to read.
- **Everything is client-side on purpose**: a comment or a reaction must never
  invalidate the article's ISR cache. The API's comment controller carries no
  `@RevalidateContent` for the same reason.
- **Comment bodies are plain text**, 1 to 2000 characters, stored as typed and
  rendered by React (so escaped) with `whitespace-pre-wrap`. No Markdown, no
  HTML: that is the XSS surface this refuses to open.
- **One level of replies.** A comment answers a thread root and nothing deeper:
  the API re-parents an answer to an answer onto its root, so `ArticleComments`
  renders roots with a single indented list of `replies` and never recurses. The
  count line reads roots and replies separately because pagination counts roots
  only. `CommentComposer` is the same textarea for both, so a reply obeys the
  same 2000-character rule as a root without a second form.
- **Moderation** is a posteriori, in `app/admin/(auto)/comments/`, through
  `lib/moderation/moderation.api.ts`. Its routes are under **`/moderation`**, not
  `/admin`: the API's `AdminController` owns `GET /admin/:id`, which would
  swallow `/admin/comments` as an id. Deleting a comment and banning its author
  are separate actions; a banned reader keeps their comments until they are
  explicitly removed.
