# Novly

> Offline-first novel metadata browser — React Native / Expo implementation

> **🌐 Language**: English | [简体中文](./README.md)

Novly is an offline-first light-novel metadata browsing app: all data is bundled locally (SQLite), so the full novel metadata library (genres, statuses, contests, tags, rankings, authors, etc.) is browsable without any network, with one-tap deep links to SFACG for reading the originals.

**Data source**: [light-nook-labs/novel_hub](https://github.com/light-nook-labs/novel_hub) (upstream data repository; `assets/seed.sql.gz` is generated from it)

**Sibling project**: [NovelHubMobile (Flutter version)](https://github.com/light-nook-labs/NovelHubMobile)

## Features

- 📦 **Offline-first**: novel metadata is bundled (`seed.sql.gz` → SQLite), fully usable offline
- 🏷️ **Full library browsing**: browse & filter by genre, status, contest and tags; ptype (Free/Signed/VIP) filtering
- 🔍 **Instant search**: global search by title, author or novel ID with infinite scroll
- 🏆 **Multi-dimension rankings**: clicks, word count, favorites, praises, long reviews, short reviews
- 🔖 **Local bookshelf**: stored in a separate local database (`bookshelf.sqlite`) as private user data — global data resets don't touch it
- 🌗 **SFACG deep links**: open the original in the SFACG app / browser; Web share via SFACG URL
- 🎨 **Theme switching**: System / Light / Dark color schemes, applied app-wide in real time
- 🖼️ **Banner gallery**: browse and full-screen preview novel banner images
- 🌐 **Cross-platform**: Web / Android / iOS

## Screenshots

> The following screenshots showcase Novly's core features: home carousel & navigation, banner gallery, multi-dimension rankings, novel detail, theme switching (dark/light) and the about page.

| Page | Dark mode | Light mode |
| --- | --- | --- |
| Home | <img src="screenshots/home.png" width="220" /> | <img src="screenshots/home-light.png" width="220" /> |
| Banners | <img src="screenshots/banners.png" width="220" /> | <img src="screenshots/banners-light.png" width="220" /> |
| Rankings | <img src="screenshots/rank.png" width="220" /> | <img src="screenshots/rank-light.png" width="220" /> |
| Novel detail | <img src="screenshots/detail.png" width="220" /> | <img src="screenshots/detail-light.png" width="220" /> |
| Settings | <img src="screenshots/settings.png" width="220" /> | <img src="screenshots/settings-light.png" width="220" /> |
| About | <img src="screenshots/about.png" width="220" /> | <img src="screenshots/about-light.png" width="220" /> |

## Tech Stack

| Category        | Technology                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Framework       | [React Native](https://reactnative.dev) + [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) |
| Routing         | expo-router                                                                                    |
| Language        | TypeScript                                                                                     |
| Database        | expo-sqlite (global data + local bookshelf db)                                                 |
| Persistence     | AsyncStorage (theme preference, list caches)                                                   |
| Package manager | pnpm                                                                                           |

## Desktop App (Windows)

Novly can be packaged as a Windows desktop app (Tauri v2), same source as the Web version, offline-first.

### Build

```bash
pnpm tauri build
```

Output: `src-tauri/target/release/bundle/nsis/Novly_1.0.0_x64-setup.exe`

### Install behavior

- Custom install directory supported
- Default directory: `D:\novly` (falls back to `C:\Program Files\Novly` if no D: drive)
- Auto-creates directories, includes uninstaller

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Start the dev server (pick a platform)
pnpm start          # interactive
pnpm run web        # Web
pnpm run android    # Android
pnpm run ios        # iOS
```

On first launch, `assets/seed.sql.gz` is automatically decompressed to initialize the database.

> ⚠️ **Expo SDK has changed**: read the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code — don't rely on outdated API memory.

## Project Structure

```
novim/
├── app/                      # expo-router routes (pages)
│   ├── (tabs)/               # bottom tabs: Home/Novels/Banners/Rankings/Bookshelf
│   │   ├── index.tsx         #   home (banner + nav grid + top rankings)
│   │   ├── novels.tsx        #   novel list (search + filter sheet)
│   │   ├── banners.tsx       #   banner gallery
│   │   ├── rankings.tsx      #   multi-dimension rankings
│   │   └── bookshelf.tsx     #   bookshelf (grid layout)
│   ├── novel/[id].tsx        # novel detail (share / bookshelf / SFACG link)
│   ├── author/[id].tsx       # author detail
│   ├── tag/[id].tsx          # tag detail
│   ├── contest/[id].tsx      # contest detail
│   ├── genre/[id].tsx        # genre detail
│   ├── status/[id].tsx       # status detail
│   ├── authors.tsx           # author list
│   ├── tags.tsx              # tag list
│   ├── contests.tsx          # contest list
│   ├── genres.tsx            # genre list
│   ├── statuses.tsx          # status list
│   ├── search.tsx            # global search
│   ├── search/banners.tsx    # banner search
│   └── settings.tsx          # settings (theme / dangerous area / about)
├── components/               # shared components
│   ├── ThemeProvider.tsx     #   theme system (system/light/dark)
│   ├── Header.tsx            #   PageHeader (back / search / right actions)
│   ├── TabHeader.tsx         #   tab header (logo + search + right)
│   ├── NovelRow.tsx          #   novel row (cover + badges + rank)
│   ├── Banner*.tsx           #   carousel / banner components
│   ├── NovelFilterSheet.tsx  #   filter bottom sheet
│   ├── ConfirmDialog.tsx     #   dangerous-action confirm dialog
│   ├── AppInfoSheet.tsx      #   about info sheet
│   └── ...
├── hooks/                    # custom hooks (useNovels, useScrollToTop)
├── utils/                    # utility layer
│   ├── database.ts           #   global database (init / seed decompress)
│   ├── bookshelfDb.ts        #   bookshelf local database
│   ├── mappings.ts           #   genre/status/ptype mappings & formatting
│   └── urls.ts               #   cover / banner URL helpers
├── constants/theme.ts        # color schemes (light/dark) + size constants
└── assets/                   # icons, seed.sql.gz
```

## For Developers

The full development guide lives in **[AGENTS.md](./AGENTS.md)**, covering:

- The theming pattern (`useTheme` + in-component `useMemo` dynamic styles / `createStyles(colors)`)
- Data-layer conventions (global db vs bookshelf local db, pagination, status normalization)
- Known pitfalls and fixed bugs (to prevent regressions)
- Key-file quick reference

## Contributing

- Found a bug or have an idea? Open an [Issue](https://github.com/light-nook-labs/novly/issues)
- Pull requests are welcome: fork → branch → commit → [PR](https://github.com/light-nook-labs/novly/pulls)
- Run `npx tsc --noEmit` before submitting to make sure type checks pass

## License

[MIT](./LICENSE) © light-nook-labs

---

*This project was developed with the assistance of OpenCode & AtomCode AI.*
