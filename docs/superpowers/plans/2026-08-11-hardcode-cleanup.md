# Hardcode Cleanup & Docs Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded colors, dimensions, and URLs with semantic constants; fix stale docs.

**Architecture:** Add new tokens to `constants/theme.ts`, then mechanically replace hardcoded values across ~30 files. Centralize URLs in `utils/urls.ts`. Fix stale doc reference.

**Tech Stack:** React Native / Expo SDK 57, TypeScript, expo-router

## Global Constraints

- Run `npx tsc --noEmit` after each task — must pass
- Run `pnpm test` after each task — must pass
- No visual regression in light mode
- Follow existing code style (no new comments unless asked)
- Import `useTheme` from `../components/ThemeProvider` (or appropriate relative path)
- `colors.*` references must match the token names in `constants/theme.ts`

---

## File Structure

| File | Responsibility | Changes |
|------|---------------|---------|
| `constants/theme.ts` | Theme tokens + constants | Add 7 color tokens + `Layout` object |
| `utils/urls.ts` | URL constants + builders | Add `BOOKLIST_API`, `SURVEY_URL`, `MONTHLY_API`, `NOVEL_URL` |
| `components/Badge.tsx` | Badge component | Replace hardcoded ptype colors |
| `components/NovelRow.tsx` | Novel list row | Replace `RANK_COLORS` with theme tokens |
| `components/Banner.tsx` | Banner carousel | Replace hardcoded colors |
| `components/BannerListItem.tsx` | Banner list item | Import `BANNER_PREFIX` from urls.ts, replace colors |
| `components/IndexBannerItem.tsx` | Index banner item | Import `BANNER_PREFIX` from urls.ts, replace colors |
| `components/ConfirmDialog.tsx` | Confirm dialog | Replace overlay + dimension hardcodes |
| `components/ImageLightbox.tsx` | Image lightbox | Replace overlay hardcodes |
| `components/NovelFilterSheet.tsx` | Filter sheet | Replace overlay hardcodes |
| `components/InfoSheet.tsx` | Info sheet | Replace overlay hardcodes |
| `components/BackToTop.tsx` | Back-to-top FAB | Replace shadow hardcodes |
| `components/TabHeader.tsx` | Tab page header | Replace dimension hardcodes |
| `app/_layout.tsx` | Root layout | Replace colors + dimensions |
| `app/search.tsx` | Search page | Replace colors + dimensions |
| `app/about.tsx` | About page | Replace colors + dimensions |
| `app/settings.tsx` | Settings page | Replace overlay hardcodes |
| `app/(tabs)/index.tsx` | Home tab | Replace colors + import SURVEY_URL |
| `app/(tabs)/novels.tsx` | Novels tab | Replace colors |
| `app/(tabs)/rankings.tsx` | Rankings tab | Replace colors |
| `app/(tabs)/bookshelf.tsx` | Bookshelf tab | Replace colors |
| `app/novels/[id].tsx` | Novel detail | Replace colors + import NOVEL_URL |
| `app/monthly/[ym].tsx` | Monthly page | Replace colors + import MONTHLY_API |
| `app/booklists/[id].tsx` | Booklist detail | Import BOOKLIST_API from urls.ts |
| `utils/booklistApi.ts` | Booklist API | Import BOOKLIST_API from urls.ts |
| `AGENTS.md` | Project docs | Remove `statusColors` reference |

---

## Task 1: Add Theme Tokens + Layout Constants

**Files:**
- Modify: `constants/theme.ts:1-60`

**Interfaces:**
- Produces: `lightColors.overlay`, `lightColors.overlayLight`, `lightColors.rankGold`, `lightColors.rankSilver`, `lightColors.rankBronze`, `lightColors.starGold`, `lightColors.badgePtype` + same for `darkColors`; `Layout` export with `iconSm`, `iconMd`, `iconLg`, `iconXl`, `circleSm`, `circleMd`

- [ ] **Step 1: Add new color tokens to `lightColors`**

In `constants/theme.ts`, add after line 15 (`shadow: "#000000"`):

```ts
  overlay: "#000000",
  overlayLight: "#FFFFFF",
  rankGold: "#FFD700",
  rankSilver: "#C0C0C0",
  rankBronze: "#CD7F32",
  starGold: "#F5A623",
  badgePtype: "#26A69A",
```

- [ ] **Step 2: Add same tokens to `darkColors`**

In `constants/theme.ts`, add after line 32 (`shadow: "#000000"`):

```ts
  overlay: "#000000",
  overlayLight: "#FFFFFF",
  rankGold: "#FFD700",
  rankSilver: "#C0C0C0",
  rankBronze: "#CD7F32",
  starGold: "#F5A623",
  badgePtype: "#26A69A",
```

- [ ] **Step 3: Add `Layout` export**

In `constants/theme.ts`, add after line 60 (after `BorderRadius`):

```ts
export const Layout = {
  iconSm: 34,
  iconMd: 56,
  iconLg: 72,
  iconXl: 96,
  circleSm: 28,
  circleMd: 48,
};
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: add semantic theme tokens (overlay, rank, badge) + Layout constants"
```

---

## Task 2: Replace Hardcoded Colors in Components

**Files:**
- Modify: `components/Badge.tsx:35-36`
- Modify: `components/NovelRow.tsx:26`
- Modify: `components/Banner.tsx` (overlay colors)
- Modify: `components/BannerListItem.tsx:12,175,218,233` (URL + colors)
- Modify: `components/IndexBannerItem.tsx:17,211` (URL + colors)
- Modify: `components/ConfirmDialog.tsx:65,78-80` (overlay + dimensions)
- Modify: `components/ImageLightbox.tsx:46,49,60,75,86` (colors + overlays)
- Modify: `components/NovelFilterSheet.tsx:48,219,308` (colors + overlay)
- Modify: `components/InfoSheet.tsx:53` (overlay)
- Modify: `components/BackToTop.tsx:29` (shadow)
- Modify: `components/TabHeader.tsx:68-70` (dimensions)

**Interfaces:**
- Consumes: `lightColors` shape from Task 1
- Produces: All component files use `colors.*` for theme-aware styling

- [ ] **Step 1: Fix `components/Badge.tsx`**

Replace line 35 (`ptype` entry in `VARIANT_STYLES`):

Before:
```ts
    ptype: { bg: "#26A69A15", fg: "#26A69A", border: "#26A69A30" },
```
After:
```ts
    ptype: { bg: colors.badgePtype + "15", fg: colors.badgePtype, border: colors.badgePtype + "30" },
```

- [ ] **Step 2: Fix `components/NovelRow.tsx`**

Replace line 26:

Before:
```ts
const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];
```

Move `RANK_COLORS` inside the component function (after `const { colors } = useTheme();` on line 29):

After (inside component, after line 29):
```ts
  const RANK_COLORS = [colors.rankGold, colors.rankSilver, colors.rankBronze];
```

Delete the original line 26 `const RANK_COLORS = ...`.

- [ ] **Step 3: Fix `components/ConfirmDialog.tsx`**

Replace line 65:
Before: `backgroundColor: "rgba(0,0,0,0.4)"`
After: `backgroundColor: colors.overlay + "66"` (66 = hex for 0.4 opacity)

Replace lines 78-80 (icon circle dimensions):
Before: `width: 56, height: 56, borderRadius: 28`
After: `width: Layout.iconMd, height: Layout.iconMd, borderRadius: Layout.circleSm`

Add import at top: `import { Layout } from "../constants/theme";`

- [ ] **Step 4: Fix `components/ImageLightbox.tsx`**

Replace line 60: `backgroundColor: "rgba(0,0,0,0.98)"` → `backgroundColor: colors.overlay + "FA"`
Replace line 75: `backgroundColor: "rgba(255,255,255,0.2)"` → `backgroundColor: colors.overlayLight + "33"`
Replace line 86: `backgroundColor: "rgba(255,255,255,0.2)"` → `backgroundColor: colors.overlayLight + "33"`

Replace lines 46, 49 (close button `color="#fff"`): **Keep hardcoded** — white on dark overlay is correct.

- [ ] **Step 5: Fix `components/NovelFilterSheet.tsx`**

Replace line 219: `backgroundColor: "rgba(0,0,0,0.4)"` → `backgroundColor: colors.overlay + "66"`

Replace lines 48, 308 (`color: "#fff"`): **Keep hardcoded** — white on primary-colored button.

- [ ] **Step 6: Fix `components/InfoSheet.tsx`**

Replace line 53: `backgroundColor: "rgba(0,0,0,0.4)"` → `backgroundColor: colors.overlay + "66"`

- [ ] **Step 7: Fix `components/BannerListItem.tsx`**

Remove line 12 (local `BANNER_PREFIX` declaration). Import from urls.ts:
```ts
import { BANNER_PREFIX } from "../utils/urls";
```

Replace line 175: `boxShadow: "0 2px 4px rgba(0,0,0,0.1)"` — **Keep hardcoded** (CSS string can't use JS vars).
Replace line 218: `backgroundColor: "rgba(0,0,0,0.98)"` → `backgroundColor: colors.overlay + "FA"`
Replace line 233: `backgroundColor: "rgba(255,255,255,0.2)"` → `backgroundColor: colors.overlayLight + "33"`
Replace line 146 (`color: "#fff"`): **Keep hardcoded** — white on colored surface.

- [ ] **Step 8: Fix `components/IndexBannerItem.tsx`**

Remove line 17 (local `BANNER_PREFIX` declaration). Import from urls.ts:
```ts
import { BANNER_PREFIX } from "../utils/urls";
```

Replace line 211: `textShadowColor: "rgba(0,0,0,0.5)"` → `textShadowColor: colors.overlay + "80"`
Replace line 210 (`color: "#fff"`): **Keep hardcoded** — white text on banner.

- [ ] **Step 9: Fix `components/Banner.tsx`**

Replace line 343: `backgroundColor: "rgba(0,0,0,0.35)"` → `backgroundColor: colors.overlay + "59"`
Replace line 377: `boxShadow` — **Keep hardcoded** (CSS string).
Replace lines 400, 406 (`color: "#fff"`): **Keep hardcoded** — white on colored surface.

- [ ] **Step 10: Fix `components/BackToTop.tsx`**

Replace line 29: `boxShadow` — **Keep hardcoded** (CSS string).

- [ ] **Step 11: Fix `components/TabHeader.tsx`**

Replace lines 68-70:
Before: `width: 34, height: 34, borderRadius: 8`
After: `width: Layout.iconSm, height: Layout.iconSm, borderRadius: BorderRadius.sm`

Add import: `import { Layout, BorderRadius } from "../constants/theme";`

- [ ] **Step 12: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 13: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add components/
git commit -m "refactor: replace hardcoded colors/dimensions in components with theme tokens"
```

---

## Task 3: Replace Hardcoded Colors in App Pages

**Files:**
- Modify: `app/_layout.tsx:107,119,280-283,293,418-419,466,481,535`
- Modify: `app/search.tsx:180,184,186,191,193,194,196,201,203,210,212,215,216,222,232`
- Modify: `app/about.tsx:57-58,107-108,193,206-208,244,337,396`
- Modify: `app/settings.tsx:681`
- Modify: `app/(tabs)/index.tsx:68,96,102,110,119,125,549,555,568,583`
- Modify: `app/(tabs)/novels.tsx:243,251`
- Modify: `app/(tabs)/rankings.tsx:94,172`
- Modify: `app/(tabs)/bookshelf.tsx:164,236`
- Modify: `app/novels/[id].tsx:76,96,392,653`
- Modify: `app/monthly/[ym].tsx:60,143,230,258`
- Modify: `app/booklists/[id].tsx:19,293`

**Interfaces:**
- Consumes: Tokens from Task 1, Layout from Task 1
- Produces: All app pages use `colors.*` for theme-aware styling

- [ ] **Step 1: Fix `app/_layout.tsx`**

Replace line 107: `fontSize: 13` → `fontSize: FontSize.sm` (closest in scale)
Replace line 119: `fontSize: 12` → `fontSize: FontSize.sm`

Replace lines 280-283 (restart dialog):
```
backgroundColor: "rgba(0,0,0,0.5)" → backgroundColor: colors.overlay + "80"
borderRadius: 16 → borderRadius: BorderRadius.lg
padding: 24 → padding: Spacing.xl
fontSize: 18 → fontSize: FontSize.xl
marginBottom: 12 → marginBottom: Spacing.md
fontSize: 14 → fontSize: FontSize.md
lineHeight: 20 → lineHeight: 24
marginBottom: 20 → marginBottom: Spacing.xl
```

Replace line 293 (`color: "#fff"`): **Keep hardcoded** — white on primary button.
Replace line 466: `backgroundColor: "rgba(0,0,0,0.5)"` → `backgroundColor: colors.overlay + "80"`

Replace lines 418-419:
Before: `width: 96, height: 96`
After: `width: Layout.iconXl, height: Layout.iconXl`

Replace line 481: `borderRadius: 30` → **Keep hardcoded** (not in BorderRadius scale).
Replace line 535 (`color: "#fff"`): **Keep hardcoded** — white on primary.

Add imports: `import { FontSize, Spacing, BorderRadius, Layout } from "../constants/theme";`

- [ ] **Step 2: Fix `app/search.tsx`**

Replace line 180: `backgroundColor: "#fff"` → `backgroundColor: colors.surface`
Replace line 184: `padding: 8` → `padding: Spacing.sm`
Replace line 186: `borderBottomColor: "#eee"` → `borderBottomColor: colors.border`
Replace line 191: `height: 40` → **Keep hardcoded** (not in Spacing scale)
Replace line 193: `borderColor: "#ddd"` → `borderColor: colors.border`
Replace line 194: `borderRadius: 8` → `borderRadius: BorderRadius.sm`
Replace line 196: `fontSize: 14` → `fontSize: FontSize.md`
Replace line 201: `padding: 12` → `padding: Spacing.md`
Replace line 203: `borderBottomColor: "#eee"` → `borderBottomColor: colors.border`
Replace line 210: `fontSize: 14` → `fontSize: FontSize.md`
Replace line 212: `lineHeight: 20` → `lineHeight: 24`
Replace line 215: `fontSize: 12` → `fontSize: FontSize.sm`
Replace line 216: `color: "#666"` → `color: colors.textSecondary`
Replace line 222: `color: "#999"` → `color: colors.textTertiary`
Replace line 232: `color: "#666"` → `color: colors.textSecondary`

Add imports: `import { FontSize, Spacing, BorderRadius } from "../constants/theme";`
Ensure `useTheme` is imported and `const { colors } = useTheme()` is used.

- [ ] **Step 3: Fix `app/about.tsx`**

Replace line 193: `backgroundColor: "rgba(0,0,0,0.5)"` → `backgroundColor: colors.overlay + "80"`
Replace line 337: `color="#F5A623"` → `color={colors.starGold}`
Replace line 244 (`color: "#fff"`): **Keep hardcoded** — white on primary.
Replace line 396 (`color: "#fff"`): **Keep hardcoded** — white on primary.

Replace lines 57-58: `width: 72, height: 72` → `width: Layout.iconLg, height: Layout.iconLg`
Replace lines 107-108: `width: 36, height: 36` → **Keep hardcoded** (not in Layout scale)
Replace lines 206-208: `width: 60, height: 60, borderRadius: 30` → **Keep hardcoded** (not in Layout scale)

Add import: `import { Layout } from "../constants/theme";`

- [ ] **Step 4: Fix `app/settings.tsx`**

Replace line 681: `backgroundColor: "rgba(0,0,0,0.4)"` → `backgroundColor: colors.overlay + "66"`

- [ ] **Step 5: Fix `app/(tabs)/index.tsx`**

Replace line 68: `https://forms.cloud.microsoft/r/JfeiiwEYaA` → import `SURVEY_URL` from `../../utils/urls`

Replace line 96: `backgroundColor: "rgba(0,0,0,0.35)"` → `backgroundColor: colors.overlay + "59"`
Replace line 102: `backgroundColor: "rgba(255,255,255,0.2)"` → `backgroundColor: colors.overlayLight + "33"`
Replace line 110: `color="rgba(255,255,255,0.85)"` → `color={colors.overlayLight + "D9"}`
Replace line 119: `backgroundColor: "rgba(255,255,255,0.2)"` → `backgroundColor: colors.overlayLight + "33"`
Replace line 125: `color="rgba(255,255,255,0.85)"` → `color={colors.overlayLight + "D9"}`

Replace line 549 (`color: "#fff"`): **Keep hardcoded** — white on primary.
Replace line 555: `color: "rgba(255,255,255,0.9)"` → `color={colors.overlayLight + "E6"}`
Replace line 568: `color: "rgba(255,255,255,0.85)"` → `color={colors.overlayLight + "D9"}`
Replace line 583: `boxShadow` — **Keep hardcoded** (CSS string).

Replace line 102 dimensions: `width: 96, height: 96, borderRadius: 48` → `width: Layout.iconXl, height: Layout.iconXl, borderRadius: Layout.circleMd`

Add import: `import { Layout } from "../../constants/theme";`

- [ ] **Step 6: Fix `app/(tabs)/novels.tsx`**

Replace line 243 (`color: "#fff"`): **Keep hardcoded** — white on primary.
Replace line 251: `color: "rgba(255,255,255,0.8)"` → `color={colors.overlayLight + "CC"}`

- [ ] **Step 7: Fix `app/(tabs)/rankings.tsx`**

Replace lines 94, 172 (`color: "#fff"`): **Keep hardcoded** — white on primary.

- [ ] **Step 8: Fix `app/(tabs)/bookshelf.tsx`**

Replace line 164 (`color: "#fff"`): **Keep hardcoded** — white on primary.
Replace line 236: `backgroundColor: "rgba(0,0,0,0.6)"` → `backgroundColor: colors.overlay + "99"`

- [ ] **Step 9: Fix `app/novels/[id].tsx`**

Replace line 76: `https://book.sfacg.com/Novel/${id}/` → import `novelUrl` from `../../utils/urls`
Replace line 96: Same URL → use imported `novelUrl`

Replace line 392: `color={isInBookshelf ? "#fff" : colors.primary}` → **Keep hardcoded** — white on primary button.
Replace line 653 (`color: "#fff"`): **Keep hardcoded** — white on primary.

- [ ] **Step 10: Fix `app/monthly/[ym].tsx`**

Replace line 60: `https://pages.sfacg.com/ajax/act/MonthlyBoy.ashx?...` → import `MONTHLY_API` from `../../utils/urls`

Replace lines 143, 230, 258 (`color: "#fff"`): **Keep hardcoded** — white on primary.

- [ ] **Step 11: Fix `app/booklists/[id].tsx`**

Replace line 19: `https://pages.sfacg.com/api/HttpProxy` → import `BOOKLIST_API` from `../../utils/urls`

Replace line 293 (`color: "#fff"`): **Keep hardcoded** — white on primary.

- [ ] **Step 12: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 13: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add app/
git commit -m "refactor: replace hardcoded colors/dimensions in app pages with theme tokens"
```

---

## Task 4: Centralize URLs

**Files:**
- Modify: `utils/urls.ts:1-20`
- Modify: `utils/booklistApi.ts:6`
- Modify: `app/booklists/[id].tsx:19`
- Modify: `app/novels/[id].tsx:76,96`
- Modify: `app/monthly/[ym].tsx:60`
- Modify: `app/(tabs)/index.tsx:68`

**Interfaces:**
- Produces: `BANNER_PREFIX`, `BOOKLIST_API`, `SURVEY_URL`, `MONTHLY_API`, `novelUrl(id)` exports from `utils/urls.ts`

- [ ] **Step 1: Add URL exports to `utils/urls.ts`**

Add after line 2 (after `BANNER_PREFIX`):

```ts
export const BOOKLIST_API = "https://pages.sfacg.com/api/HttpProxy";
export const SURVEY_URL = "https://forms.cloud.microsoft/r/JfeiiwEYaA";
export const MONTHLY_API = "https://pages.sfacg.com/ajax/act/MonthlyBoy.ashx";

export function novelUrl(id: number): string {
  return `https://book.sfacg.com/Novel/${id}/`;
}
```

Also export `BANNER_PREFIX` (currently not exported — used locally by `bannerUrl`). Change line 2:

Before: `const BANNER_PREFIX = ...`
After: `export const BANNER_PREFIX = ...`

- [ ] **Step 2: Update `utils/booklistApi.ts`**

Remove line 6 (local `BOOKLIST_API` declaration). Add import:
```ts
import { BOOKLIST_API } from "./urls";
```

- [ ] **Step 3: Update `app/booklists/[id].tsx`**

Remove line 19 (local `BOOKLIST_API` declaration). Add import:
```ts
import { BOOKLIST_API } from "../../utils/urls";
```

- [ ] **Step 4: Update `app/novels/[id].tsx`**

Replace lines 76, 96 (hardcoded URL). Add import:
```ts
import { novelUrl } from "../../utils/urls";
```

Replace: `https://book.sfacg.com/Novel/${id}/` → `novelUrl(id)`

- [ ] **Step 5: Update `app/monthly/[ym].tsx`**

Replace line 60 (hardcoded URL). Add import:
```ts
import { MONTHLY_API } from "../../utils/urls";
```

Replace: `https://pages.sfacg.com/ajax/act/MonthlyBoy.ashx` → `MONTHLY_API`

- [ ] **Step 6: Update `app/(tabs)/index.tsx`**

Replace line 68 (hardcoded URL). Add import:
```ts
import { SURVEY_URL } from "../../utils/urls";
```

- [ ] **Step 7: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add utils/urls.ts utils/booklistApi.ts app/booklists/ app/novels/ app/monthly/ app/(tabs)/index.tsx
git commit -m "refactor: centralize duplicated URLs in utils/urls.ts"
```

---

## Task 5: Fix Stale Docs

**Files:**
- Modify: `AGENTS.md` (line 76 area — Key Files table)

**Interfaces:**
- No code dependencies

- [ ] **Step 1: Remove `statusColors` from AGENTS.md**

Find the line in the Key Files table that lists `statusColors` for `utils/mappings.ts`. Remove `statusColors` from that cell, keeping the other exports (`genreMapping`, `statusMapping`, `ptypeMapping`, `normalizeStatus`, `formatNumber`).

- [ ] **Step 2: Commit**

```bash
git add AGENTS.md
git commit -m "docs: remove stale statusColors reference from AGENTS.md"
```

---

## Task 6: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: Run linter**

Run: `pnpm lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 4: Visual check (manual)**

Run: `pnpm run web`
- Verify light mode looks identical to before
- Verify dark mode now uses semantic colors (no white backgrounds, proper text contrast)
- Verify rank medals display correct colors
- Verify badges display correct colors

- [ ] **Step 5: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore: final cleanup after hardcode refactoring"
```
