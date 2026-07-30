const Database = require("better-sqlite3");
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DB_DIR = path.join(ROOT, "db-never-edit-or-delete-this-folder");
const CHUNKS = path.join(ROOT, "assets", "chunks");

// Decompress chunks to temp files (read from db source dir)
for (const name of ["cold", "warm", "hot"]) {
  const gz = fs.readFileSync(path.join(DB_DIR, `${name}_chunk.sqlite.gz`));
  const buf = zlib.gunzipSync(gz);
  fs.writeFileSync(path.join(ROOT, `${name}_tmp.sqlite`), buf);
  console.log(`${name}: ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
}

const db = new Database(path.join(ROOT, "cold_tmp.sqlite"));
db.pragma("journal_mode = WAL");

const warmPath = path.join(ROOT, "warm_tmp.sqlite").replace(/\\/g, "/");
const hotPath = path.join(ROOT, "hot_tmp.sqlite").replace(/\\/g, "/");

db.exec(`ATTACH '${warmPath}' AS warm`);
db.exec(`ATTACH '${hotPath}' AS hot`);

db.exec("BEGIN");

// Merge novels
db.exec("INSERT OR REPLACE INTO novels SELECT * FROM warm.novels");
db.exec("INSERT OR REPLACE INTO novels SELECT * FROM hot.novels");

// Merge contests (name-based dedup)
const contestRows = db.prepare("SELECT name, id FROM contests").all();
const contestMap = Object.fromEntries(contestRows.map((r) => [r.name, r.id]));

for (const alias of ["warm", "hot"]) {
  const chunkContests = db.prepare(`SELECT id, name FROM ${alias}.contests`).all();
  const oldToNew = {};

  for (const row of chunkContests) {
    if (contestMap[row.name]) {
      oldToNew[row.id] = contestMap[row.name];
    } else {
      db.prepare("INSERT OR IGNORE INTO contests (name) VALUES (?)").run(row.name);
      const r = db.prepare("SELECT id FROM contests WHERE name = ?").get(row.name);
      contestMap[row.name] = r.id;
      oldToNew[row.id] = r.id;
    }
  }

  for (const [oldId, newId] of Object.entries(oldToNew)) {
    if (+oldId !== newId) {
      db.exec(
        `UPDATE novels SET contest_id = ${newId} WHERE contest_id = ${+oldId} AND id IN (SELECT id FROM ${alias}.novels)`
      );
    }
  }
}

// Merge tags (name-based dedup)
const tagRows = db.prepare("SELECT name, id FROM tags").all();
const tagMap = Object.fromEntries(tagRows.map((r) => [r.name, r.id]));

for (const alias of ["warm", "hot"]) {
  const chunkTags = db.prepare(`SELECT id, name FROM ${alias}.tags`).all();
  const oldToNew = {};

  for (const row of chunkTags) {
    if (tagMap[row.name]) {
      oldToNew[row.id] = tagMap[row.name];
    } else {
      db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(row.name);
      const r = db.prepare("SELECT id FROM tags WHERE name = ?").get(row.name);
      tagMap[row.name] = r.id;
      oldToNew[row.id] = r.id;
    }
  }

  const chunkNovelTags = db.prepare(`SELECT novel_id, tag_id FROM ${alias}.novel_tags`).all();
  for (const row of chunkNovelTags) {
    const newTagId = oldToNew[row.tag_id];
    if (newTagId) {
      db.prepare("INSERT OR IGNORE INTO novel_tags (novel_id, tag_id) VALUES (?, ?)").run(
        row.novel_id,
        newTagId
      );
    }
  }
}

// Merge authors
db.exec(`
  UPDATE authors SET
    top_novel_id = w.top_novel_id,
    top_novel_title = w.top_novel_title,
    top_novel_clicks = w.top_novel_clicks
  FROM warm.authors w
  WHERE authors.name = w.name AND w.top_novel_clicks > authors.top_novel_clicks
`);
db.exec(`
  UPDATE authors SET
    top_novel_id = h.top_novel_id,
    top_novel_title = h.top_novel_title,
    top_novel_clicks = h.top_novel_clicks
  FROM hot.authors h
  WHERE authors.name = h.name AND h.top_novel_clicks > authors.top_novel_clicks
`);
db.exec("INSERT OR IGNORE INTO authors (name, top_novel_id, top_novel_title, top_novel_clicks) SELECT name, top_novel_id, top_novel_title, top_novel_clicks FROM warm.authors");
db.exec("INSERT OR IGNORE INTO authors (name, top_novel_id, top_novel_title, top_novel_clicks) SELECT name, top_novel_id, top_novel_title, top_novel_clicks FROM hot.authors");

db.exec("COMMIT");
db.exec("DETACH warm");
db.exec("DETACH hot");

// Stats
const stats = {
  novels: db.prepare("SELECT COUNT(*) as c FROM novels").get().c,
  authors: db.prepare("SELECT COUNT(*) as c FROM authors").get().c,
  tags: db.prepare("SELECT COUNT(*) as c FROM tags").get().c,
  contests: db.prepare("SELECT COUNT(*) as c FROM contests").get().c,
};
console.log("Stats:", stats);

// Export SQL dump for web (before closing db)
console.log("Generating SQL dump...");
let sql = "";
sql += "PRAGMA journal_mode=OFF;\n";
sql += "PRAGMA synchronous=OFF;\n";

// Schema
sql += `CREATE TABLE IF NOT EXISTS novels (id INTEGER PRIMARY KEY, title TEXT NOT NULL, author TEXT, genre INTEGER DEFAULT 1, status INTEGER DEFAULT 1, ptype INTEGER DEFAULT 1, contest_id INTEGER, has_banner INTEGER DEFAULT 0, word_num INTEGER, click_num INTEGER, praise_num INTEGER, like_num INTEGER, comment_num INTEGER, review_num INTEGER, cover TEXT, last_update TEXT);\n`;
sql += `CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, top_novel_id INTEGER, top_novel_title TEXT, top_novel_clicks INTEGER DEFAULT 0);\n`;
sql += `CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);\n`;
sql += `CREATE TABLE IF NOT EXISTS contests (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);\n`;
sql += `CREATE TABLE IF NOT EXISTS novel_tags (novel_id INTEGER, tag_id INTEGER, PRIMARY KEY (novel_id, tag_id));\n`;

const allNovels = db.prepare("SELECT * FROM novels").all();
const allAuthors = db.prepare("SELECT * FROM authors").all();
const allTags = db.prepare("SELECT * FROM tags").all();
const allContests = db.prepare("SELECT * FROM contests").all();
const allNovelTags = db.prepare("SELECT * FROM novel_tags").all();

const esc = (s) => s == null ? "NULL" : "'" + String(s).replace(/'/g, "''") + "'";
const escN = (n) => n == null ? "NULL" : String(n);

// Batch inserts
sql += "BEGIN;\n";
for (const r of allNovels) {
  sql += `INSERT INTO novels VALUES(${escN(r.id)},${esc(r.title)},${esc(r.author)},${escN(r.genre)},${escN(r.status)},${escN(r.ptype)},${escN(r.contest_id)},${escN(r.has_banner)},${escN(r.word_num)},${escN(r.click_num)},${escN(r.praise_num)},${escN(r.like_num)},${escN(r.comment_num)},${escN(r.review_num)},${esc(r.cover)},${esc(r.last_update)});\n`;
}
for (const r of allContests) {
  sql += `INSERT INTO contests VALUES(${escN(r.id)},${esc(r.name)});\n`;
}
for (const r of allTags) {
  sql += `INSERT INTO tags VALUES(${escN(r.id)},${esc(r.name)});\n`;
}
for (const r of allNovelTags) {
  sql += `INSERT INTO novel_tags VALUES(${escN(r.novel_id)},${escN(r.tag_id)});\n`;
}
for (const r of allAuthors) {
  sql += `INSERT INTO authors VALUES(${escN(r.id)},${esc(r.name)},${escN(r.top_novel_id)},${esc(r.top_novel_title)},${escN(r.top_novel_clicks)});\n`;
}
sql += "COMMIT;\n";
sql += "PRAGMA journal_mode=DELETE;\n";

const sqlGz = zlib.gzipSync(Buffer.from(sql, "utf-8"));
fs.writeFileSync(path.join(CHUNKS, "seed.sql.gz"), sqlGz);
console.log("seed.sql.gz:", (sqlGz.length / 1024 / 1024).toFixed(1), "MB");

// Save merged db - close first so file is flushed
db.close();

// The cold_tmp.sqlite IS the merged db now
const mergedBuf = fs.readFileSync(path.join(ROOT, "cold_tmp.sqlite"));
const gzipped = zlib.gzipSync(mergedBuf);
fs.writeFileSync(path.join(ROOT, "db-never-edit-or-delete-this-folder", "merged.sqlite.gz"), gzipped);
console.log("merged.sqlite.gz:", (gzipped.length / 1024 / 1024).toFixed(1), "MB");

// Cleanup temp files
fs.unlinkSync(path.join(ROOT, "cold_tmp.sqlite"));
fs.unlinkSync(path.join(ROOT, "warm_tmp.sqlite"));
fs.unlinkSync(path.join(ROOT, "hot_tmp.sqlite"));

console.log("Done!");
