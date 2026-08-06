# Theming (COMPLETE — all pages & components support light/dark)

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
