# Hardcode Cleanup & Docs Refresh

**Date:** 2026-08-11
**Status:** Approved
**Scope:** 4 phases — theme colors, dimensions, URLs, docs

---

## Problem

The codebase has accumulated hardcoded values that bypass the theme system and constants, causing:
1. Dark mode broken in ~20+ files (hardcoded `#fff` backgrounds, `#eee` borders, `#666` text)
2. Inconsistent spacing/sizing (magic numbers like 96, 56, 40, 34 repeated without constants)
3. Duplicated URLs across files (BANNER_PREFIX in 3 places, BOOKLIST_API in 2)
4. Stale documentation (`statusColors` referenced in AGENTS.md but removed from code)

---

## Phase 1: Theme Colors

### New semantic tokens in `constants/theme.ts`

Add to both `lightColors` and `darkColors`:

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `overlay` | `#000000` | `#000000` | Modal/sheet backdrops (opacity applied inline) |
| `overlayLight` | `#FFFFFF` | `#FFFFFF` | Light overlays on colored surfaces |
| `rankGold` | `#FFD700` | `#FFD700` | Rank #1 medal |
| `rankSilver` | `#C0C0C0` | `#C0C0C0` | Rank #2 medal |
| `rankBronze` | `#CD7F32` | `#CD7F32` | Rank #3 medal |
| `starGold` | `#F5A623` | `#F5A623` | Gold star (about page) |
| `badgePtype` | `#26A69A` | `#26A69A` | Ptype badge teal color |

### Replacement rules

| Pattern | Replacement |
|---------|-------------|
| `backgroundColor: "#fff"` (surface) | `colors.surface` |
| `borderBottomColor: "#eee"` / `borderColor: "#ddd"` | `colors.border` |
| `color: "#666"` | `colors.textSecondary` |
| `color: "#999"` | `colors.textTertiary` |
| `color="#F5A623"` | `colors.starGold` |
| `RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"]` | `[colors.rankGold, colors.rankSilver, colors.rankBronze]` |
| `"#26A69A"` / `"#26A69A15"` / `"#26A69A30"` in Badge | `colors.badgePtype` + alpha suffixes |
| `rgba(0,0,0,0.4-0.6)` overlays | `colors.overlay` + inline opacity |
| `rgba(255,255,255,0.2)` light overlays | `colors.overlayLight` + inline opacity |
| `color: "#fff"` on colored surface | **Keep hardcoded** (correct in both themes) |

### Files affected (~30)

- `app/_layout.tsx`, `app/search.tsx`, `app/about.tsx`, `app/settings.tsx`
- `app/(tabs)/index.tsx`, `app/(tabs)/novels.tsx`, `app/(tabs)/rankings.tsx`, `app/(tabs)/bookshelf.tsx`
- `app/novels/[id].tsx`, `app/monthly/[ym].tsx`, `app/booklists/[id].tsx`
- `components/Badge.tsx`, `components/NovelRow.tsx`, `components/Banner.tsx`
- `components/BannerListItem.tsx`, `components/IndexBannerItem.tsx`
- `components/ConfirmDialog.tsx`, `components/ImageLightbox.tsx`
- `components/NovelFilterSheet.tsx`, `components/InfoSheet.tsx`
- `components/BackToTop.tsx`

### What stays hardcoded

- `color: "#fff"` on primary/accent colored surfaces (white text is correct in both themes)
- `rgba` values used in `boxShadow` CSS strings (cannot use JS variables in CSS strings on RN)

---

## Phase 2: Dimension Hardcodes

### New constants in `constants/theme.ts`

```ts
export const Layout = {
  iconSm: 34,    // Small icon containers (TabHeader avatar)
  iconMd: 56,    // Medium icon containers (ConfirmDialog icon)
  iconLg: 72,    // Large icon containers (about page icon)
  iconXl: 96,    // XL icon containers (Banner, index hero)
  circleSm: 28,  // Small circle radius
  circleMd: 48,  // Medium circle radius
};
```

### Replacement rules

| Raw value | Replacement | Where |
|-----------|-------------|-------|
| `borderRadius: 16` | `BorderRadius.lg` | `_layout.tsx` |
| `padding: 24` | `Spacing.xl` | `_layout.tsx` |
| `fontSize: 18` | `FontSize.xl` | `_layout.tsx` |
| `fontSize: 14` | `FontSize.md` | Multiple files |
| `fontSize: 12` | `FontSize.sm` | Multiple files |
| `fontSize: 10` | `FontSize.xs` | Multiple files |
| `marginBottom: 12` | `Spacing.md` | Multiple files |
| `marginBottom: 20` | `Spacing.xl` | Multiple files |
| `width: 96, height: 96` | `Layout.iconXl` | Banner, index |
| `width: 72, height: 72` | `Layout.iconLg` | about.tsx |
| `width: 56, height: 56` | `Layout.iconMd` | ConfirmDialog |
| `width: 34, height: 34` | `Layout.iconSm` | TabHeader |
| `borderRadius: 20` | `BorderRadius.xl` | Multiple circular elements |
| `borderRadius: 30` | Keep hardcoded (not in BorderRadius scale) | |

### What stays hardcoded

- Values below `Spacing.xs` (4px) — too small for the scale
- `40px` button heights — not worth a new constant
- `lineHeight` values — tied to specific font sizes, not worth abstracting
- `borderRadius: 30` — exceeds `BorderRadius.xl`, adding a new tier for one use is not justified

---

## Phase 3: URL Centralization

### All URLs move to `utils/urls.ts`

| Export | Value | Currently in |
|--------|-------|--------------|
| `BANNER_PREFIX` | `https://rs.sfacg.com/web/novel/images/images/beitouNew/` | BannerListItem, IndexBannerItem, urls.ts (3 dupes) |
| `BOOKLIST_API` | `https://pages.sfacg.com/api/HttpProxy` | booklistApi.ts, booklists/[id].tsx (2 dupes) |
| `SURVEY_URL` | `https://forms.cloud.microsoft/r/JfeiiwEYaA` | index.tsx (inline) |
| `MONTHLY_API` | `https://pages.sfacg.com/ajax/act/MonthlyBoy.ashx` | monthly/[ym].tsx (inline) |
| `NOVEL_URL` (fn) | `(id) => \`https://book.sfacg.com/Novel/${id}/\`` | novels/[id].tsx (2 places) |

### Files affected (~6)

- `utils/urls.ts` — add new exports
- `components/BannerListItem.tsx` — import from urls.ts
- `components/IndexBannerItem.tsx` — import from urls.ts
- `utils/booklistApi.ts` — import from urls.ts
- `app/booklists/[id].tsx` — import from urls.ts
- `app/(tabs)/index.tsx` — import SURVEY_URL
- `app/monthly/[ym].tsx` — import MONTHLY_API
- `app/novels/[id].tsx` — import NOVEL_URL

---

## Phase 4: Docs Fix

### Change

- `AGENTS.md` line 76: Remove `statusColors` from the Key Files table row for `utils/mappings.ts`

### No other doc changes needed

All other file paths, API references, and commands in AGENTS.md and docs/*.md are accurate.

---

## Testing

After each phase:
1. `npx tsc --noEmit` — must pass
2. `pnpm test` — must pass
3. Manual: verify light mode looks identical (no visual regression)
4. Manual: verify dark mode uses new semantic colors properly
