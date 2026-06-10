# Spec — Merge `Tag` into `Skill` + `ProjectNature` enum

**Status:** Draft — backend contract + migration + frontend implementation
**Date:** 2026-06-05
**Repos:** `Ninhachedotcomv4-back` (backend) + `Ninhachedotcomv4-seo` (frontend, this repo)
**Decision record:** `docs/architecture/0001-merge-skill-into-tag.md`

## 1. Problem

`Tag` and `Skill` model the same real-world entity (a technology) twice. Every TECH-pool
consumer (project tech, mission tech, company card, skill tags) shares one pool of
technologies = skills. `QUAL` tags are the sole non-technology use (project nature →
sorting + type label). Goal: collapse the TECH pool into `Skill`, turn `QUAL` into a
`ProjectNature` enum, delete `Tag`.

## 2. Scope

- **In:** Prisma model merge; destructive+lossless data migration; backend DTO/service
  changes for project/mission/company/skill + deletion of the `tags` module; frontend
  types/mappers/admin-forms/public-render changes; rendering skill chips as links.
- **Out:** adding SVG icons to migrated skills (author does this later in admin); any new
  public UI beyond making existing chips links; pruning `DATE`/`RANDOM` natures.

## 3. Target data model (Prisma, backend)

### 3.1 `Skill` — the unified entity

```prisma
model Skill {
  id            String             @id @default(cuid())
  image         String?            // NULLABLE now (was required) — SVGs filled later
  wikiUrl       String?
  isVisible     Boolean
  categoryLinks SkillOnCategory[]  // unchanged — categories are filled with skills
  translations  SkillTranslation[] // unchanged — name per locale
  // Absorbed TECH-pool relations (formerly Tag relations):
  projects      Project[]          @relation("ProjectSkills")
  missions      Mission[]          @relation("MissionSkills")
  companies     Company[]          @relation("CompanySkills")
}
```

Dropped vs today: the `tags Tag[] @relation("SkillTags")` relation (never rendered).

### 3.2 `Project`

```prisma
model Project {
  // …unchanged scalar fields…
  skills       Skill[]          @relation("ProjectSkills")   // was techTags
  natures      ProjectNature[]                               // was qualTags
  translations ProjectTranslation[]
}
```

### 3.3 `Mission` / `Company`

```prisma
// Mission
skills Skill[] @relation("MissionSkills")   // was techTags

// Company
skills Skill[] @relation("CompanySkills")   // was tags (CompanyTags)
```

### 3.4 New enum, deletions

```prisma
enum ProjectNature { SCHOOL  PERSONAL  WEB  SIMULATIONS  DATE  RANDOM } // mirrors SORT_TYPE
```

Delete: `model Tag`, `model TagTranslation`, `enum TagType`, and join tables
`_ProjectTechTags`, `_ProjectQualTags`, `_SkillTags`, `_MissionTechTags`, `_CompanyTags`.

## 4. Migration strategy (destructive — real DB)

Run order is critical: **preserve data before dropping anything.**

0. **`pg_dump` backup**, and dry-run the whole migration against a restored copy first.
1. `npx prisma migrate dev --create-only --name merge_skill_tag` to scaffold the schema SQL.
2. **Hand-edit** the generated migration to run data migration BEFORE the drops:
   1. **TECH Tag → Skill, dedupe by EN name.** For each `Tag` of type `TECH`/`MISSION_TECH`,
      find a `Skill` whose `en` `SkillTranslation.name` equals (trim/ci) the tag's `en`
      `TagTranslation.name`. If found → reuse. Else → create a `Skill`
      (`image = NULL`, `wikiUrl = NULL`, `isVisible = tag.isVisible`) and copy all its
      `TagTranslation` rows into `SkillTranslation`. Keep a temp `tag_id → skill_id` map
      (a temp table or CTE).
   2. **Re-point joins** through the map: `_ProjectTechTags → _ProjectSkills`,
      `_MissionTechTags → _MissionSkills`, `_CompanyTags → _CompanySkills`.
      `_SkillTags` is discarded.
   3. **QUAL → `Project.natures`:** for each `_ProjectQualTags` row, append
      `UPPER(en TagTranslation.name)::"ProjectNature"` to the project's `natures`
      (skip names that don't map to an enum value; log them).
3. The drops (tag tables, join tables, `TagType`) run after, in the same migration.
4. `npx prisma generate`.

`SKILL_CATEGORY` tags: not technologies, not natures → simply dropped with the table
(no public consumer).

## 5. Backend contract changes

GET-vs-write asymmetry stays (GET returns full objects; writes use id arrays).

- **Project** DTO: `techTagIds` → `skillIds: string[]`; `qualTagIds` → `natures: ProjectNature[]`.
  GET returns `skills` (full) + `natures`. Service: `connect`/`set` on `skills`; `natures`
  written as a scalar enum array.
- **Mission** DTO: `techTagIds` → `skillIds`. GET returns `skills`. Service mirrors the
  current `techTags` connect/set logic on `skills`.
- **Company** DTO: `tagIds` → `skillIds`. GET returns `skills`. (Just done for tags;
  rename the field + relation.)
- **Skill** service: image now optional; **remove** the `tags`/`tagIds` handling entirely.
- **Delete the `tags` module** (controller/service/dto/entity/module) and unwire it from
  `AppModule`. Remove the stale `tag.entity.ts` enum copy.
- **Revalidation:** a skill mutation now affects projects + experience cards, so the skill
  controller must revalidate the dependent tags too (`@RevalidateContent(['skills',
  'projects', 'companies', 'timeline'])` or equivalent). Confirm tag names with the front.

## 6. Frontend changes (this repo)

- **`lib/types.ts`:** delete `TagDTO`/`TagType`/`TagTranslationDTO`. Add
  `type ProjectNature = 'SCHOOL' | 'PERSONAL' | 'WEB' | 'SIMULATIONS' | 'DATE' | 'RANDOM'`.
  `SkillDTO.image` → nullable. `ProjectDTO`: `skills: SkillDTO[]` + `skillIds`, `natures:
  ProjectNature[]` (drop techTags/qualTags). `MissionDTO`/`CompanyDTO`: `skills` + `skillIds`.
- **`lib/mappers.ts`:**
  - `mapProject`: tech chips from `dto.skills` with `url: skill.wikiUrl ?? '#'`; build
    `sortCategories` from `dto.natures` (enum → `SORT_TYPE` value, lower-case).
  - `mapTimelineToEmployers`: mission `tags` and company `cardTags` from `skills`, now with
    real `url: skill.wikiUrl` → **renders experience chips as links**.
  - `mapSkillCategory`: unchanged (already image/wikiUrl/translations only).
- **Admin:**
  - New/adapted **`SkillMultiSelect`** (derive from `components/forms/tag-multi-select.tsx`)
    backed by `SkillApi.findAll`. Used by projects (tech), missions, companies.
  - `components/projects/form.tsx`: tech picker → skill picker; qual picker → `natures`
    enum checkboxes.
  - `components/missions/form.tsx` + `components/companies/form.tsx`: tag picker → skill picker.
  - `components/skills/form.tsx`: remove the tags field; `image` optional.
  - **Delete** `app/admin/(auto)/tags/page.tsx` + its nav entry; remove `lib/tag/*`.
  - `app/admin/(auto)/skills/page.tsx`: drop the tag-badges column.
- **Public render:** project cards (`BigProject`/`SmallProject`), `ExperienceItem`,
  `MissionModal` — chips become `<a href={url}>` when `url !== '#'`, else `<span>` (reuse
  the CSS rule already covering both).

## 7. Acceptance criteria

- [ ] Migration replayed on a DB dump with **zero data loss**: every project keeps its tech
      stack (as skills) and its nature(s); every mission/company keeps its skills; existing
      skills are not duplicated (name-dedupe verified).
- [ ] `GET /timeline` and `GET /project` return `skills` (full objects) + (projects)
      `natures`; no `tags`/`techTags`/`qualTags` keys remain.
- [ ] Public `/fr` and `/en` render the same tech chips as before; chips with a `wikiUrl`
      are links (open the wiki), chips without stay plain spans.
- [ ] Project sorting + "type" label (Personnel/Scolaire/Web/Simulation) unchanged.
- [ ] Admin: projects/missions/companies pick skills; projects pick natures; skill form has
      no tags field and optional image; the Tags page is gone.
- [ ] Backend `yarn build` + `yarn test` green; front `npm run build` + `npm run lint` (biome) green.

## 8. Rollback

The `pg_dump` from §4.0 is the rollback path (restore + revert the schema/migration). The
migration is one transaction where possible so a mid-run failure leaves the DB on the old
schema.
