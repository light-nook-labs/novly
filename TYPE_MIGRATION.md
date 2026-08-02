# Type Migration Guide

Gradual refactor: consolidate important type definitions into centralized files, following React project conventions.

## Goal

- Centralize shared data-model types (`Author`, `Novel`, `Contest`, ...) under `types/`
- Pages and components import types from the central files instead of defining them locally
- Single source of truth: type changes are made in one place only

## Migration Pattern

For each type, follow these steps:

1. Move the local `interface X` into `types/models.ts` (or a dedicated `types/xxx.ts`) and export it
2. Remove the local definition from the page/component
3. Add `import { X } from "../types/models";` at the top of the file (adjust path per directory depth: `../types/` from `app/`, `../../types/` from deeper dirs)
4. Run `npx tsc --noEmit` and make sure it passes before moving on

> Note: when inserting the import, place it BEFORE the first existing `import {` statement — never inside a multi-line import block (this breaks syntax).

## Progress

### Migrated

| Type | From | To | Status |
| --- | --- | --- | --- |
| `Author` | app/authors.tsx | types/models.ts | done |

### Pending

| Type | Current location(s) |
| --- | --- |
| `Novel` | app/novel/[id].tsx, app/(tabs)/rankings.tsx |
| `Tag` | app/novel/[id].tsx |
| `Contest` | app/contest/[id].tsx, app/contests.tsx |
| `FilterState` | app/(tabs)/novels.tsx, app/contest/[id].tsx, app/genre/[id].tsx, app/(tabs)/bookshelf.tsx |
| `CacheEntry` | app/contests.tsx, app/genres.tsx |
| `GenreCount` | app/genres.tsx |
| `AuthorStats` | app/author/[id].tsx |
| `BannerNovel` | app/(tabs)/index.tsx |

## Verification

- Always run `npx tsc --noEmit` after each migration — it must pass with zero project errors
- Update this document's progress table after each migration

## Shared Resources

- Icons: centralized in `constants/icons.ts` (`ICONS` object) — always import from there instead of hardcoding icon names, to keep icon style consistent
- App meta info: centralized in `constants/appInfo.ts`
- App version: `APP_VERSION` in `constants/appInfo.ts`
