# Known Pitfalls & Fixed Bugs (don't regress)

1. **RN Web `Alert.alert` does not support multi-button confirmations** (onPress never fires). Never use `Alert.alert` with buttons for Web flows — use the app-level `ConfirmDialog` (`components/ConfirmDialog.tsx`, RN Modal) or `window.confirm/prompt` only when unavoidable.
2. **Dangerous actions must use `ConfirmDialog`** (settings Clear Bookshelf / Reset Data) — system dialogs previously corrupted the navigation stack on Web.
3. **Nested TouchableOpacity inside `<Link asChild>` steals taps**: clicking an inner button also triggers navigation (bookshelf X button bug). Keep inner buttons OUTSIDE the Link's pressable child, or manage state directly (e.g. `BannerListItem` keeps its own lightbox `Modal` instead of wrapping the image in `ImageLightbox`'s touchable).
4. **expo-router warns about style arrays passed to a `<Slot>` child** (`<Link asChild>`): flatten with `StyleSheet.flatten([...])` if the child takes an array style.
5. **Tab pages are persistent** — `useEffect([])` won't reload data when returning to the tab. Use `useFocusEffect(useCallback(...))` (expo-router) for bookshelf-style reloads.
6. **Shared styles across components** in one file: converting to theme requires `createStyles(colors)` + per-component `useMemo` (see [theming.md](./theming.md)); forgetting `useTheme()` inside a helper component = "Cannot find name 'colors'" TS error.
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

15. **FlatList infinite-scroll pages can double-append the same page (duplicate keys)** — every list page that loads more data has multiple pagination triggers (`onLayout`, `onContentSizeChange`, `onEndReached`, auto-fill effects) which can fire in the same render cycle. A `loading` **state** guard is async (`setState` is batched), so concurrent calls all see `loading === false` and append the same page's rows twice → React console error "Encountered two children with the same key" (key = novel id). This affects ALL infinite list pages (novels / tags/[id] / contests/[id] / statuses/[id] / genres/[id] via `useNovels`, plus rankings / search / banners), so new list pages must NOT rely on a state guard. Always guard with a synchronous **ref lock**:
    ```ts
    const loadingRef = useRef(false);
    async function loadMore(reset = false) {
      if (!reset && loadingRef.current) return;
      if (!reset) loadingRef.current = true;
      try { /* query + append */ } finally { loadingRef.current = false; }
    }
    ```
    The `reset` path (tab switch / refresh / new query) bypasses the lock so a fresh load always runs. Manual button-driven pagination (booklists, monthly month list) has no concurrent triggers and needs no lock. Reference implementations: `useNovels.loadMore`, `rankings.loadRankings`, `search.search`; `authors.loadAuthors` / `banners.loadBanners` already followed this pattern.
