const Database = require("better-sqlite3");
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CHUNKS = path.join(ROOT, "assets", "chunks");

// Decompress merged db
const gz = fs.readFileSync(path.join(CHUNKS, "merged.sqlite.gz"));
const buf = zlib.gunzipSync(gz);
fs.writeFileSync(path.join(ROOT, "merged_tmp.sqlite"), buf);
console.log("Decompressed:", (buf.length / 1024 / 1024).toFixed(1), "MB");

const db = new Database(path.join(ROOT, "merged_tmp.sqlite"));

const stats = {
  novels: db.prepare("SELECT COUNT(*) as c FROM novels").get().c,
  authors: db.prepare("SELECT COUNT(*) as c FROM authors").get().c,
  tags: db.prepare("SELECT COUNT(*) as c FROM tags").get().c,
  contests: db.prepare("SELECT COUNT(*) as c FROM contests").get().c,
};
console.log("Stats:", stats);

// Generate SQL dump
console.log("Generating SQL dump...");
let sql = "";
sql += "PRAGMA journal_mode=OFF;\n";
sql += "PRAGMA synchronous=OFF;\n";
sql += "BEGIN;\n";

const esc = (s) => (s == null ? "NULL" : "'" + String(s).replace(/'/g, "''") + "'");
const escN = (n) => (n == null ? "NULL" : String(n));

// Schema
sql += `CREATE TABLE IF NOT EXISTS novels (id INTEGER PRIMARY KEY, title TEXT NOT NULL, author TEXT, genre INTEGER DEFAULT 1, status INTEGER DEFAULT 1, ptype INTEGER DEFAULT 1, contest_id INTEGER, has_banner INTEGER DEFAULT 0, word_num INTEGER, click_num INTEGER, praise_num INTEGER, like_num INTEGER, comment_num INTEGER, review_num INTEGER, cover TEXT, last_update TEXT);\n`;
sql += `CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, top_novel_id INTEGER, top_novel_title TEXT, top_novel_clicks INTEGER DEFAULT 0);\n`;
sql += `CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);\n`;
sql += `CREATE TABLE IF NOT EXISTS contests (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);\n`;
sql += `CREATE TABLE IF NOT EXISTS novel_tags (novel_id INTEGER, tag_id INTEGER, PRIMARY KEY (novel_id, tag_id));\n`;
sql += `CREATE INDEX IF NOT EXISTS idx_novels_click_num ON novels(click_num);\n`;
sql += `CREATE INDEX IF NOT EXISTS idx_novels_genre ON novels(genre);\n`;
sql += `CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);\n`;
sql += `CREATE INDEX IF NOT EXISTS idx_novels_ptype ON novels(ptype);\n`;
sql += `CREATE INDEX IF NOT EXISTS idx_novels_has_banner ON novels(has_banner);\n`;
sql += `CREATE INDEX IF NOT EXISTS idx_novel_tags_novel_id ON novel_tags(novel_id);\n`;
sql += `CREATE INDEX IF NOT EXISTS idx_novel_tags_tag_id ON novel_tags(tag_id);\n`;

const allContests = db.prepare("SELECT * FROM contests").all();
const allTags = db.prepare("SELECT * FROM tags").all();
const allNovels = db.prepare("SELECT * FROM novels").all();
const allNovelTags = db.prepare("SELECT * FROM novel_tags").all();
const allAuthors = db.prepare("SELECT * FROM authors").all();

for (const r of allContests) {
  sql += `INSERT INTO contests VALUES(${escN(r.id)},${esc(r.name)});\n`;
}
for (const r of allTags) {
  sql += `INSERT INTO tags VALUES(${escN(r.id)},${esc(r.name)});\n`;
}
for (const r of allNovels) {
  sql += `INSERT INTO novels VALUES(${escN(r.id)},${esc(r.title)},${esc(r.author)},${escN(r.genre)},${escN(r.status)},${escN(r.ptype)},${escN(r.contest_id)},${escN(r.has_banner)},${escN(r.word_num)},${escN(r.click_num)},${escN(r.praise_num)},${escN(r.like_num)},${escN(r.comment_num)},${escN(r.review_num)},${esc(r.cover)},${esc(r.last_update)});\n`;
}
for (const r of allNovelTags) {
  sql += `INSERT INTO novel_tags VALUES(${escN(r.novel_id)},${escN(r.tag_id)});\n`;
}
for (const r of allAuthors) {
  sql += `INSERT INTO authors VALUES(${escN(r.id)},${esc(r.name)},${escN(r.top_novel_id)},${esc(r.top_novel_title)},${escN(r.top_novel_clicks)});\n`;
}

sql += "COMMIT;\n";

const sqlGz = zlib.gzipSync(Buffer.from(sql, "utf-8"));
fs.writeFileSync(path.join(ROOT, "assets", "seed.sql.gz"), sqlGz);
console.log("seed.sql.gz:", (sqlGz.length / 1024 / 1024).toFixed(1), "MB");

db.close();
fs.unlinkSync(path.join(ROOT, "merged_tmp.sqlite"));
console.log("Done!");
