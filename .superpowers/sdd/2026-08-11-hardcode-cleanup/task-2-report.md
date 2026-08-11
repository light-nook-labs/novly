# Task 2: Replace Hardcoded Colors in Components

## Changes Applied

| File | Change | Status |
|------|--------|--------|
| `Badge.tsx` | ptype badge uses `colors.badgePtype` | Already done |
| `NovelRow.tsx` | RANK_COLORS uses `colors.rankGold/Silver/Bronze` | Already done |
| `ConfirmDialog.tsx` | Backdrop → inline `colors.overlay + "66"`; icon dimensions → `Layout.iconMd`/`Layout.circleSm` | Done |
| `ImageLightbox.tsx` | Added `useTheme`; overlay → `colors.overlay + "FA"`; buttons → `colors.overlayLight + "33"` | Done |
| `NovelFilterSheet.tsx` | Backdrop → inline `colors.overlay + "66"` | Done |
| `InfoSheet.tsx` | Backdrop → inline `colors.overlay + "66"` | Done |
| `BannerListItem.tsx` | Removed local `BANNER_PREFIX`, imported from `utils/urls`; lightbox → `colors.overlay + "FA"` / `colors.overlayLight + "33"` | Done |
| `IndexBannerItem.tsx` | Removed local `BANNER_PREFIX`, imported from `utils/urls`; textShadowColor → `colors.overlay + "80"` | Done |
| `Banner.tsx` | WelcomeCard overlay → `colors.overlay + "59"` (was rgba(0,0,0,0.35)) | Done |
| `TabHeader.tsx` | Icon dimensions → `Layout.iconSm` / `BorderRadius.sm` | Done |

## Supporting Change

- `utils/urls.ts`: Exported `BANNER_PREFIX` (was local `const`)

## Verification

- `npx tsc --noEmit`: Pass (no errors)
- `pnpm test`: 12 suites, 65 tests passed
