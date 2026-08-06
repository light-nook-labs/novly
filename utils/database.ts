import * as SQLite from "expo-sqlite";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pako = require("pako");
import { getSeedAsset } from "./seedLoader";

let currentDb: SQLite.SQLiteDatabase | null = null;
// 初始化 promise 缓存:防止多个页面并发 getDatabase() 导致重复初始化(重复解压/合并)
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const DB_NAME = "novel_hub_v3.sqlite";
// seed 数据版本(web 端用 PRAGMA user_version 对比;seed 数据更新时 +1,强制浏览器重载新数据)
const SEED_VERSION = 3;
// 冷合并并发锁:自动触发与手动触发共用,防止 hotwarm 被重复 ATTACH
let coldMergeRunning = false;
// cold 压缩数据预加载缓存(准备阶段在初始化 Loading 期间完成,避免渲染后卡死交互)
let coldCompressed: Uint8Array | null = null;
const MERGED_MARKER = ".db_merged_v5";
const SQLITE_SUBDIR = "SQLite";

// 初始化进度(供 header 显示):null = 未在初始化 / 已完成
export let initProgress: string | null = null;
const initProgressListeners = new Set<(p: string | null) => void>();

export function subscribeInitProgress(cb: (p: string | null) => void): () => void {
  initProgressListeners.add(cb);
  return () => {
    initProgressListeners.delete(cb);
  };
}

export function setInitProgress(p: string | null) {
  initProgress = p;
  initProgressListeners.forEach((cb) => cb(p));
}

// 数据库就绪事件:cold 合并完成(全量库就位)后通知,供页面刷新数据
const dbReadyListeners = new Set<() => void>();

// cold 合并完成(全量库就位)后通知,提示重启应用
const coldMergedListeners = new Set<() => void>();
export function subscribeColdMerged(cb: () => void): () => void {
  coldMergedListeners.add(cb);
  return () => {
    coldMergedListeners.delete(cb);
  };
}
function emitColdMerged() {
  coldMergedListeners.forEach((cb) => cb());
}

export function subscribeDbReady(cb: () => void): () => void {
  dbReadyListeners.add(cb);
  return () => {
    dbReadyListeners.delete(cb);
  };
}

function emitDbReady() {
  dbReadyListeners.forEach((cb) => cb());
}

export let dbLogs: string[] = [];
// 本次进程是否发生了首次初始化(需解压 hot+warm);快速路径(库已就绪)为 false
export let isFirstInit = false;
export function dbLog(message: string) {
  dbLogs.push(message);
  if (dbLogs.length > 30) dbLogs.shift();
  // 日志带毫秒时间戳,便于精确定位各阶段耗时与性能瓶颈
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
  console.log(`[db ${ts}] ${message}`);
}

function toFsPath(uri: string): string {
  return uri.replace(/^file:\/\//, "");
}

let FileSystem: any;
async function getFS() {
  if (!FileSystem) {
    FileSystem = await import("expo-file-system/legacy");
  }
  return FileSystem;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array, onProgress?: (ratio: number) => void): string {
  // 分块 base64 编码:逐字节拼接大数组极慢,按 32766(3 的倍数)分块 btoa 提速
  const CHUNK = 0x7ffe; // 32766,3 的倍数:每块 btoa 无 padding,拼接后整体合法 base64
  let result = "";
  const total = bytes.length;
  for (let i = 0; i < total; i += CHUNK) {
    const chunk = bytes.subarray(i, i + CHUNK);
    let bin = "";
    for (let j = 0; j < chunk.length; j++) {
      bin += String.fromCharCode(chunk[j]);
    }
    result += btoa(bin);
    // 进度回调:每 5% 更新一次,让进度条平滑移动(解压阶段不再是固定断点)
    if (onProgress && (i / total > 0.05 || i + CHUNK >= total)) {
      onProgress(i / total);
    }
  }
  return result;
}

async function decompressAsset(module: number): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const assets = await Asset.loadAsync(module);
    const asset = assets[0];
    if (!asset.uri) throw new Error("Asset not loaded");
    const response = await fetch(asset.uri);
    const buf = await response.arrayBuffer();
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    writer.write(buf);
    writer.close();
    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  const FS = await getFS();
  const assets = await Asset.loadAsync(module);
  const asset = assets[0];
  if (!asset.localUri) throw new Error("Asset not downloaded");
  const base64 = await FS.readAsStringAsync(asset.localUri, {
    encoding: FS.EncodingType.Base64,
  });
  return pako.inflate(base64ToUint8Array(base64));
}

async function decompressAndWriteChunk(
  module: number,
  targetPath: string,
  startPct: number = 0,
  endPct: number = 100,
  preloadedAsset?: { localUri: string | null },
): Promise<void> {
  const FS = await getFS();
  const name = targetPath.split("/").pop();
  const pct = (p: number) => Math.floor(startPct + (endPct - startPct) * p);
  const t0 = Date.now();
  dbLog(`${name}: start`);

  setInitProgress(`正在初始化数据 ${pct(0)}%...`);

  let localUri: string;
  const t1 = Date.now();
  if (preloadedAsset?.localUri) {
    localUri = preloadedAsset.localUri;
    dbLog(`${name}: load=${Date.now() - t0}ms (cached)`);
  } else {
    const assets = await Asset.loadAsync(module);
    const asset = assets[0];
    if (!asset.localUri) throw new Error("Asset not loaded");
    localUri = asset.localUri;
    dbLog(`${name}: load=${Date.now() - t0}ms`);
  }

  setInitProgress(`正在初始化数据 ${pct(0.3)}%...`);

  const base64Data = await FS.readAsStringAsync(localUri, {
    encoding: FS.EncodingType.Base64,
  });
  const compressed = base64ToUint8Array(base64Data);
  const t2 = Date.now();
  dbLog(`${name}: ${(compressed.length / 1024 / 1024).toFixed(1)} MB compressed`);
  dbLog(`${name}: read=${t2 - t1}ms total=${t2 - t0}ms`);
  setInitProgress(`正在初始化数据 ${pct(0.5)}%...`);

  const inf = new pako.Inflate({ chunkSize: 1024 * 1024 });
  const SLICE = 2 * 1024 * 1024;
  const totalSlices = Math.ceil(compressed.length / SLICE);
  let sliceIdx = 0;
  for (let i = 0; i < compressed.length; i += SLICE) {
    inf.push(compressed.subarray(i, Math.min(i + SLICE, compressed.length)), false);
    sliceIdx++;
    const decompressProgress = 0.5 + 0.25 * (sliceIdx / totalSlices);
    setInitProgress(`正在初始化数据 ${pct(decompressProgress)}%...`);
    await new Promise((r) => setTimeout(r, 0));
  }
  inf.push(new Uint8Array(0), true);
  const decompressed: Uint8Array = inf.result;
  if (!decompressed || decompressed.length === 0) {
    throw new Error(`Decompress produced no output for ${name}`);
  }
  const t3 = Date.now();
  dbLog(`${name}: ${(decompressed.length / 1024 / 1024).toFixed(1)} MB decompressed`);
  dbLog(`${name}: decompress=${t3 - t2}ms total=${t3 - t0}ms`);
  setInitProgress(`正在初始化数据 ${pct(0.75)}%...`);

  const WRITE_CHUNK = 2 * 1024 * 1024;
  let isFirst = true;
  for (let off = 0; off < decompressed.length; off += WRITE_CHUNK) {
    const part = decompressed.subarray(off, Math.min(off + WRITE_CHUNK, decompressed.length));
    const b64 = uint8ArrayToBase64(part);
    if (isFirst) {
      await FS.writeAsStringAsync(targetPath, b64, { encoding: FS.EncodingType.Base64 });
      isFirst = false;
    } else {
      await FS.writeAsStringAsync(targetPath, b64, { encoding: FS.EncodingType.Base64, append: true });
    }
  }
  const t4 = Date.now();
  dbLog(`${name}: write=${t4 - t3}ms total=${t4 - t0}ms`);
  dbLog(`${name}: written`);
}

async function decompressAndWriteChunkStreaming(
  module: number,
  targetPath: string,
  preloaded?: Uint8Array,
): Promise<void> {
  const FS = await getFS();
  const name = targetPath.split("/").pop();
  dbLog(`${name}: start`);

  let compressed: Uint8Array;
  if (preloaded) {
    compressed = preloaded;
  } else {
    const assets = await Asset.loadAsync(module);
    const asset = assets[0];
    if (!asset.localUri) throw new Error("Asset not loaded");
    const base64Data = await FS.readAsStringAsync(asset.localUri, {
      encoding: FS.EncodingType.Base64,
    });
    compressed = base64ToUint8Array(base64Data);
  }
  dbLog(`${name}: ${(compressed.length / 1024 / 1024).toFixed(1)} MB compressed`);

  // 流式解压:分块 push + yield 让出 JS 线程
  const inf = new pako.Inflate({ chunkSize: 1024 * 1024 });
  const PUSH_SIZE = 256 * 1024; // 256KB per push
  for (let i = 0; i < compressed.length; i += PUSH_SIZE) {
    inf.push(compressed.subarray(i, Math.min(i + PUSH_SIZE, compressed.length)), false);
    if (i % (1024 * 1024) === 0) await new Promise((r) => setTimeout(r, 0)); // 每 1MB yield
  }
  inf.push(new Uint8Array(0), true);
  const decompressed: Uint8Array = inf.result;
  if (!decompressed || decompressed.length === 0) {
    throw new Error(`Decompress produced no output for ${name}`);
  }
  dbLog(`${name}: ${(decompressed.length / 1024 / 1024).toFixed(1)} MB decompressed`);

  // 分块写入 + yield
  const WRITE_CHUNK = 2 * 1024 * 1024;
  let isFirst = true;
  let written = 0;
  for (let off = 0; off < decompressed.length; off += WRITE_CHUNK) {
    const part = decompressed.subarray(off, Math.min(off + WRITE_CHUNK, decompressed.length));
    const b64 = uint8ArrayToBase64(part);
    if (isFirst) {
      await FS.writeAsStringAsync(targetPath, b64, { encoding: FS.EncodingType.Base64 });
      isFirst = false;
    } else {
      await FS.writeAsStringAsync(targetPath, b64, { encoding: FS.EncodingType.Base64, append: true });
    }
    written += part.length;
    await new Promise((r) => setTimeout(r, 0)); // 每次写完让出
  }
  dbLog(`${name}: written ${(written / 1024 / 1024).toFixed(1)} MB`);
}

async function mergeChunkIntoDb(
  targetDb: SQLite.SQLiteDatabase,
  alias: string,
  chunkPath: string,
  startPct: number = 75,
  endPct: number = 100,
): Promise<void> {
  const fsPath = toFsPath(chunkPath);
  const t0 = Date.now();
  dbLog(`ATTACH ${alias} -> ${fsPath}`);
  await targetDb.execAsync(`PRAGMA busy_timeout = 60000`);
  await targetDb.execAsync(`ATTACH '${fsPath}' AS ${alias}`);
  dbLog(`ATTACH done: ${Date.now() - t0}ms`);

  dbLog(`Merging novels from ${alias}...`);
  const t1 = Date.now();
  const { maxId } = await targetDb.getFirstAsync<{ maxId: number }>(
    `SELECT COALESCE(MAX(id), 0) as maxId FROM ${alias}.novels`,
  );
  dbLog(`novels maxId=${maxId} query: ${Date.now() - t1}ms`);
  const t1b = Date.now();
  const BATCH = 5000; // 更小的批次,更频繁 yield
  for (let start = 0; start <= maxId; start += BATCH) {
    await targetDb.execAsync(
      `INSERT OR REPLACE INTO novels SELECT * FROM ${alias}.novels WHERE id > ${start} AND id <= ${start + BATCH}`,
    );
    if (maxId > 0) {
      const overall = Math.min(Math.floor(startPct + ((endPct - startPct) * start) / maxId), endPct - 1);
      setInitProgress(`正在初始化数据 ${overall}%...`);
    }
    await new Promise((r) => setTimeout(r, 0)); // 每批 yield
  }
  dbLog(`novels batch insert: ${Date.now() - t1b}ms`);

  dbLog(`Merging contests from ${alias}...`);
  const t2 = Date.now();
  await targetDb.execAsync(`INSERT OR IGNORE INTO contests (name) SELECT name FROM ${alias}.contests`);
  dbLog(`contests insert: ${Date.now() - t2}ms`);
  await new Promise((r) => setTimeout(r, 0));
  const t2b = Date.now();
  await targetDb.execAsync(`
    UPDATE novels SET contest_id = (
      SELECT t.id FROM contests t JOIN ${alias}.contests a ON t.name = a.name
      WHERE a.id = novels.contest_id
    )
    WHERE contest_id IN (SELECT id FROM ${alias}.contests)
  `);
  dbLog(`contests update: ${Date.now() - t2b}ms`);
  await new Promise((r) => setTimeout(r, 0));

  dbLog(`Merging tags from ${alias}...`);
  const t3 = Date.now();
  await targetDb.execAsync(`INSERT OR IGNORE INTO tags (name) SELECT name FROM ${alias}.tags`);
  dbLog(`tags insert: ${Date.now() - t3}ms`);
  await new Promise((r) => setTimeout(r, 0));
  const t3b = Date.now();
  await targetDb.execAsync(`
    INSERT OR IGNORE INTO novel_tags (novel_id, tag_id)
    SELECT nt.novel_id, t.id
    FROM ${alias}.novel_tags nt
    JOIN ${alias}.tags at ON at.id = nt.tag_id
    JOIN tags t ON t.name = at.name
  `);
  dbLog(`novel_tags merge: ${Date.now() - t3b}ms`);
  await new Promise((r) => setTimeout(r, 0));

  dbLog(`Merging authors from ${alias}...`);
  const t4 = Date.now();
  await targetDb.execAsync(
    `INSERT OR IGNORE INTO authors (name, top_novel_id, top_novel_title, top_novel_clicks) SELECT name, top_novel_id, top_novel_title, top_novel_clicks FROM ${alias}.authors`,
  );
  dbLog(`authors insert: ${Date.now() - t4}ms`);
  await new Promise((r) => setTimeout(r, 0));
  const t4b = Date.now();
  await targetDb.execAsync(`
    UPDATE authors SET
      top_novel_id = c.top_novel_id,
      top_novel_title = c.top_novel_title,
      top_novel_clicks = c.top_novel_clicks
    FROM ${alias}.authors c
    WHERE authors.name = c.name AND c.top_novel_clicks > authors.top_novel_clicks
  `);
  dbLog(`authors update: ${Date.now() - t4b}ms`);
  await new Promise((r) => setTimeout(r, 0));

  const t5 = Date.now();
  await targetDb.execAsync(`DETACH ${alias}`);
  dbLog(`DETACH: ${Date.now() - t5}ms`);
  dbLog(`Merged ${alias} into base. total=${Date.now() - t0}ms`);
}

async function loadWebSeed(database: SQLite.SQLiteDatabase): Promise<void> {
  dbLog("Loading seed data for web...");
  const decompressed = await decompressAsset(getSeedAsset());
  const sql = new TextDecoder().decode(decompressed);
  const lines = sql.split("\n");
  // seed 约 113 万行:BATCH_SIZE 500 → 2264 次 execAsync,web(wa-sqlite)下极慢像卡死;
  // 增大到 10000(约 114 批)并输出进度日志,避免"一直加载中"
  const BATCH_SIZE = 10000;
  const total = lines.length;
  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE).filter((l) => l.trim().length > 0);
    if (batch.length > 0) {
      try {
        await database.execAsync(batch.join("\n"));
      } catch (e) {
        dbLog(`Batch ${i}-${i + batch.length} failed: ${String(e)}`);
      }
    }
    if (i % (BATCH_SIZE * 10) === 0) {
      dbLog(`seed 加载进度: ${Math.min(i + BATCH_SIZE, total)}/${total} 行`);
    }
  }
  dbLog("seed 加载完成");
}

export function initDatabase(preloadedHot?: { localUri: string | null }): Promise<SQLite.SQLiteDatabase> {
  if (currentDb) {
    return Promise.resolve(currentDb);
  }
  if (!initPromise) {
    initPromise = initDatabaseInternal(preloadedHot).finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

async function initDatabaseInternal(preloadedHot?: { localUri: string | null }): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === "web") {
    // Tauri 安卓 WebView 无 OPFS(navigator.storage.getDirectory 不存在),
    // 回退到内存数据库 + seed 加载(每次启动重新加载)
    const hasOPFS =
      typeof navigator !== "undefined" &&
      !!navigator.storage &&
      typeof (navigator.storage as any).getDirectory === "function";
    // 一个浏览器只有一个 db(OPFS),只能启动一个实例——createSyncAccessHandle 占用非 bug,无需清理重试
    // 注意:seed 版本化重载时会重新打开数据库(else 分支重新赋值),必须用 let
    let database: SQLite.SQLiteDatabase;
    try {
      database = await SQLite.openDatabaseAsync(hasOPFS ? DB_NAME : ":memory:");
    } catch (e) {
      // OPFS 不可用(如 Firefox 主线程不支持 createSyncAccessHandle)→ 回退内存库,避免初始化失败
      dbLog(`web OPFS open failed, fallback to memory db: ${String(e)}`);
      database = await SQLite.openDatabaseAsync(":memory:");
    }
    // seed 版本化:user_version 与 SEED_VERSION 不一致时清库重载,
    // 避免浏览器 OPFS 残留旧 seed(如 cover 处理更新后强制刷新数据)
    let version = 0;
    try {
      const r = await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
      version = r?.user_version ?? 0;
    } catch {}
    if (version === SEED_VERSION) {
      try {
        const count = await database.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM novels");
        if (count && count.c > 0) {
          currentDb = database;
          return database;
        }
      } catch {}
    } else {
      dbLog(`web seed 版本 ${version} != ${SEED_VERSION},重新加载 seed`);
      await database.closeAsync().catch(() => {});
      if (hasOPFS) {
        try {
          const dir = await (navigator.storage as any).getDirectory();
          await dir.removeEntry(DB_NAME).catch(() => {});
        } catch {}
      }
      try {
        database = await SQLite.openDatabaseAsync(hasOPFS ? DB_NAME : ":memory:");
      } catch {
        database = await SQLite.openDatabaseAsync(":memory:");
      }
    }
    await loadWebSeed(database);
    await database.execAsync(`PRAGMA user_version = ${SEED_VERSION}`);
    currentDb = database;
    return database;
  }

  const FS = await getFS();
  const docDir = FS.documentDirectory;
  const markerPath = `${docDir}${MERGED_MARKER}`;
  const dbDir = `${docDir}${SQLITE_SUBDIR}`;
  const hotPath = `${dbDir}/hot_chunk.sqlite`;
  dbLog(`docDir: ${docDir}`);
  dbLog(`dbDir: ${dbDir}`);
  dbLog(`hotPath: ${hotPath}`);
  dbLog(`markerPath: ${markerPath}`);

  await FS.makeDirectoryAsync(dbDir, { intermediates: true }).catch(() => {});

  const hotInfo = await FS.getInfoAsync(hotPath);
  const markerInfo = await FS.getInfoAsync(markerPath);
  dbLog(`hot exists: ${hotInfo.exists}, marker exists: ${markerInfo.exists}`);

  if (hotInfo.exists && markerInfo.exists) {
    // 快速路径:直接打开已合并的全量库。
    // 若文件损坏(如进程在上次 swap 阶段被杀),打开失败则删除并走首次启动重建
    try {
      const db = await SQLite.openDatabaseAsync("hot_chunk.sqlite");
      await db.getFirstAsync("SELECT 1");
      currentDb = db;
      isFirstInit = false;
      return db;
    } catch (e) {
      dbLog(`hot db corrupted, rebuilding: ${String(e)}`);
      await FS.deleteAsync(hotPath, { idempotent: true });
      await FS.deleteAsync(markerPath, { idempotent: true });
    }
  }

  dbLog("First launch: decompressing hot...");
  isFirstInit = true;
  const coldPath = `${dbDir}/cold_chunk.sqlite`;

  // 清理残留
  await FS.deleteAsync(hotPath, { idempotent: true });
  await FS.deleteAsync(coldPath, { idempotent: true });

  // hot 直接解压到最终路径(前台,~3s)
  const tHot0 = Date.now();
  await decompressAndWriteChunk(require("../assets/chunks/hot_chunk.sqlite.gz"), hotPath, 0, 100, preloadedHot);
  dbLog(`hot: ${Date.now() - tHot0}ms`);

  const db = await SQLite.openDatabaseAsync("hot_chunk.sqlite");
  currentDb = db;

  // cold 后台合并(不阻塞渲染)
  setInitProgress(null);
  setTimeout(() => {
    mergeColdInBackground(db, docDir, coldPath, hotPath, markerPath)
      .then(() => setInitProgress(null))
      .catch((e) => {
        dbLog(`Background cold merge failed: ${String(e)}`);
        setInitProgress(null);
      });
  }, 100);

  return db;
}

async function createIndexes(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_novels_click_num ON novels(click_num);
    CREATE INDEX IF NOT EXISTS idx_novels_genre ON novels(genre);
    CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
    CREATE INDEX IF NOT EXISTS idx_novels_ptype ON novels(ptype);
    CREATE INDEX IF NOT EXISTS idx_novels_has_banner ON novels(has_banner);
    CREATE INDEX IF NOT EXISTS idx_novel_tags_novel_id ON novel_tags(novel_id);
    CREATE INDEX IF NOT EXISTS idx_novel_tags_tag_id ON novel_tags(tag_id);
  `);
}

async function mergeColdInBackground(
  oldDb: SQLite.SQLiteDatabase,
  docDir: string,
  coldPath: string,
  hotPath: string,
  markerPath: string,
): Promise<void> {
  if (coldMergeRunning) {
    dbLog("Cold merge already running, skip.");
    return;
  }
  coldMergeRunning = true;
  try {
    const FS = await getFS();

    // 设置 busy_timeout 防止 database is locked
    await oldDb.execAsync("PRAGMA busy_timeout = 30000");

    // 清理上次失败残留
    await FS.deleteAsync(coldPath, { idempotent: true });
    const coldTmpPath = `${docDir}/cold_tmp.sqlite`;
    await FS.deleteAsync(coldTmpPath, { idempotent: true });

    // 1. 逐个解压 cold_1/2/3 并合并到 coldDb
    //    关键: coldDb 使用 coldPath, 后续 part 解压到 coldTmpPath 避免文件冲突
    const coldModules = [
      require("../assets/chunks/cold_1_chunk.sqlite.gz"),
      require("../assets/chunks/cold_2_chunk.sqlite.gz"),
      require("../assets/chunks/cold_3_chunk.sqlite.gz"),
    ];

    const tCold0 = Date.now();
    let coldDb: SQLite.SQLiteDatabase | null = null;
    for (let i = 0; i < coldModules.length; i++) {
      const tPart = Date.now();
      const targetPath = i === 0 ? coldPath : coldTmpPath;
      setInitProgress(`正在解压冷数据 ${i + 1}/3...`);
      await decompressAndWriteChunkStreaming(coldModules[i], targetPath);
      dbLog(`cold_${i + 1} decompress: ${Date.now() - tPart}ms`);

      if (i === 0) {
        // 第一个 cold part: 直接作为 coldDb
        coldDb = await SQLite.openDatabaseAsync(coldPath, { readOnly: false });
      } else {
        // 后续 cold parts: ATTACH coldTmpPath 到 coldDb 合并
        setInitProgress(`正在合并冷数据 ${i + 1}/3...`);
        await mergeChunkIntoDb(coldDb!, `cold${i + 1}`, coldTmpPath);
        await FS.deleteAsync(coldTmpPath, { idempotent: true });
      }
      await new Promise((r) => setTimeout(r, 0)); // yield
    }
    dbLog(`cold decompress+merge: ${Date.now() - tCold0}ms`);

    // 2. ATTACH hot → INSERT 热数据
    dbLog("Merging hot into cold DB...");
    const tMerge0 = Date.now();
    setInitProgress("正在合并热数据...");
    await mergeChunkIntoDb(coldDb!, "hot", hotPath);

    // 3. 建索引
    dbLog("Creating indexes...");
    setInitProgress("正在创建索引...");
    await createIndexes(coldDb!);

    // 5. 原子替换
    dbLog("Swapping cold DB into place...");
    await oldDb.closeAsync();
    await FS.deleteAsync(hotPath, { idempotent: true });
    await FS.moveAsync({ from: coldPath, to: hotPath });
    await FS.writeAsStringAsync(markerPath, "1");

    currentDb = coldDb!;
    dbLog("Full database ready with cold data.");
    emitDbReady();
    emitColdMerged();
  } finally {
    coldMergeRunning = false;
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (currentDb) return currentDb;
  return initDatabase();
}
