# App Initialization UX — Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve first-launch initialization UX by removing artificial waits, improving progress feedback, auto-restarting after cold merge, and delaying the welcome modal.

**Architecture:** Four focused changes to `app/_layout.tsx` and `utils/database.ts`. No new files needed. All changes are backward-compatible and don't affect the core database logic.

**Tech Stack:** React Native / Expo SDK 57, TypeScript, expo-router

## Global Constraints

- Run `npx tsc --noEmit` after each task — must pass
- Run `pnpm test` after each task — must pass
- Follow existing code style (no new comments unless asked)
- Do not modify the core decompression/merge logic (pitfalls #12, #13 apply)
- Android memory constraint: no in-memory database operations

---

## File Structure

| File | Responsibility | Changes |
|------|---------------|---------|
| `app/_layout.tsx` | Root layout, loading screen, welcome modal | Remove 3s wait, auto-restart, delay welcome |
| `utils/database.ts` | Database init, progress reporting | Improve progress messages |

---

## Task 1: Remove 3-Second Minimum Wait

**Files:**
- Modify: `app/_layout.tsx:329-331`

**Interfaces:**
- Consumes: `isFirstInit` from `utils/database.ts`
- Produces: None (UI behavior change only)

- [ ] **Step 1: Remove the artificial wait**

In `app/_layout.tsx`, find the `useEffect` that calls `initDatabase` (around line 318).

Replace lines 329-331:
```ts
const elapsed = Date.now() - start;
const wait = Math.max(0, 3000 - elapsed);
setTimeout(() => setReady(true), wait);
```

With:
```ts
setReady(true);
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: remove 3-second minimum wait on first launch"
```

---

## Task 2: Improve Progress Messages

**Files:**
- Modify: `utils/database.ts` (multiple `setInitProgress` calls)
- Modify: `app/_layout.tsx` (progress display in `LoadingScreen`)

**Interfaces:**
- Consumes: `initProgress` string from `utils/database.ts`
- Produces: More detailed progress messages

- [ ] **Step 1: Update hot decompression progress messages**

In `utils/database.ts`, update the `setInitProgress` calls in `decompressAndWriteChunk` function.

Replace:
```ts
setInitProgress(`正在初始化数据 ${pct(0)}%...`);
```

With:
```ts
setInitProgress(`正在初始化数据库...`);
```

Replace:
```ts
setInitProgress(`正在初始化数据 ${pct(0.3)}%...`);
```

With:
```ts
setInitProgress(`正在读取数据文件...`);
```

Replace:
```ts
setInitProgress(`正在初始化数据 ${pct(0.5)}%...`);
```

With:
```ts
setInitProgress(`正在解压数据...`);
```

Replace:
```ts
setInitProgress(`正在初始化数据 ${pct(0.75)}%...`);
```

With:
```ts
setInitProgress(`正在写入数据库...`);
```

- [ ] **Step 2: Update cold merge progress messages**

In `utils/database.ts`, update the `setInitProgress` calls in `mergeColdInBackground` function.

Replace:
```ts
setInitProgress(`正在解压冷数据 ${i + 1}/3...`);
```

With:
```ts
setInitProgress(`正在解压数据 (${i + 1}/3)...`);
```

Replace:
```ts
setInitProgress(`正在合并冷数据 ${i + 1}/3...`);
```

With:
```ts
setInitProgress(`正在合并数据 (${i + 1}/3)...`);
```

Replace:
```ts
setInitProgress("正在合并热数据...");
```
Keep as is (already clear).

Replace:
```ts
setInitProgress("正在创建索引...");
```
Keep as is (already clear).

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add utils/database.ts
git commit -m "feat: improve init progress messages for better UX"
```

---

## Task 3: Auto-Restart After Cold Merge

**Files:**
- Modify: `app/_layout.tsx` (subscribe to `coldMerged` event, remove restart modal)

**Interfaces:**
- Consumes: `subscribeColdMerged` from `utils/database.ts`
- Produces: Auto-restart behavior

- [ ] **Step 1: Import `subscribeColdMerged`**

In `app/_layout.tsx`, add `subscribeColdMerged` to the import from `../utils/database`:
```ts
import { initDatabase, isFirstInit, subscribeColdMerged } from "../utils/database";
```

- [ ] **Step 2: Subscribe to `coldMerged` event in `RootLayout`**

In `RootLayout` component, add a new `useEffect` after the existing ones:
```ts
useEffect(() => {
  if (!ready) return;
  return subscribeColdMerged(() => {
    Toast.show({
      type: "info",
      text1: "数据已更新",
      text2: "正在刷新...",
      position: "bottom",
      visibilityTime: 2000,
    });
    setTimeout(() => setAppKey((k) => k + 1), 2000);
  });
}, [ready]);
```

- [ ] **Step 3: Remove the restart modal**

In `app/_layout.tsx`, find and remove the `RestartModal` component and its usage. The restart functionality is now handled by the `coldMerged` subscription above.

Remove the `useState` for `showRestart`:
```ts
const [showRestart, setShowRestart] = useState(false);
```

Remove the `useEffect` that subscribes to `coldMerged` and sets `showRestart`:
```ts
useEffect(() => {
  return subscribeColdMerged(() => setShowRestart(true));
}, []);
```

Remove the `RestartModal` component definition (around lines 279-297).

Remove the `RestartModal` usage in JSX:
```ts
<RestartModal visible={showRestart} onRestart={onRestart} />
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: auto-restart after cold merge, remove restart modal"
```

---

## Task 4: Delay Welcome Modal to Second Launch

**Files:**
- Modify: `app/_layout.tsx` (welcome modal logic)

**Interfaces:**
- Consumes: `AsyncStorage` for `WELCOME_SHOWN_KEY`
- Produces: Welcome modal shown on second launch only

- [ ] **Step 1: Set welcome flag on first launch after cold merge**

In `app/_layout.tsx`, inside the `coldMerged` subscription we added in Task 3, set the welcome flag:

```ts
useEffect(() => {
  if (!ready) return;
  return subscribeColdMerged(() => {
    Toast.show({
      type: "info",
      text1: "数据已更新",
      text2: "正在刷新...",
      position: "bottom",
      visibilityTime: 2000,
    });
    // Set welcome flag so it shows on next launch
    AsyncStorage.setItem(WELCOME_SHOWN_KEY, "1").catch(() => {});
    setTimeout(() => setAppKey((k) => k + 1), 2000);
  });
}, [ready]);
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: delay welcome modal to second launch"
```

---

## Task 5: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 3: Visual check (manual)**

Run: `pnpm run web`
- Verify first launch shows progress without 3-second wait
- Verify cold merge auto-restarts (toast appears, app refreshes)
- Verify welcome modal does NOT appear on first launch
- Verify welcome modal appears on second launch
- Verify subsequent launches are fast (no cold merge)

- [ ] **Step 4: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore: final verification after init UX improvements"
```
