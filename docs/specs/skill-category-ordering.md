# Spec — Ordering of skill categories and skills within a category

**Status:** Draft — backend contract + frontend implementation
**Date:** 2026-06-04
**Repos involved:** `Ninhachedotcomv4-seo` (frontend, this repo) + `Ninhachedotcomv4-back` (backend, separate repo)

## 1. Problem

The admin "Catégories de compétences" page (`app/admin/(auto)/categories/page.tsx`,
described to users as *"Organise les compétences par catégorie"*) lets an admin set a
category's name, visibility, and which skills belong to it — but there is **no way to
control display order**. Both `SkillCategoryDTO` and `SkillDTO` lack any `order`/`position`
field, and the public site (`lib/mappers.ts` → `app/_components/skills.tsx`) renders
categories and skills in whatever order the backend returns (DB/insertion order).

Goal: an admin can control (a) the order categories appear on the portfolio and
(b) the order of skills *within* each category. UX: up/down arrows (no drag-and-drop).

## 2. Scope

- **In scope:** category ordering; skill ordering within a category; persisting both;
  the public site honoring both orders.
- **Out of scope:** drag-and-drop; per-locale ordering; ordering on any other resource.

## 3. Data model

- A category has a single global display order → an integer column on the category entity.
- A skill belongs to **many** categories (`skill.categories[]` / `category.skills[]` are
  many-to-many). Its order is therefore **per-category** and must live on the **join
  table**, not on the skill entity. The same skill can sit at position 0 in one category
  and position 3 in another.

## 4. Backend contract (to implement in `Ninhachedotcomv4-back`)

### 4.1 Category order

- Add `order: int` (default `0`) to the category entity.
- Include `order` in every category DTO (public GET `/skill/categories`, admin GET
  `/skill/categories/admin`).
- Sort returned categories by `order ASC`, tiebreak by `id` (stable).

### 4.2 Skill order within a category — **no new endpoint**

Reuse the existing write contract. `POST /skill/categories` and
`PATCH /skill/categories/:id` already accept `skillIds: string[]`. **The order of that
array becomes the skill display order within the category** (persisted on the join row).

- On GET, `category.skills[]` MUST be returned sorted by that stored per-join order.
- On write, the backend persists join order = array index of each id in `skillIds`.

This keeps skill reordering free of any new endpoint — the admin sends the ordered list.

### 4.3 Category reorder — batch endpoint

```
PATCH /skill/categories/reorder
Authorization: Bearer <token>
Body: { "items": [ { "id": "<catId>", "order": 0 }, { "id": "<catId>", "order": 1 }, ... ] }
Response: 200 (no body required, or the updated category list)
```

Batch (one atomic request) rather than N per-item PATCHes — avoids races and keeps the
up/down swap consistent. The frontend sends the **full** ordered list so the backend can
assign `order = index` directly.

## 5. Frontend changes (this repo)

1. `lib/types.ts` — add `order: number` to `SkillCategoryDTO`.
2. `lib/skill/skill.api.ts` — add
   `CategoryApi.reorder(items: { id: string; order: number }[])` →
   `PATCH /skill/categories/reorder`.
3. `app/admin/(auto)/categories/page.tsx`:
   - Sort the loaded categories by `order` before rendering.
   - Add an "Ordre" column with ↑/↓ buttons per row; a click swaps adjacent categories,
     updates local state optimistically, and persists via `CategoryApi.reorder()` (rollback on error).
   - In the edit dialog, render the **selected** skills as an ordered list with ↑/↓
     arrows; `handleSave` sends `skillIds` in that order. Keep the existing unselected-skill
     checklist for adding/removing.
4. Public read path — sort so the order shows:
   - `lib/mappers.ts` `mapSkillCategory`: the backend returns skills pre-sorted, so keep
     mapping in array order (no change needed there).
   - `app/[locale]/page.tsx`: sort `rawCategories` by `order` before mapping (defensive —
     backend already sorts, but the public DTO type gains `order` so we honor it).

## 6. Acceptance criteria

- [ ] Admin can move a category up/down; reload shows the persisted order.
- [ ] Admin can reorder skills inside a category's edit dialog; save persists; reload shows it.
- [ ] Public portfolio renders categories and skills in the admin-defined order.
- [ ] No regression: visibility toggle, create/edit/delete still work.
- [ ] `biome check` + `tsc --noEmit` pass.

## 7. Frontend behavior if backend not yet deployed

The frontend degrades safely: `order` is read with `?? 0`, so missing values sort stably
by insertion order (current behavior). `CategoryApi.reorder()` will 404 until the backend
ships — the optimistic UI rolls back on error, so the table simply reverts. Skill ordering
via `skillIds` order is inert until the backend honors array order.
