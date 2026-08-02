import * as SQLite from "expo-sqlite";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pako = require("pako");

let currentDb: SQLite.SQLiteDatabase | null = null;
// 初始化 promise 缓存:防止多个页面并发 getDatabase() 导致重复初始化(重复解压/合并)
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const DB_NAME = "novel_hub.sqlite";
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

function setInitProgress(p: string | null) {
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

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

async function decompressAndWriteChunk(module: number, targetPath: string): Promise<void> {
  const FS = await getFS();
  dbLog(`Decompressing ${targetPath.split("/").pop()}...`);
  const decompressed = await decompressAsset(module);
  const base64 = uint8ArrayToBase64(decompressed);
  await FS.writeAsStringAsync(targetPath, base64, {
    encoding: FS.EncodingType.Base64,
  });
  dbLog(`Written ${(decompressed.length / 1024 / 1024).toFixed(1)} MB`);
}

async function decompressAndWriteChunkStreaming(
  module: number,
  targetPath: string,
  preloaded?: Uint8Array,
): Promise<void> {
  const FS = await getFS();
  const name = targetPath.split("/").pop();
  dbLog(`Streaming decompress to ${name}...`);

  let compressed: Uint8Array;
  if (preloaded) {
    // 准备阶段已在初始化 Loading 期间完成,直接使用缓存,避免渲染后卡死交互
    compressed = preloaded;
  } else {
    setInitProgress("正在准备冷数据...");
    const assets = await Asset.loadAsync(module);
    const asset = assets[0];
    if (!asset.localUri) throw new Error("Asset not downloaded");
    const base64Data = await FS.readAsStringAsync(asset.localUri, {
      encoding: FS.EncodingType.Base64,
    });
    compressed = base64ToUint8Array(base64Data);
  }
  dbLog(`Compressed size: ${(compressed.length / 1024 / 1024).toFixed(1)} MB`);

  // 注意:pako@3 的 onData/onEnd 回调不会触发,解压结果在全部 push 完成后存于 inf.result。
  // 因此这里先分片 push(保持 JS 线程让出),最后一次性读取 result,再分块写入文件。
  const inf = new pako.Inflate({ chunkSize: 256 * 1024 });

  // 分片喂给 pako:每片之间 await 让出 JS 线程,避免一次性同步解压大文件冻结 UI
  const SLICE = 1024 * 1024; // 1MB 压缩数据/片:每片处理快,配合 100ms 让出,React 渲染窗口更频繁,列表/详情能及时渲染
  let lastReportedPct = -1;
  for (let i = 0; i < compressed.length; i += SLICE) {
    const slice = compressed.subarray(i, Math.min(i + SLICE, compressed.length));
    inf.push(slice, false);

    // 每 ~5% 更新一次进度(节流,避免频繁刷新)
    const pct = Math.floor((i / compressed.length) * 100);
    if (pct >= lastReportedPct + 5) {
      lastReportedPct = pct;
      setInitProgress(`正在解压冷数据 ${Math.min(pct, 99)}%...`);
    }

    await new Promise((r) => setTimeout(r, 100)); // 让出 ~6 帧,给 React 完整渲染窗口(列表/详情可渲染,不再只有固定 UI)
  }
  inf.push(new Uint8Array(0), true); // flush 剩余数据
  const decompressed: Uint8Array = inf.result;
  if (!decompressed || decompressed.length === 0) {
    throw new Error(`Decompress produced no output for ${name}`);
  }
  dbLog(`Decompressed ${(decompressed.length / 1024 / 1024).toFixed(1)} MB`);

  // 分块写入文件(每次 1MB),避免一次性转出超大 base64 字符串
  setInitProgress("正在写入冷数据...");
  lastReportedPct = -1;
  const WRITE_CHUNK = 2 * 1024 * 1024; // 2MB 写入分块:让出频繁,列表渲染不被饿死
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

    const pct = Math.floor((off / decompressed.length) * 100);
    if (pct >= lastReportedPct + 5) {
      lastReportedPct = pct;
      setInitProgress(`正在写入冷数据 ${pct}%...`);
    }
    await new Promise((r) => setTimeout(r, 100)); // 让出 ~6 帧,给 React 完整渲染窗口(列表/详情可渲染,不再只有固定 UI)
  }

  setInitProgress(null);
  dbLog(`Written ${(written / 1024 / 1024).toFixed(1)} MB to ${name}`);
}

async function mergeChunkIntoDb(targetDb: SQLite.SQLiteDatabase, alias: string, chunkPath: string): Promise<void> {
  const fsPath = toFsPath(chunkPath);
  dbLog(`ATTACH ${alias} -> ${fsPath}`);
  await targetDb.execAsync(`ATTACH '${fsPath}' AS ${alias}`);

  dbLog(`Merging novels from ${alias}...`);
  // 分批合并(每批 5000 行 + 让出线程),避免 24.6 万行大 INSERT 阻塞 JS 线程导致交互卡死
  const { maxId } = await targetDb.getFirstAsync<{ maxId: number }>(
    `SELECT COALESCE(MAX(id), 0) as maxId FROM ${alias}.novels`,
  );
  const BATCH = 5000;
  for (let start = 0; start <= maxId; start += BATCH) {
    await targetDb.execAsync(
      `INSERT OR REPLACE INTO novels SELECT * FROM ${alias}.novels WHERE id > ${start} AND id <= ${start + BATCH}`,
    );
    if (maxId > 0) {
      setInitProgress(`正在合并数据 ${Math.min(Math.floor((start / maxId) * 100), 99)}%...`);
    }
    await new Promise((r) => setTimeout(r, 100)); // 让出 ~6 帧,给 React 完整渲染窗口(列表/详情可渲染,不再只有固定 UI)
  }

  dbLog(`Merging contests from ${alias}...`);
  await targetDb.execAsync(`INSERT OR IGNORE INTO contests (name) SELECT name FROM ${alias}.contests`);
  await targetDb.execAsync(`
    UPDATE novels SET contest_id = (
      SELECT t.id FROM contests t JOIN ${alias}.contests a ON t.name = a.name
      WHERE a.id = novels.contest_id
    )
    WHERE contest_id IN (SELECT id FROM ${alias}.contests)
  `);

  dbLog(`Merging tags from ${alias}...`);
  await targetDb.execAsync(`INSERT OR IGNORE INTO tags (name) SELECT name FROM ${alias}.tags`);
  await targetDb.execAsync(`
    INSERT OR IGNORE INTO novel_tags (novel_id, tag_id)
    SELECT nt.novel_id, t.id
    FROM ${alias}.novel_tags nt
    JOIN ${alias}.tags at ON at.id = nt.tag_id
    JOIN tags t ON t.name = at.name
  `);

  dbLog(`Merging authors from ${alias}...`);
  await targetDb.execAsync(
    `INSERT OR IGNORE INTO authors (name, top_novel_id, top_novel_title, top_novel_clicks) SELECT name, top_novel_id, top_novel_title, top_novel_clicks FROM ${alias}.authors`,
  );
  await targetDb.execAsync(`
    UPDATE authors SET
      top_novel_id = c.top_novel_id,
      top_novel_title = c.top_novel_title,
      top_novel_clicks = c.top_novel_clicks
    FROM ${alias}.authors c
    WHERE authors.name = c.name AND c.top_novel_clicks > authors.top_novel_clicks
  `);

  await targetDb.execAsync(`DETACH ${alias}`);
  dbLog(`Merged ${alias} into base.`);
}

async function loadWebSeed(database: SQLite.SQLiteDatabase): Promise<void> {
  dbLog("Loading seed data for web...");
  const decompressed = await decompressAsset(require("../assets/seed.sql.gz"));
  const sql = new TextDecoder().decode(decompressed);
  const lines = sql.split("\n");
  const BATCH_SIZE = 500;
  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE).filter((l) => l.trim().length > 0);
    if (batch.length > 0) {
      try {
        await database.execAsync(batch.join("\n"));
      } catch (e) {
        dbLog(`Batch ${i}-${i + batch.length} failed: ${String(e)}`);
      }
    }
  }
}

export function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (currentDb) {
    return Promise.resolve(currentDb);
  }
  // 并发调用共享同一个初始化 promise,避免重复执行(重复解压 hot+warm / cold 合并)
  if (!initPromise) {
    initPromise = initDatabaseInternal().finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

async function initDatabaseInternal(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === "web") {
    // Tauri 安卓 WebView 无 OPFS(navigator.storage.getDirectory 不存在),
    // 回退到内存数据库 + seed 加载(每次启动重新加载)
    const hasOPFS =
      typeof navigator !== "undefined" &&
      !!navigator.storage &&
      typeof (navigator.storage as any).getDirectory === "function";
    const database = await SQLite.openDatabaseAsync(hasOPFS ? DB_NAME : ":memory:");
    try {
      const count = await database.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM novels");
      if (count && count.c > 0) {
        currentDb = database;
        return database;
      }
    } catch {}
    await loadWebSeed(database);
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

  dbLog("First launch: decompressing hot+warm...");
  isFirstInit = true;
  const warmPath = `${dbDir}/warm_chunk.sqlite`;
  const coldPath = `${dbDir}/cold_chunk.sqlite`;

  // 清理上次进程被杀可能残留的半成品中间文件,避免脏文件干扰重建
  await FS.deleteAsync(warmPath, { idempotent: true });
  await FS.deleteAsync(coldPath, { idempotent: true });

  // 首次初始化:通过 header 进度条展示解压进度
  setInitProgress("正在准备热数据...");

  await decompressAndWriteChunk(require("../assets/chunks/hot_chunk.sqlite.gz"), hotPath);
  await decompressAndWriteChunk(require("../assets/chunks/warm_chunk.sqlite.gz"), warmPath);

  const db = await SQLite.openDatabaseAsync("hot_chunk.sqlite");

  await mergeChunkIntoDb(db, "warm", warmPath);
  await FS.deleteAsync(warmPath, { idempotent: true });

  dbLog("Hot+warm ready. Page can render now.");
  // cold 准备阶段(加载 asset/读 base64/转 Uint8Array)在初始化 Loading 期间完成,
  // 避免渲染后无让出的 CPU 密集准备阶段卡死交互
  setInitProgress("正在准备冷数据...");
  try {
    const coldAssets = await Asset.loadAsync(require("../assets/chunks/cold_chunk.sqlite.gz"));
    const coldAsset = coldAssets[0];
    if (coldAsset.localUri) {
      const coldBase64 = await FS.readAsStringAsync(coldAsset.localUri, {
        encoding: FS.EncodingType.Base64,
      });
      coldCompressed = base64ToUint8Array(coldBase64);
    }
  } catch (e) {
    dbLog(`Cold preload failed: ${String(e)}`);
  }
  currentDb = db;
  // 热数据已就绪、页面即将渲染:清除"准备热数据"文案,避免进度条显示过时内容
  setInitProgress(null);

  // 始终执行 cold 合并(dev 与 release 一致,便于真机观测性能);
  // 渲染后延迟启动,且等首屏交互空闲(InteractionManager)再开始,
  // 避免 cold 解压抢占 JS 线程导致"页面已渲染但无法交互"的窗口。
  // 延迟 8s:让欢迎弹窗(渲染后 2s)有充足时间被用户关闭后再启动,
  // 否则 cold 合并会阻塞 JS 线程导致弹窗点击无响应。
  // cold 合并已分批让出线程,不再阻塞 JS 线程;
  // 缩短延迟(1.5s)尽快启动,避免浪费等待时间(InteractionManager 已弃用且可能迟迟不触发)
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
  // 防并发:自动触发与手动触发不能同时合并(hotwarm 只能被一个进程 ATTACH)
  if (coldMergeRunning) {
    dbLog("Cold merge already running, skip.");
    return;
  }
  coldMergeRunning = true;
  try {
    const FS = await getFS();

    // 清理上次失败可能残留的损坏/半成品文件,从干净状态重新解压,避免 malformed
    await FS.deleteAsync(coldPath, { idempotent: true });

    await decompressAndWriteChunkStreaming(
      require("../assets/chunks/cold_chunk.sqlite.gz"),
      coldPath,
      coldCompressed ?? undefined,
    );

    dbLog("Opening cold DB and merging hot+warm into it...");
    setInitProgress("正在合并数据库...");
    const coldDb = await SQLite.openDatabaseAsync(coldPath, { readOnly: false });

    await mergeChunkIntoDb(coldDb, "hotwarm", hotPath);

    dbLog("Creating indexes on merged DB...");
    setInitProgress("正在创建索引...");
    await createIndexes(coldDb);

    dbLog("Swapping cold DB into place...");
    await oldDb.closeAsync();
    await FS.deleteAsync(hotPath, { idempotent: true });
    await FS.moveAsync({ from: coldPath, to: hotPath });
    await FS.writeAsStringAsync(markerPath, "1");

    currentDb = coldDb;
    dbLog("Full database ready with cold data.");
    // 全量库就位,通知订阅者刷新数据(如首页 nav 统计)
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
