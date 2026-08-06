# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

## Project Overview

**Novly** — an offline-first novel metadata browser (also packaged as a Windows desktop app via Tauri v2) built with React Native / Expo (SDK 57) + TypeScript. Repo: `light-nook-labs/novly`.

- Data is bundled locally (`assets/seed.sql.gz` → SQLite via `utils/database.ts`); no network needed.
- Upstream data source: `light-nook-labs/novel_hub`. Sibling Flutter app: `light-nook-labs/NovelHubMobile`.
- Routes: expo-router (`app/**`). Package manager: **pnpm** (workspace root: `pnpm-workspace.yaml`).

## Quick Commands

x

```bash
pnpm install       # install deps
pnpm start         # dev server (interactive platform picker)
pnpm run web       # web (fastest iteration)
npx tsc --noEmit   # ALWAYS run type check before finishing / committing — must pass
pnpm tauri build  # build Windows desktop installer (NSIS)
```

### Android Real-Device Debugging (USB)

> **Don't use Expo Go**: Expo Go cannot run the latest Expo SDK (this project uses SDK 57), and it relies on Wi-Fi LAN, whose connection stability is far lower than the USB reverse tunnel. Real-device debugging always uses **USB + development build (debug)**.

Prereqs: enable "Developer options → USB debugging" on the phone, connect it via USB cable.

> **Do NOT use `pnpm run android`**: it does NOT build the app — it launches the Android Studio emulator and installs Expo Go (which cannot run this project's SDK 57). Build & install the debug APK manually:

```bash
adb devices                            # confirm the device is online (status = device)
cd android && ./gradlew assembleDebug  # build the debug APK (native shell only — data/assets are NOT bundled)
adb install -r app/build/outputs/apk/debug/app-debug.apk  # install to the USB device
```

> **Don't rebuild debug repeatedly**: the debug APK does NOT bundle JS or data (`assets/chunks`) — everything is served by Metro at runtime, so rebuilding does NOT pick up data changes. Rebuild only when native code changes; for data/JS changes just restart/refresh Metro.

Then start the dev server and expose it to the phone over USB. **`adb reverse` must be established MANUALLY** — it is not automatic; do it every time after (re)connecting the USB cable. **Port 8081 is fixed (hardcoded)**: Metro must run on 8081 and `adb reverse` must use 8081 — the app connects to `localhost:8081`; do NOT use any other port:

```bash
npx expo start --port 8081 --clear  # 1) start Metro on the fixed port 8081 (add --clear when the cache is corrupted / deserialize errors)
adb reverse tcp:8081 tcp:8081   # 2) REQUIRED manual step: phone reaches Metro on the PC over the USB reverse tunnel (debug JS/assets are served by Metro at runtime)
adb shell pm clear com.lightnooklabs.novly  # 3) clear the old DB before verifying new data (e.g. after chunk rebuild), otherwise the stale merged DB persists
```

Notes:

- The debug build does **NOT** bundle the JS bundle or `assets/chunks` into the APK — they are fetched from Metro at runtime. Real-device testing requires a manually-established `adb reverse` and a running dev server.
- **Port 8081 is the ONLY allowed port** for the dev server and `adb reverse` — other ports are forbidden.
- **Don't run two dev servers at once** (port 8081 conflict).
- App package name: `com.lightnooklabs.novly`.

## Architecture & Conventions

### Data layer

- **Global DB** (`utils/database.ts`): `initDatabase(preloadedHot?)` / `getDatabase()` — promise-cached singleton. First run: decompress hot chunk → open DB → background merge cold (3 parts). Read-only app data.
- **Bookshelf local DB** (`utils/bookshelfDb.ts`): separate `bookshelf.sqlite` for user-private data — NEVER read the bookshelf from the global DB. API: `getBookshelf()`, `addToBookshelf(novel)` (takes `Omit<BookshelfNovel, "added_at">`), `removeFromBookshelf(id)`, `clearBookshelf()`, `isInBookshelf(id)`.
- **Pagination**: lists page at 10 items per page (`PAGE_SIZE = 10`); infinite scroll via `onEndReached` + `onContentSizeChange` auto-fill on tall screens.
- **Status normalization** (`normalizeStatus` in `utils/mappings.ts`): A-variants are merged — status `5` (Abandoned-A) → `4`, status `6` (Completed-A) → `2`. The `statuses` list page groups by the normalized value; `NovelRow` renders the raw value (both display fine via `statusMapping`).
- **Cold merge**: runs in background via `setTimeout`, uses `PRAGMA busy_timeout = 60000`. Progress banner shown in UI via `subscribeInitProgress`. Cold merged marker: `.db_merged_v5`.

### Regenerating data chunks (gzip files)

Data source: `interset-wq/nookdata` (corrected data from `light-nook-labs/novel_hub`).

**Source of truth**: `nookdata` release JSONL files → `scripts/build_chunks.py` → `assets/chunks/*.sqlite.gz`.

```bash
# 1. Get nookdata-fixed JSONL (from nookdata repo's temp/repaired/jsonl_fixed/)
#    Place them in a local directory, e.g. temp/nookdata-fixed/

# 2. Run build_chunks.py (from scripts/ directory)
cd scripts
python build_chunks.py <jsonl_dir> <output_dir>
# Example: python build_chunks.py ../temp/nookdata-fixed ../temp/output-chunks

# 3. Compress output to gzip and copy to assets/chunks/
node -e "
const fs=require('fs'),zlib=require('zlib');
const dir='<output_dir>';
for(const name of['hot','cold_1','cold_2','cold_3']){
  const raw=fs.readFileSync(dir+'/'+name+'_chunk.sqlite');
  const gz=zlib.gzipSync(raw,{level:9});
  fs.writeFileSync('../assets/chunks/'+name+'_chunk.sqlite.gz',gz);
  console.log(name+': raw='+(raw.length/1024/1024).toFixed(1)+'MB, gz='+(gz.length/1024/1024).toFixed(1)+'MB');
}
"
```

**Chunk categories** (defined in `scripts/build_chunks.py`):

| Chunk  | Status                                 | Records | Size (compressed) | Update Frequency |
| ------ | -------------------------------------- | ------- | ----------------- | ---------------- |
| hot    | 连载中, 完结A, 断更A                   | ~5k     | ~1.6MB            | Monthly          |
| cold_1 | 断更, 已完结 (author hash partition 0) | ~80k    | ~20MB             | Never            |
| cold_2 | 断更, 已完结 (author hash partition 1) | ~80k    | ~20MB             | Never            |
| cold_3 | 断更, 已完结 (author hash partition 2) | ~80k    | ~20MB             | Never            |

Cold data is split into3 parts by author name hash (`md5(author) % 3`), so novels by the same author always stay in the same chunk. This minimizes redundant author data across chunks.

下架 (7) and 其他 (1) data is excluded. Genre "其他" (1) is also excluded.

**Source dirs** (gitignored, for reference):

- `temp/nookdata-fixed/` — corrected JSONL from nookdata

> **`temp/` directory policy (hard rule)**: reserved ONLY for temporary files and cloning other repos (to avoid using the system temp directory). **NEVER put important code here.**
> Data pipeline scripts (`build_chunks.py`, `validators.py`, `fix_ptype.py`) must live in `scripts/` and be version-controlled — they were once gitignored under `temp/` and lost, recoverable only from the recycle bin.

### Theming (COMPLETE — all pages & components support light/dark)

- `components/ThemeProvider.tsx`: `ThemeMode = "system" | "light" | "dark"`, persisted in AsyncStorage (`theme_mode`). `useTheme()` returns `{ mode, colors, setMode }`.
- `constants/theme.ts`: `lightColors`, `darkColors` (same shape — typed via `typeof lightColors`), plus `Colors` alias pointing at `lightColors` (static default, used only where dynamic is impractical), `FontSize`, `Spacing`, `BorderRadius`.
- `app/_layout.tsx` wraps everything in `<ThemeProvider>`; `app/(tabs)/_layout.tsx` drives the tab bar colors from `useTheme`.
- Settings → APPEARANCE section switches the theme (System / Light / Dark).

**Pattern to follow when touching colors:**

```tsx
// 1) import (path depends on directory depth)
import { useTheme } from "../components/ThemeProvider"; // pages under app/
// import { useTheme } from "./ThemeProvider";            // components/

// 2) first line inside the component
const { colors } = useTheme();

// 3) dynamic colors in JSX: colors.primary / colors.text / colors.textMuted ...
// 4) styles that depend on theme MUST be created in-component:
const styles = useMemo(
  () =>
    StyleSheet.create({
      container: { backgroundColor: colors.background },
      // ...
    }),
  [colors],
);
// or, when a file has several components sharing styles (e.g. detail pages with a
// StatItem helper), use a module-level factory + ThemeColors:
//   function createStyles(colors: ThemeColors) { return StyleSheet.create({ ... }); }
//   const styles = useMemo(() => createStyles(colors), [colors]); // in EVERY component using it
```

Rules:

- **Never** reference module-level `StyleSheet.create` with `Colors.xxx` for new code — put styles in the component via `useMemo([colors])` (or `createStyles(colors)`).
- Any helper/sub-component that uses `colors` must call `useTheme()` itself (e.g. `StatItem` in `app/novels/[id].tsx` and `app/authors/[id].tsx`).
- Root container background must follow `colors.background` so the whole page flips with the theme.
- Keep `import { Colors } from ".../constants/theme"` only where a module-level constant genuinely needs a static color (e.g. `NAV_ITEMS` icons in `app/(tabs)/index.tsx`).

### Custom headers

- All routes use custom headers (`headerShown: false` in `app/_layout.tsx` Stack screens). Use `PageHeader` (`components/Header.tsx`) or `TabHeader` (`components/TabHeader.tsx`).
- `PageHeader` props: `title`, `titleAppend`, `search`/`setSearch` (input mode), `onSearchPress`, `right`. Back button: short-press → `router.back()`, long-press → `router.replace("/(tabs)")`.
- Registered Stack screens must stay in sync with actual routes (search, search/banners, novels/[id], authors/[id], tags/[id], contests/[id], genres/[id], statuses/[id], booklists, booklists/[id], monthly/[ym], settings, about — all `headerShown: false`).

## Known Pitfalls & Fixed Bugs (don't regress)

1. **RN Web `Alert.alert` does not support multi-button confirmations** (onPress never fires). Never use `Alert.alert` with buttons for Web flows — use the app-level `ConfirmDialog` (`components/ConfirmDialog.tsx`, RN Modal) or `window.confirm/prompt` only when unavoidable.
2. **Dangerous actions must use `ConfirmDialog`** (settings Clear Bookshelf / Reset Data) — system dialogs previously corrupted the navigation stack on Web.
3. **Nested TouchableOpacity inside `<Link asChild>` steals taps**: clicking an inner button also triggers navigation (bookshelf X button bug). Keep inner buttons OUTSIDE the Link's pressable child, or manage state directly (e.g. `BannerListItem` keeps its own lightbox `Modal` instead of wrapping the image in `ImageLightbox`'s touchable).
4. **expo-router warns about style arrays passed to a `<Slot>` child** (`<Link asChild>`): flatten with `StyleSheet.flatten([...])` if the child takes an array style.
5. **Tab pages are persistent** — `useEffect([])` won't reload data when returning to the tab. Use `useFocusEffect(useCallback(...))` (expo-router) for bookshelf-style reloads.
6. **Shared styles across components** in one file: converting to theme requires `createStyles(colors)` + per-component `useMemo` (see theming pattern above); forgetting `useTheme()` inside a helper component = "Cannot find name 'colors'" TS error.
7. **Bookshelf default sort is by added time** (`added_at` from the local DB); `FilterState.sortBy` default `"added_at"` — when switching to other sort keys the whitelist (`SORT_WHITELIST`) must include them.
8. **"Other"/genre 1 data is removed at seed-generation time** — genre/status filter sheets hide the "Other" (value 1) option; nav-grid stats on the home page count `DISTINCT` DB values (and merge status A-variants) so badge numbers match the list pages.
9. **Banner image offset aligns the core frame — not a bug** — sfacg banner images are ultra-wide 1920×430 (≈4.47:1), with the core visual in the 35%~95% width band. The container is ≈2.2:1 (`height = width * 0.45`); the image uses `resizeMode="cover"` with a negative offset to crop to the core band: `IndexBannerItem` uses `left: -width*0.45 / width: width*1.45`, `BannerListItem` uses `left: -width*0.65 / width: width*1.65`. Changing these values moves the visible window — it does not "fix" cropping. Container height must stay >2:1 (phone tier uses `width * 0.45`), otherwise the frame is cut off.
10. **RN Android truncates the last CJK glyph (missing trailing Chinese chars like year/month/day suffixes or trailing digits)** — Android (especially Huawei HarmonyOS Sans) measures CJK glyph widths slightly too small, so with `fontWeight: "400"` the last character paints outside the view bounds and gets clipped; web/iOS are fine. Unified fix, pick by container type:
    - **Fixed-width centered container** (nav counts, empty states, buttons): add `alignSelf: "stretch"` + `textAlign: "center"` to the Text so the TextView fills the container width and bypasses measurement;
    - **Content-width container** (chips, badges, inline meta text): `alignSelf: "stretch"` has no parent width to fill, so use `fontWeight: "600"` (the 400 weight triggers the bug, 600 is fine) + `paddingHorizontal: 2` for breathing room.
    - A `#id` nested inside a title Text (`ID` component) must be rendered with `<Text onPress>`, not wrapped in `TouchableOpacity` (a block-level View inside Text shifts the line box/baseline, sitting ~half a glyph higher).

11. **Android System WebView has no OPFS** — `navigator.storage.getDirectory` is not implemented in Android System WebView, but expo-sqlite's web backend (wa-sqlite) depends on OPFS. So **Tauri v2 Android (WebView shell) is NOT viable** for this app: the Android build must use the native RN/Expo path (native SQLite). Don't attempt `pnpm tauri android build` here (decided 2026-08-01, commit 2cef9ee); `src-tauri/gen/android` is a generated dir — keep it untracked.

12. **Cold merge must use separate file paths** — when merging multiple cold parts, each part must be decompressed to a different temp path (e.g. `cold_tmp.sqlite`) than the coldDb's file (`cold_chunk.sqlite`). Overwriting the coldDb's file while it's open causes "database is locked" errors. The `mergeColdInBackground` function uses `coldPath` for coldDb and `coldTmpPath` for subsequent parts.

13. **Large gz decompression must yield to event loop** — `readAsStringAsync` + `pako.inflate` on a 20MB gz file blocks the JS thread for ~50s. The `decompressAndWriteChunkStreaming` function uses 256KB push chunks with `setTimeout` yields every1MB to keep the UI responsive. Never read an entire gz file into memory in one shot on Android.

14. **RN gradle asset task never cleans stale `res/raw` gz assets** — bundled assets are copied into `android/app/build/generated/res/react/release/raw/` on every build, but old files are only added, never removed. After changing the bundled data model (e.g. hot/cold chunk splitting), stale assets from earlier builds (like the old single `cold_chunk.sqlite.gz` / `warm_chunk.sqlite.gz`) keep getting packaged into every release APK, silently bloating it (once caused a 164MB APK; the fix was deleting `generated/res` + `intermediates/packaged_res` and rebuilding). If the APK size jumps for no code reason, check the res/raw contents first.

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
- Keep this file accurate: when you fix a bug or discover a pitfall, add it to the lists above.
