# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

## Project Overview

**Novly** — an offline-first novel metadata browser (also packaged as a Windows desktop app via Tauri v2) built with React Native / Expo (SDK 57) + TypeScript. Repo: `light-nook-labs/novly`.

- Data is bundled locally (`assets/seed.sql.gz` → SQLite via `utils/database.ts`); no network needed.
- Upstream data source: `light-nook-labs/novel_hub`. Sibling Flutter app: `light-nook-labs/NovelHubMobile`.
- Routes: expo-router (`app/**`). Package manager: **pnpm** (workspace root: `pnpm-workspace.yaml`).

## Quick Commands

```bash
pnpm install       # install deps
pnpm start         # dev server (interactive platform picker)
pnpm run web       # web (fastest iteration)
pnpm test          # jest unit tests (mappings/urls/months/badge colors)
npx tsc --noEmit   # ALWAYS run type check before finishing / committing — must pass
pnpm tauri build  # build Windows desktop installer (NSIS)
```

## Android Real-Device Debugging (USB)

> See **[docs/android-debugging.md](./docs/android-debugging.md)** — USB + development build (debug); **don't use Expo Go** (can't run SDK 57, USB stability far higher); `adb reverse` must be manual; port 8081 is fixed (the ONLY allowed port).

## Architecture & Conventions

### Data layer

- **Global DB** (`utils/database.ts`): `initDatabase(preloadedHot?)` / `getDatabase()` — promise-cached singleton. First run: decompress hot chunk → open DB → background merge cold (3 parts). Read-only app data.
- **Bookshelf local DB** (`utils/bookshelfDb.ts`): separate `bookshelf.sqlite` for user-private data — NEVER read the bookshelf from the global DB. API: `getBookshelf()`, `addToBookshelf(novel)` (takes `Omit<BookshelfNovel, "added_at">`), `removeFromBookshelf(id)`, `clearBookshelf()`, `isInBookshelf(id)`.
- **Pagination**: lists page at 10 items per page (`PAGE_SIZE = 10`); infinite scroll via `onEndReached` + `onContentSizeChange` auto-fill on tall screens.
- **Status normalization** (`normalizeStatus` in `utils/mappings.ts`): A-variants are merged — status `5` (Abandoned-A) → `4`, status `6` (Completed-A) → `2`. The `statuses` list page groups by the normalized value; `NovelRow` renders the raw value (both display fine via `statusMapping`).
- **Cold merge**: runs in background via `setTimeout`, uses `PRAGMA busy_timeout = 60000`. Progress banner shown in UI via `subscribeInitProgress`. Cold merged marker: `.db_merged_v5`.

### Regenerating data chunks (gzip files)

> See **[docs/data-pipeline.md](./docs/data-pipeline.md)** — nookdata JSONL → `scripts/build_chunks.py` → `assets/chunks/*.sqlite.gz` (hot + cold_1/2/3 by author hash). Chunk categories, gzip commands, and the `temp/` directory policy live there.

### Theming

> See **[docs/theming.md](./docs/theming.md)** — `useTheme()` + in-component `useMemo([colors])` styles (or `createStyles(colors)` for shared styles); never module-level `Colors.xxx` for new code.

### Custom headers

- All routes use custom headers (`headerShown: false` in `app/_layout.tsx` Stack screens). Use `PageHeader` (`components/Header.tsx`) or `TabHeader` (`components/TabHeader.tsx`).
- `PageHeader` props: `title`, `titleAppend`, `search`/`setSearch` (input mode), `onSearchPress`, `right`. Back button: short-press → `router.back()`, long-press → `router.replace("/(tabs)")`.
- Registered Stack screens must stay in sync with actual routes (search, search/banners, novels/[id], authors/[id], tags/[id], contests/[id], genres/[id], statuses/[id], booklists, booklists/[id], monthly/[ym], settings, about — all `headerShown: false`).

## Known Pitfalls & Fixed Bugs (don't regress)

> See **[docs/pitfalls.md](./docs/pitfalls.md)** — 14 known pitfalls & fixed bugs (CJK glyph truncation, stale `res/raw` assets bloating the APK, cold-merge file paths, `Alert.alert` on web, etc.). Read before touching lists/dialogs/data/bundling.

### Detail routes are variants of the novels route

`app/tags/[id].tsx`、`app/contests/[id].tsx`、`app/genres/[id].tsx`、`app/statuses/[id].tsx` are all variants of `app/(tabs)/novels.tsx`:

- List / pagination / filter / count all reuse `hooks/useNovels.ts`; detail fixed conditions are passed via `fromClause` / `extraWhere` / `extraParams` (e.g. tag: `FROM novels n INNER JOIN novel_tags nt` + `nt.tag_id = ?`; status: `FROM novels` + `status ${statusIn}`)
- Head tabs share `components/PtypeTabs.tsx`; filter uses `NovelFilterSheet`; footer loading pattern identical to novels
- **When changing list behavior → modify `useNovels` first, do NOT copy logic per page** (past per-page copies caused repeated bugs: count not showing, filter not applied, duplicate keys)

## Key Files Quick Reference

| File                                                                                    | Purpose                                                                                              |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `types/models.ts`                                                                       | centralized data-model types (Author/Novel/Contest/FilterState/Booklist/...; pages import from here) |
| `constants/theme.ts`                                                                    | `lightColors`, `darkColors`, `Colors`(=light), `FontSize`/`Spacing`/`BorderRadius`                   |
| `constants/icons.ts`                                                                    | 统一图标常量(含底部 tab 图标,注释区分)                                                               |
| `components/ThemeProvider.tsx`                                                          | `ThemeProvider`, `useTheme()`, `ThemeMode` / `ThemeColors` types                                     |
| `utils/database.ts`                                                                     | `initDatabase()` / `getDatabase()` (promise-cached singleton)                                        |
| `utils/bookshelfDb.ts`                                                                  | bookshelf local db: `getBookshelf/addToBookshelf/removeFromBookshelf/clearBookshelf/isInBookshelf`   |
| `utils/mappings.ts`                                                                     | `genreMapping`, `statusMapping`, `ptypeMapping`, `statusColors`, `normalizeStatus`, `formatNumber`   |
| `utils/urls.ts`                                                                         | `coverUrl()`, `bannerUrl()`                                                                          |
| `components/Header.tsx`                                                                 | `PageHeader`                                                                                         |
| `components/TabHeader.tsx`                                                              | tab-page header (logo + search + right)                                                              |
| `components/NovelRow.tsx`                                                               | novel list row (cover, badges, rank, optional extended stats/tags)                                   |
| `components/NovelFilterSheet.tsx`                                                       | generic filter bottom sheet (`FilterState` interface; reuse for novels & bookshelf)                  |
| `components/Banner.tsx` / `BannerListItem.tsx` / `IndexBannerItem.tsx`                  | home carousel & banner list items                                                                    |
| `components/InfoSheet.tsx` / `NoteCard.tsx` / `ConfirmDialog.tsx` / `ImageLightbox.tsx` | 说明弹层 / 提示卡 / 确认弹窗 / 图片灯箱                                                              |
| `hooks/useNovels.ts`                                                                    | novel list query hook (filters + paging + whitelisted ORDER BY)                                      |
| `hooks/useScrollToTop.ts`                                                               | back-to-top button behavior                                                                          |
| `src-tauri/`                                                                            | Tauri v2 desktop packaging (tauri.conf.json, nsis-hooks.nsh, icons)                                  |

## Version Bump

Version lives in MANY places — bump them ALL together, or Settings/About pages will show a stale version:

- `package.json` → `"version"`
- `app.json` → `expo.version`
- `src-tauri/tauri.conf.json` → `version`
- `src-tauri/Cargo.toml` → `version`
- `android/app/build.gradle` → `versionCode` (+1) & `versionName`
- **`constants/appInfo.ts`** — `APP_VERSION` (single source for Settings/About display; update once)
- **`app/settings.tsx`** — footer text `vX.Y.Z` (uses APP_VERSION, easy to forget!)
- **`app/about.tsx`** — logo section `<Text>vX.Y.Z</Text>` (easy to forget!)

Checklist before release: `grep -rn "v1\.0\.0\|1\.0\.0" app/ src-tauri/ package.json` to catch leftovers.

## Release Checklist(every version bump)

On each `vX.Y.Z` release, do ALL of:

1. Bump version everywhere(see Version Bump above)
2. Update `CHANGELOG.md` — record the version's features & fixes
3. Changelog: Settings → Changelog opens the repo's `CHANGELOG.md` on GitHub — no in-app page/sync anymore (do NOT re-add a changelog route or page)
4. Update `README.md` AND `README_EN.md`(both languages)
5. Format code:`pnpm format`(Prettier),then `npx tsc --noEmit`
6. Commit & publish the release

## Bug Severity Levels

Report & fix bugs with 5 severity levels:

| Level    | Meaning                                                              | Example                               |
| -------- | -------------------------------------------------------------------- | ------------------------------------- |
| BLOCKER  | Blocks release: crash / data loss / core feature completely unusable | App crashes on launch                 |
| CRITICAL | Severe: core feature broken, fix ASAP                                | Data not found after DB merge         |
| MAJOR    | Main: feature usable but clearly broken                              | Restart dialog cannot restart the app |
| NORMAL   | General: feature affected but not severe                             | Loading screen has no StatusBar       |
| MINOR    | Minor: UX / style nit, can be deferred                               | Wording / style details               |

- Tag bugs with a severity level; fix in priority order BLOCKER -> CRITICAL -> MAJOR -> NORMAL -> MINOR
- BLOCKER / CRITICAL must be fixed immediately and never shipped with

## Icon Usage

- ALWAYS check `constants/icons.ts` first before using an icon
- If the icon you need is missing, ADD it there: use a business-semantic key (e.g. `back`, `like`, `click`) and comment its usage semantics
- Never hardcode icon names in pages/components — always import from `ICONS`
- This keeps icons consistent across the app (single source of truth)

## Contributing

- Report bugs / suggest features via Issues; PRs welcome (fork → branch → PR).
- Run `npx tsc --noEmit` and make sure it passes before submitting.
- Keep this file accurate: when you fix a bug or discover a pitfall, add it to the lists in `docs/pitfalls.md`.
