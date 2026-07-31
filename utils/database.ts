import * as SQLite from "expo-sqlite";
import { Asset } from "expo-asset";
import { Platform } from "react-native";
import pako from "pako";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const DB_NAME = "novel_hub.sqlite";
const MERGED_MARKER = ".db_merged_v2";

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

async function decompressGzip(data: Uint8Array): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const ds = new DecompressionStream("gzip");
    const writer = ds.writable.getWriter();
    writer.write(data.buffer as ArrayBuffer);
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

  return pako.inflate(data);
}

async function decompressAsset(module: number): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const assets = await Asset.loadAsync(module);
    const asset = assets[0];
    if (!asset.uri) throw new Error("Asset not loaded");

    const response = await fetch(asset.uri);
    const buf = await response.arrayBuffer();
    return decompressGzip(new Uint8Array(buf));
  }

  const FS = await getFS();
  const assets = await Asset.loadAsync(module);
  const asset = assets[0];
  if (!asset.localUri) throw new Error("Asset not downloaded");

  const base64 = await FS.readAsStringAsync(asset.localUri, {
    encoding: FS.EncodingType.Base64,
  });

  return decompressGzip(base64ToUint8Array(base64));
}

async function decompressAndWriteChunk(
  module: number,
  targetPath: string
): Promise<void> {
  const FS = await getFS();
  console.log(`Decompressing chunk to ${targetPath.split("/").pop()}...`);
  const decompressed = await decompressAsset(module);
  const base64 = uint8ArrayToBase64(decompressed);
  await FS.writeAsStringAsync(targetPath, base64, {
    encoding: FS.EncodingType.Base64,
  });
  console.log(`Written ${(decompressed.length / 1024 / 1024).toFixed(1)} MB`);
}

async function mergeNativeChunks(docDir: string): Promise<void> {
  const FS = await getFS();

  const coldPath = `${docDir}cold_chunk.sqlite`;
  const warmPath = `${docDir}warm_chunk.sqlite`;
  const hotPath = `${docDir}hot_chunk.sqlite`;
  const dbPath = `${docDir}${DB_NAME}`;

  // Decompress all 3 chunks
  await decompressAndWriteChunk(
    require("../assets/chunks/cold_chunk.sqlite.gz"),
    coldPath
  );
  await decompressAndWriteChunk(
    require("../assets/chunks/warm_chunk.sqlite.gz"),
    warmPath
  );
  await decompressAndWriteChunk(
    require("../assets/chunks/hot_chunk.sqlite.gz"),
    hotPath
  );

  // Open cold as the base database and merge warm+hot into it
  console.log("Merging chunks...");
  const coldDb = await SQLite.openDatabaseAsync("cold_chunk.sqlite");

  // ATTACH warm and hot chunks
  await coldDb.execAsync(`ATTACH '${warmPath}' AS warm`);
  await coldDb.execAsync(`ATTACH '${hotPath}' AS hot`);

  await coldDb.execAsync("BEGIN");

  // Merge novels (INSERT OR REPLACE gives hot > warm > cold priority)
  await coldDb.execAsync("INSERT OR REPLACE INTO novels SELECT * FROM warm.novels");
  await coldDb.execAsync("INSERT OR REPLACE INTO novels SELECT * FROM hot.novels");

  // Merge contests (name-based dedup)
  const contestRows = await coldDb.getAllAsync<{ name: string; id: number }>(
    "SELECT name, id FROM contests"
  );
  const contestMap: Record<string, number> = Object.fromEntries(
    contestRows.map((r) => [r.name, r.id])
  );

  for (const alias of ["warm", "hot"]) {
    const chunkContests = await coldDb.getAllAsync<{ id: number; name: string }>(
      `SELECT id, name FROM ${alias}.contests`
    );
    const oldToNew: Record<number, number> = {};

    for (const row of chunkContests) {
      if (contestMap[row.name]) {
        oldToNew[row.id] = contestMap[row.name];
      } else {
        await coldDb.execAsync(
          `INSERT OR IGNORE INTO contests (name) VALUES ('${row.name.replace(/'/g, "''")}')`
        );
        const r = await coldDb.getFirstAsync<{ id: number }>(
          `SELECT id FROM contests WHERE name = '${row.name.replace(/'/g, "''")}'`
        );
        if (r) {
          contestMap[row.name] = r.id;
          oldToNew[row.id] = r.id;
        }
      }
    }

    for (const [oldId, newId] of Object.entries(oldToNew)) {
      if (+oldId !== newId) {
        await coldDb.execAsync(
          `UPDATE novels SET contest_id = ${newId} WHERE contest_id = ${+oldId} AND id IN (SELECT id FROM ${alias}.novels)`
        );
      }
    }
  }

  // Merge tags (name-based dedup)
  const tagRows = await coldDb.getAllAsync<{ name: string; id: number }>(
    "SELECT name, id FROM tags"
  );
  const tagMap: Record<string, number> = Object.fromEntries(
    tagRows.map((r) => [r.name, r.id])
  );

  for (const alias of ["warm", "hot"]) {
    const chunkTags = await coldDb.getAllAsync<{ id: number; name: string }>(
      `SELECT id, name FROM ${alias}.tags`
    );
    const oldToNew: Record<number, number> = {};

    for (const row of chunkTags) {
      if (tagMap[row.name]) {
        oldToNew[row.id] = tagMap[row.name];
      } else {
        await coldDb.execAsync(
          `INSERT OR IGNORE INTO tags (name) VALUES ('${row.name.replace(/'/g, "''")}')`
        );
        const r = await coldDb.getFirstAsync<{ id: number }>(
          `SELECT id FROM tags WHERE name = '${row.name.replace(/'/g, "''")}'`
        );
        if (r) {
          tagMap[row.name] = r.id;
          oldToNew[row.id] = r.id;
        }
      }
    }

    const chunkNovelTags = await coldDb.getAllAsync<{
      novel_id: number;
      tag_id: number;
    }>(`SELECT novel_id, tag_id FROM ${alias}.novel_tags`);
    for (const row of chunkNovelTags) {
      const newTagId = oldToNew[row.tag_id];
      if (newTagId) {
        await coldDb.execAsync(
          `INSERT OR IGNORE INTO novel_tags (novel_id, tag_id) VALUES (${row.novel_id}, ${newTagId})`
        );
      }
    }
  }

  // Merge authors
  await coldDb.execAsync(`
    UPDATE authors SET
      top_novel_id = w.top_novel_id,
      top_novel_title = w.top_novel_title,
      top_novel_clicks = w.top_novel_clicks
    FROM warm.authors w
    WHERE authors.name = w.name AND w.top_novel_clicks > authors.top_novel_clicks
  `);
  await coldDb.execAsync(`
    UPDATE authors SET
      top_novel_id = h.top_novel_id,
      top_novel_title = h.top_novel_title,
      top_novel_clicks = h.top_novel_clicks
    FROM hot.authors h
    WHERE authors.name = h.name AND h.top_novel_clicks > authors.top_novel_clicks
  `);
  await coldDb.execAsync(
    "INSERT OR IGNORE INTO authors (name, top_novel_id, top_novel_title, top_novel_clicks) SELECT name, top_novel_id, top_novel_title, top_novel_clicks FROM warm.authors"
  );
  await coldDb.execAsync(
    "INSERT OR IGNORE INTO authors (name, top_novel_id, top_novel_title, top_novel_clicks) SELECT name, top_novel_id, top_novel_title, top_novel_clicks FROM hot.authors"
  );

  await coldDb.execAsync("COMMIT");
  await coldDb.execAsync("DETACH warm");
  await coldDb.execAsync("DETACH hot");

  // Create indexes
  await coldDb.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_novels_click_num ON novels(click_num);
    CREATE INDEX IF NOT EXISTS idx_novels_genre ON novels(genre);
    CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
    CREATE INDEX IF NOT EXISTS idx_novels_ptype ON novels(ptype);
    CREATE INDEX IF NOT EXISTS idx_novels_has_banner ON novels(has_banner);
    CREATE INDEX IF NOT EXISTS idx_novel_tags_novel_id ON novel_tags(novel_id);
    CREATE INDEX IF NOT EXISTS idx_novel_tags_tag_id ON novel_tags(tag_id);
  `);

  // Close and rename to final name
  await coldDb.closeAsync();

  // Use the cold_chunk.sqlite as the final database
  await FS.moveAsync({ from: coldPath, to: dbPath });

  // Cleanup temp chunks
  await FS.deleteAsync(warmPath, { idempotent: true });
  await FS.deleteAsync(hotPath, { idempotent: true });

  console.log("Merge complete!");
}

async function loadWebSeed(database: SQLite.SQLiteDatabase): Promise<void> {
  console.log("Loading seed data for web...");
  const decompressed = await decompressAsset(require("../assets/seed.sql.gz"));
  const sql = new TextDecoder().decode(decompressed);

  const lines = sql.split("\n");
  const BATCH_SIZE = 500;

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE).filter((l) => l.trim().length > 0);
    if (batch.length > 0) {
      const stmt = batch.join("\n");
      try {
        await database.execAsync(stmt);
      } catch (e) {
        console.warn(`Batch ${i}-${i + batch.length} failed:`, e);
      }
    }
  }
}

export function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabaseInternal();
  }
  return dbPromise;
}

async function initDatabaseInternal(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === "web") {
    const database = await SQLite.openDatabaseAsync(DB_NAME);

    try {
      const count = await database.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM novels");
      if (count && count.c > 0) return database;
    } catch {
      // Table doesn't exist yet, need to seed
    }

    await loadWebSeed(database);
    return database;
  }

  const FS = await getFS();
  const docDir = FS.documentDirectory;
  const dbPath = `${docDir}${DB_NAME}`;
  const markerPath = `${docDir}${MERGED_MARKER}`;

  const dbInfo = await FS.getInfoAsync(dbPath);
  const markerInfo = await FS.getInfoAsync(markerPath);

  if (dbInfo.exists && markerInfo.exists) {
    return await SQLite.openDatabaseAsync(DB_NAME);
  }

  console.log("First launch: decompressing and merging 3 chunks...");
  await mergeNativeChunks(docDir);

  await FS.writeAsStringAsync(markerPath, "1");

  return await SQLite.openDatabaseAsync(DB_NAME);
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  return initDatabase();
}
