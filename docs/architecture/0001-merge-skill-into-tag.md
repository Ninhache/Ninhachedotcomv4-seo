# ADR 0001 — Merge `Tag` into `Skill`; replace `QUAL` tags with a `ProjectNature` enum

**Status:** Accepted
**Date:** 2026-06-05
**Repos involved:** `Ninhachedotcomv4-back` (backend) + `Ninhachedotcomv4-seo` (frontend, this repo)
**Supersedes / unblocks:** the deferred "experience tags as links" need (tags carried no URL; a `Skill` does, via `wikiUrl`).

## Context

The portfolio has two near-identical content primitives:

- **`Tag`** — `{ type: TagType, isVisible, hexColor, translations(name) }`, attached polymorphically to projects (tech + qual), skills, missions, and companies.
- **`Skill`** — `{ image, wikiUrl?, isVisible, translations(name), categories }`, shown in the public "skills" grid.

An audit of every `TagType` usage across both repos established:

| TagType / relation | Consumer | Meaning | Public-rendered? | Admin pool filter |
|---|---|---|---|---|
| `TECH` / ProjectTechTags, SkillTags, CompanyTags | Project tech, Skill tags, Company card | A **technology** | Yes (project cards, employer cards, mission modal) | `type: 'TECH'` |
| `MISSION_TECH` / MissionTechTags | Mission tech | A technology (per-mission) | Yes (mission modal) | **`type: 'TECH'`** (mission form never uses MISSION_TECH; `listMissionTags` has zero callers) |
| `QUAL` / ProjectQualTags | Project only | **Project nature** (`personal`/`school`/`web`/`simulations`/…), drives sorting + the "type" label — NOT a technology | Indirect (type label only) | `type: 'QUAL'` |
| `SKILL_CATEGORY` | (schema only) | Dead — the real mechanism is the `SkillCategory` model | No | never |

Two facts drive this decision:

1. A `TECH` Tag named "React" and a `Skill` named "React" are **the same real-world entity, duplicated**. Every TECH-pool consumer (projects, missions, companies, skills) draws from one shared pool of technologies — which is exactly what a Skill is.
2. A `Skill` already carries the richer data the author wants on tags everywhere: a link (`wikiUrl`) and (later) an SVG (`image`). Promoting tags to skills makes that richness reusable on every project/mission/company chip.

`QUAL` is the lone exception: those rows are project-nature enum values masquerading as tags (their **English name** is matched against the hardcoded `SORT_TYPE` keys in `lib/project-categories.ts`). They are not technologies and must not become skills.

## Decision

1. **`Skill` absorbs the entire TECH tag pool.** Projects, missions, and companies link to `Skill` instead of `Tag`. The deduplicated set of TECH tags + existing skills becomes one `Skill` table, matched **by English name**.
2. **`QUAL` becomes a `ProjectNature` enum** (`SCHOOL, PERSONAL, WEB, SIMULATIONS, DATE, RANDOM` — mirroring `SORT_TYPE`), stored as `Project.natures ProjectNature[]`.
3. **The `Tag` model is deleted entirely** — `Tag`, `TagTranslation`, the `TagType` enum, and all five tag join tables.
4. Dropped along the way (unused): a `Skill`'s own `tags` relation (never rendered) and `Tag.hexColor` (public chips use CSS tokens, not the stored hex).
5. `Skill.image` becomes **nullable** — TECH tags migrated into skills have no SVG yet; the author fills them in later.

The author's framing was explicit: *"les tags sont des skills"* — so **Skill** (not Tag) is the surviving model, and missions/projects/companies are "liés à des skills et non à des tags".

## Consequences

**Positive**
- Single source of truth for technologies; "React" exists once, with one icon + one link, reused everywhere.
- Experience/project/mission chips can render as links (`wikiUrl`) — closes the long-deferred "tags as links" item.
- `SKILL_CATEGORY` and `MISSION_TECH` dead weight removed; the admin loses a whole redundant "Tags" page.

**Negative / risks**
- **Destructive migration on the real database.** Mitigation: `pg_dump` backup first; data-migration SQL runs *before* any `DROP`; dry-run on a dump.
- Name-based dedupe could merge two distinct technologies that share an English name (low risk for this dataset; the author curates it).
- Large blast radius (~15–20 files across both repos): DTOs, services, mappers, four admin forms, public components.

**Neutral**
- `ProjectNature` includes `DATE`/`RANDOM` (empty-label legacy sort directives) purely so the migration is lossless; they may be pruned later.

## Alternatives considered

- **Tag absorbs Skill** (the inverse) — rejected by the author: conceptually "tags are skills", and it would force category/ordering machinery onto every tag.
- **Light merge: add `wikiUrl`/`image` to `Tag`, keep both models** — rejected: increases the overlap instead of resolving it; "React" stays duplicated.
- **Keep `QUAL` as a slimmed-down `Tag`** — rejected in favor of a dedicated `ProjectNature` enum (the value set is fixed and already enum-like).

Implementation contract: see `docs/specs/skill-tag-merge.md`.
