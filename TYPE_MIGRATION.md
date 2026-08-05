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

| Type            | From                                                                                        | To                    | Status |
| --------------- | ------------------------------------------------------------------------------------------- | --------------------- | ------ |
| `Author`        | app/authors.tsx                                                                             | types/models.ts       | done   |
| `Novel`         | app/novels/[id].tsx                                                                         | types/models.ts       | done   |
| `Tag`           | app/novels/[id].tsx                                                                         | types/models.ts       | done   |
| `Contest`       | app/contests/[id].tsx, app/contests.tsx                                                     | types/models.ts       | done   |
| `FilterState`   | app/(tabs)/novels.tsx, app/contests/[id].tsx, app/genres/[id].tsx, app/(tabs)/bookshelf.tsx | types/models.ts       | done   |
| `CacheEntry<T>` | app/contests.tsx, app/genres.tsx                                                            | types/models.ts       | done   |
| `GenreCount`    | app/genres.tsx                                                                              | types/models.ts       | done   |
| `AuthorStats`   | app/authors/[id].tsx                                                                        | types/models.ts       | done   |
| `ICONS`         | constants/icons.ts                                                                          | centralized constants | done   |

### Pending

| Type                 | Current location(s)     | Notes                                                                                     |
| -------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `BannerNovel`        | app/(tabs)/index.tsx    | Local interface; fields differ from models.ts `Novel`. Needs dedicated model or merge.    |
| `NovelRowData`       | components/NovelRow.tsx | Row-specific type (value/pick/stats). Could stay in component or move to types/models.ts. |
| `Novel` (simplified) | app/(tabs)/rankings.tsx | Simplified Novel interface (subset of models.ts). Could reuse or extend.                  |

## Verification

- Always run `npx tsc --noEmit` after each migration — it must pass with zero project errors
- Update this document's progress table after each migration

## Shared Resources

- Icons: centralized in `constants/icons.ts` (`ICONS` object) — always import from there instead of hardcoding icon names, to keep icon style consistent
- App meta info: centralized in `constants/appInfo.ts`
- App version: `APP_VERSION` in `constants/appInfo.ts`
