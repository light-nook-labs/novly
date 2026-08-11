# App Initialization UX — Quick Wins

**Date:** 2026-08-11
**Status:** Approved
**Scope:** 4 quick wins to improve first-launch experience

---

## Problem

First-time app initialization has several UX pain points:
1. **3-10+ second loading screen** on first launch (hot chunk decompression)
2. **3-second minimum wait** enforced even if decompression is fast
3. **Restart required** after cold merge — user must tap to restart
4. **Welcome modal** interrupts 2 seconds after app loads

Users hate waiting. The current flow feels sluggish and requires unnecessary user interaction.

---

## Design

### 1. Remove 3-Second Minimum Wait

**Current** (`app/_layout.tsx:329-331`):
```ts
const elapsed = Date.now() - start;
const wait = Math.max(0, 3000 - elapsed);
setTimeout(() => setReady(true), wait);
```

**Proposed:** Remove the artificial wait. Show app as soon as database is ready:
```ts
setReady(true);
```

**Impact:** First launch drops from 3-10s to actual decompression time (~2-4s).

### 2. Improve Progress UX

**Current progress messages** (from `utils/database.ts`):
- "正在初始化数据 0%..." → "正在初始化数据 100%..."
- "正在解压冷数据 1/3..." → "正在合并冷数据 3/3..."
- "正在创建索引..."

**Proposed improvements:**

1. **Hot decompression phase:**
   - Show file size being processed
   - Show decompression speed (MB/s)
   - Show estimated time remaining

2. **Cold merge phase:**
   - Show which chunk is being processed (1/3, 2/3, 3/3)
   - Show merge progress per chunk
   - Show total progress across all chunks

3. **Visual improvements:**
   - Progress bar with percentage
   - Animated transitions between phases
   - Success checkmark when complete

**Files to modify:**
- `utils/database.ts` — update `setInitProgress` calls with more detailed messages
- `app/_layout.tsx` — enhance progress display in `LoadingScreen`

### 3. Auto-Restart After Cold Merge

**Current behavior:**
1. Cold merge completes
2. `emitColdMerged()` is called
3. Modal appears: "数据已更新 — 数据库已加载完整数据,请重启应用以查看最新内容。"
4. User must tap "重启应用" button
5. `appKey` increments, app re-mounts

**Proposed:** Auto-restart without user interaction.

**Implementation:**
1. Subscribe to `coldMerged` event in `RootLayout`
2. When event fires, show a brief toast: "数据已更新,正在刷新..." (2 seconds)
3. Auto-increment `appKey` to re-mount app
4. No modal, no user action required

**Trade-off:** User loses scroll position / navigation state. Acceptable for a one-time first-launch event.

**Files to modify:**
- `app/_layout.tsx` — subscribe to `coldMerged`, auto-increment `appKey`
- `app/_layout.tsx` — replace modal with toast notification

### 4. Delay Welcome Modal to Second Launch

**Current behavior** (`app/_layout.tsx:336-346`):
1. App becomes ready
2. 2-second delay
3. Check `AsyncStorage` for `"welcome_shown_v1"`
4. If not found, show QQ group invitation modal

**Problem:** On first launch, user already waited 3-10+ seconds. Then immediately gets hit with a modal. Feels intrusive.

**Proposed:** Show welcome modal on **second** launch instead of first.

**Implementation:**
1. On first launch, after cold merge completes and auto-restart happens, set `"welcome_shown_v1"` flag
2. On second launch (fast, since DB is merged), show the welcome modal
3. User has already experienced the app and is more receptive

---

## Constraints

From `docs/pitfalls.md`:
- **#12:** Cold merge must use separate file paths (avoid "database locked")
- **#13:** Decompression must yield to event loop (256KB chunks, setTimeout every 1MB)
- **#14:** Stale res/raw assets can bloat APK
- **#15:** Infinite lists need ref locks (not state guards)

From Android memory constraints:
- Android won't allocate 60MB at once
- Current streaming approach (256KB chunks, file-based merge) is correct
- No changes to decompression logic needed

---

## Testing

After implementation:
1. `npx tsc --noEmit` — must pass
2. `pnpm test` — must pass
3. Manual: First launch shows progress, no 3-second wait
4. Manual: Cold merge auto-restarts without user action
5. Manual: Welcome modal appears on second launch, not first
6. Manual: Subsequent launches are fast (no cold merge)
